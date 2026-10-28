import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import { createAdmission } from '@/api/college';
import { saveAdmissionDetails } from '@/api/campusOps';

const SOURCES = ['walk_in', 'phone', 'website', 'referral'] as const;

const sourceKey: Record<string, string> = {
  walk_in: 'app.adm.walk_in',
  phone: 'app.adm.phoneSrc',
  website: 'app.adm.website',
  referral: 'app.adm.referral',
};

const DOCUMENTS = ['birthCertificate', 'transferCertificate', 'marksheet', 'idCopy', 'photo', 'medical'] as const;

const emptySibling = { name: '', relation: 'brother', className: '' };

const initialState = {
  firstName: '',
  middleName: '',
  lastName: '',
  dob: '',
  gender: '',
  bloodGroup: '',
  nationality: '',
  motherTongue: '',
  religion: '',
  caste: '',
  category: '',
  nationalId: '',
  rte: false,
  address: '',
  city: '',
  state: '',
  postalCode: '',
  phone: '',
  email: '',
  fatherName: '',
  fatherOccupation: '',
  motherName: '',
  motherOccupation: '',
  guardianName: '',
  guardianPhone: '',
  guardianRelation: 'father',
  annualIncome: '',
  program: '',
  educationLevel: '',
  preferredSchedule: '',
  source: 'walk_in',
  prevSchoolName: '',
  prevSchoolClass: '',
  prevSchoolTcNo: '',
  prevSchoolPercentage: '',
  transportRequired: false,
  hostelRequired: false,
  medicalNotes: '',
  notes: '',
};

function Field({ label, children, span }: { label: string; children: ReactNode; span?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 min-w-0 ${span ? 'sm:col-span-2' : ''}`}>
      <span className={labelClass}>{label}</span>
      {children}
    </div>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-background-200 bg-background-100 p-3">
      <div className="mb-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground-700">{title}</p>
        {hint ? <p className="text-[10px] text-foreground-500 mt-0.5">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

export default function NewAdmissionModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialState);
  const [siblings, setSiblings] = useState([{ ...emptySibling }]);
  const [documents, setDocuments] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<typeof initialState>) => setForm((prev) => ({ ...prev, ...patch }));

  const steps = [
    t('app.adm.stepStudent'),
    t('app.adm.stepContacts'),
    t('app.adm.stepPrevious'),
    t('app.adm.stepDocs'),
  ];

  const toggleDocument = (key: string) =>
    setDocuments((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));

  const updateSibling = (index: number, patch: Partial<typeof emptySibling>) =>
    setSiblings((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (step < steps.length - 1) {
      if (step === 0 && !form.firstName.trim()) {
        setError(t('app.adm.nameRequired'));
        return;
      }
      setError(null);
      setStep(step + 1);
      return;
    }
    if (!form.firstName.trim()) {
      setError(t('app.adm.nameRequired'));
      setStep(0);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const applicantName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ').trim();
      const admissionId = await createAdmission({
        applicantName,
        phone: form.phone,
        email: form.email,
        program: form.program,
        educationLevel: form.educationLevel,
        preferredSchedule: form.preferredSchedule,
        source: form.source as 'website' | 'walk_in' | 'phone' | 'referral',
        notes: form.notes,
      });

      await saveAdmissionDetails(admissionId, {
        middle_name: form.middleName || undefined,
        dob: form.dob || null,
        gender: form.gender || undefined,
        blood_group: form.bloodGroup || undefined,
        nationality: form.nationality || undefined,
        mother_tongue: form.motherTongue || undefined,
        religion: form.religion || undefined,
        caste: form.caste || undefined,
        category: form.category || undefined,
        rte: form.rte,
        national_id: form.nationalId || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        postal_code: form.postalCode || undefined,
        father_name: form.fatherName || undefined,
        father_occupation: form.fatherOccupation || undefined,
        mother_name: form.motherName || undefined,
        mother_occupation: form.motherOccupation || undefined,
        guardian_name: form.guardianName || undefined,
        guardian_phone: form.guardianPhone || undefined,
        guardian_relation: form.guardianRelation || undefined,
        annual_income: form.annualIncome || undefined,
        prev_school_name: form.prevSchoolName || undefined,
        prev_school_class: form.prevSchoolClass || undefined,
        prev_school_tc_no: form.prevSchoolTcNo || undefined,
        prev_school_percentage: form.prevSchoolPercentage || undefined,
        transport_required: form.transportRequired,
        hostel_required: form.hostelRequired,
        siblings: siblings.filter((row) => row.name.trim()),
        documents,
        medical_notes: form.medicalNotes || undefined,
      });

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t('app.adm.formTitle')}
      subtitle={`${t('app.adm.autoRef')} · ${step + 1}/${steps.length} ${steps[step]}`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(index)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap cursor-pointer border ${
                index === step
                  ? 'bg-primary-500 border-primary-500 text-background-50'
                  : index < step
                    ? 'bg-secondary-100 border-secondary-200 text-secondary-900'
                    : 'bg-background-100 border-background-200 text-foreground-600'
              }`}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>

        {step === 0 && (
          <>
            <Group title={t('app.adm.stepStudent')}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label={t('app.adm.firstName')}>
                  <input
                    className={inputClass}
                    value={form.firstName}
                    onChange={(e) => set({ firstName: e.target.value })}
                    required
                  />
                </Field>
                <Field label={t('app.adm.middleName')}>
                  <input className={inputClass} value={form.middleName} onChange={(e) => set({ middleName: e.target.value })} />
                </Field>
                <Field label={t('app.adm.lastName')}>
                  <input className={inputClass} value={form.lastName} onChange={(e) => set({ lastName: e.target.value })} />
                </Field>
                <Field label={t('app.adm.dob')}>
                  <input className={inputClass} type="date" value={form.dob} onChange={(e) => set({ dob: e.target.value })} />
                </Field>
                <Field label={t('app.adm.gender')}>
                  <select className={inputClass} value={form.gender} onChange={(e) => set({ gender: e.target.value })}>
                    <option value="">—</option>
                    <option value="male">{t('app.status.male')}</option>
                    <option value="female">{t('app.status.female')}</option>
                  </select>
                </Field>
                <Field label={t('app.adm.bloodGroup')}>
                  <input
                    className={inputClass}
                    dir="ltr"
                    value={form.bloodGroup}
                    onChange={(e) => set({ bloodGroup: e.target.value })}
                    placeholder="O+"
                  />
                </Field>
                <Field label={t('app.adm.nationality')}>
                  <input className={inputClass} value={form.nationality} onChange={(e) => set({ nationality: e.target.value })} />
                </Field>
                <Field label={t('app.adm.motherTongue')}>
                  <input className={inputClass} value={form.motherTongue} onChange={(e) => set({ motherTongue: e.target.value })} />
                </Field>
                <Field label={t('app.adm.religion')}>
                  <input className={inputClass} value={form.religion} onChange={(e) => set({ religion: e.target.value })} />
                </Field>
                <Field label={t('app.adm.caste')}>
                  <input className={inputClass} value={form.caste} onChange={(e) => set({ caste: e.target.value })} />
                </Field>
                <Field label={t('app.adm.category')}>
                  <select className={inputClass} value={form.category} onChange={(e) => set({ category: e.target.value })}>
                    <option value="">—</option>
                    <option value="general">General</option>
                    <option value="obc">OBC</option>
                    <option value="sc">SC</option>
                    <option value="st">ST</option>
                    <option value="ews">EWS</option>
                  </select>
                </Field>
                <Field label={t('app.adm.nationalId')}>
                  <input className={inputClass} dir="ltr" value={form.nationalId} onChange={(e) => set({ nationalId: e.target.value })} />
                </Field>
              </div>
              <label className="mt-3 flex items-center gap-2 text-xs font-medium text-foreground-800 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-primary-500 cursor-pointer"
                  checked={form.rte}
                  onChange={(e) => set({ rte: e.target.checked })}
                />
                {t('app.adm.rte')}
              </label>
            </Group>
          </>
        )}

        {step === 1 && (
          <>
            <Group title={t('app.adm.stepContacts')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t('app.common.phone')}>
                  <input className={inputClass} dir="ltr" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
                </Field>
                <Field label={t('app.common.email')}>
                  <input className={inputClass} dir="ltr" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
                </Field>
                <Field label={t('app.adm.address')} span>
                  <input className={inputClass} value={form.address} onChange={(e) => set({ address: e.target.value })} />
                </Field>
                <Field label={t('app.adm.city')}>
                  <input className={inputClass} value={form.city} onChange={(e) => set({ city: e.target.value })} />
                </Field>
                <Field label={t('app.adm.state')}>
                  <input className={inputClass} value={form.state} onChange={(e) => set({ state: e.target.value })} />
                </Field>
                <Field label={t('app.adm.postalCode')}>
                  <input className={inputClass} dir="ltr" value={form.postalCode} onChange={(e) => set({ postalCode: e.target.value })} />
                </Field>
                <Field label={t('app.adm.annualIncome')}>
                  <input className={inputClass} dir="ltr" value={form.annualIncome} onChange={(e) => set({ annualIncome: e.target.value })} />
                </Field>
              </div>
            </Group>

            <Group title={t('app.adm.family')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t('app.adm.fatherName')}>
                  <input className={inputClass} value={form.fatherName} onChange={(e) => set({ fatherName: e.target.value })} />
                </Field>
                <Field label={t('app.adm.fatherOccupation')}>
                  <input className={inputClass} value={form.fatherOccupation} onChange={(e) => set({ fatherOccupation: e.target.value })} />
                </Field>
                <Field label={t('app.adm.motherName')}>
                  <input className={inputClass} value={form.motherName} onChange={(e) => set({ motherName: e.target.value })} />
                </Field>
                <Field label={t('app.adm.motherOccupation')}>
                  <input className={inputClass} value={form.motherOccupation} onChange={(e) => set({ motherOccupation: e.target.value })} />
                </Field>
                <Field label={t('app.adm.guardianName')}>
                  <input className={inputClass} value={form.guardianName} onChange={(e) => set({ guardianName: e.target.value })} />
                </Field>
                <Field label={t('app.adm.guardianPhone')}>
                  <input className={inputClass} dir="ltr" value={form.guardianPhone} onChange={(e) => set({ guardianPhone: e.target.value })} />
                </Field>
                <Field label={t('app.adm.relation')}>
                  <select className={inputClass} value={form.guardianRelation} onChange={(e) => set({ guardianRelation: e.target.value })}>
                    <option value="father">{t('app.status.father')}</option>
                    <option value="mother">{t('app.status.mother')}</option>
                    <option value="guardian">{t('app.status.guardian')}</option>
                    <option value="other">{t('app.status.other')}</option>
                  </select>
                </Field>
              </div>
            </Group>
          </>
        )}

        {step === 2 && (
          <>
            <Group title={t('app.adm.stepPrevious')} hint={t('app.adm.previousHint')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t('app.adm.prevSchool')} span>
                  <input className={inputClass} value={form.prevSchoolName} onChange={(e) => set({ prevSchoolName: e.target.value })} />
                </Field>
                <Field label={t('app.adm.prevClass')}>
                  <input className={inputClass} value={form.prevSchoolClass} onChange={(e) => set({ prevSchoolClass: e.target.value })} />
                </Field>
                <Field label={t('app.adm.prevTc')}>
                  <input className={inputClass} dir="ltr" value={form.prevSchoolTcNo} onChange={(e) => set({ prevSchoolTcNo: e.target.value })} />
                </Field>
                <Field label={t('app.adm.prevPercentage')}>
                  <input
                    className={inputClass}
                    dir="ltr"
                    value={form.prevSchoolPercentage}
                    onChange={(e) => set({ prevSchoolPercentage: e.target.value })}
                  />
                </Field>
                <Field label={t('app.adm.education')}>
                  <input className={inputClass} value={form.educationLevel} onChange={(e) => set({ educationLevel: e.target.value })} />
                </Field>
                <Field label={t('app.adm.program')}>
                  <input className={inputClass} value={form.program} onChange={(e) => set({ program: e.target.value })} />
                </Field>
                <Field label={t('app.adm.schedule')}>
                  <input className={inputClass} value={form.preferredSchedule} onChange={(e) => set({ preferredSchedule: e.target.value })} />
                </Field>
                <Field label={t('app.adm.source')}>
                  <select className={inputClass} value={form.source} onChange={(e) => set({ source: e.target.value })}>
                    {SOURCES.map((item) => (
                      <option key={item} value={item}>
                        {t(sourceKey[item])}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </Group>

            <Group title={t('app.adm.siblings')} hint={t('app.adm.siblingsHint')}>
              <div className="flex flex-col gap-2">
                {siblings.map((row, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      className={inputClass}
                      placeholder={t('app.adm.siblingName')}
                      value={row.name}
                      onChange={(e) => updateSibling(index, { name: e.target.value })}
                    />
                    <select
                      className={inputClass}
                      value={row.relation}
                      onChange={(e) => updateSibling(index, { relation: e.target.value })}
                    >
                      <option value="brother">{t('app.categories.brother')}</option>
                      <option value="sister">{t('app.categories.sister')}</option>
                    </select>
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        className={inputClass}
                        placeholder={t('app.adm.siblingClass')}
                        value={row.className}
                        onChange={(e) => updateSibling(index, { className: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setSiblings((prev) => prev.filter((_, i) => i !== index))}
                        className="w-9 h-9 shrink-0 flex items-center justify-center rounded-md border border-background-300 text-foreground-600 hover:border-primary-400 cursor-pointer"
                        aria-label={t('app.common.delete')}
                      >
                        <i className="ri-delete-bin-line" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setSiblings((prev) => [...prev, { ...emptySibling }])}
                  className="self-start inline-flex items-center gap-1.5 border border-background-300 hover:border-primary-400 text-foreground-800 text-[11px] font-semibold px-3 py-2 rounded-md whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-add-line" />
                  {t('app.adm.addSibling')}
                </button>
              </div>
            </Group>
          </>
        )}

        {step === 3 && (
          <>
            <Group title={t('app.adm.documents')} hint={t('app.adm.documentsHint')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DOCUMENTS.map((key) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 rounded-md border border-background-200 bg-background-50 px-3 py-2 text-xs text-foreground-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-primary-500 cursor-pointer"
                      checked={documents.includes(key)}
                      onChange={() => toggleDocument(key)}
                    />
                    {t(`app.adm.doc.${key}`)}
                  </label>
                ))}
              </div>
            </Group>

            <Group title={t('app.adm.facilities')}>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-xs font-medium text-foreground-800 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-primary-500 cursor-pointer"
                    checked={form.transportRequired}
                    onChange={(e) => set({ transportRequired: e.target.checked })}
                  />
                  {t('app.adm.transportRequired')}
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-foreground-800 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-primary-500 cursor-pointer"
                    checked={form.hostelRequired}
                    onChange={(e) => set({ hostelRequired: e.target.checked })}
                  />
                  {t('app.adm.hostelRequired')}
                </label>
              </div>
            </Group>

            <Field label={t('app.adm.medicalNotes')}>
              <textarea
                className={inputClass}
                rows={2}
                maxLength={300}
                value={form.medicalNotes}
                onChange={(e) => set({ medicalNotes: e.target.value })}
              />
            </Field>

            <Field label={t('app.common.notes')}>
              <textarea
                className={inputClass}
                rows={3}
                maxLength={500}
                value={form.notes}
                onChange={(e) => set({ notes: e.target.value })}
              />
            </Field>
          </>
        )}

        {error && (
          <p className="text-xs text-primary-900 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">{error}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          {step > 0 && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep(step - 1);
              }}
              className="sm:w-28 border border-background-300 text-foreground-800 text-xs font-semibold px-4 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              {t('app.common.back')}
            </button>
          )}
          <button
            type="submit"
            disabled={busy}
            className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-4 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
          >
            {busy
              ? t('app.common.saving')
              : step < steps.length - 1
                ? t('app.common.next')
                : t('app.adm.createAdmission')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="sm:w-28 border border-background-300 text-foreground-800 text-xs font-semibold px-4 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
          >
            {t('app.common.cancel')}
          </button>
        </div>
      </form>
    </Modal>
  );
}