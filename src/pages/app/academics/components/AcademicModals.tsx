import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import { createClass, createSection, createSubject, assignSubject } from '@/api/campus';
import type { SchoolClass, Section, Staff, Subject } from '@/api/types';

function Actions({
  busy,
  onCancel,
  onSave,
  label,
}: {
  busy: boolean;
  onCancel: () => void;
  onSave: () => void;
  label: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-end gap-2 pt-1">
      <button
        type="button"
        onClick={onCancel}
        className="px-3.5 py-2.5 rounded-md border border-background-300 text-xs font-semibold text-foreground-700 whitespace-nowrap cursor-pointer"
      >
        {t('app.common.cancel')}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onSave}
        className="px-4 py-2.5 rounded-md bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold whitespace-nowrap cursor-pointer"
      >
        {busy ? t('app.common.saving') : label}
      </button>
    </div>
  );
}

export function ClassModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [capacity, setCapacity] = useState('40');
  const [sections, setSections] = useState('A, B');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) {
      setError(t('app.acad.nameRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createClass({
        name,
        level: level ? Number(level) : null,
        capacity: Number(capacity) || 40,
        sectionNames: sections.split(',').map((value) => value.trim()),
      });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.acad.addClass')} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="cls-name">
            {t('app.acad.className')}
          </label>
          <input
            id="cls-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
            placeholder={t('app.acad.classPlaceholder')}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="cls-level">
              {t('app.acad.level')}
            </label>
            <input
              id="cls-level"
              type="number"
              min={1}
              dir="ltr"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="cls-capacity">
              {t('app.acad.capacity')}
            </label>
            <input
              id="cls-capacity"
              type="number"
              min={1}
              dir="ltr"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="cls-sections">
            {t('app.acad.sectionsAtOnce')}
          </label>
          <input
            id="cls-sections"
            type="text"
            dir="ltr"
            value={sections}
            onChange={(event) => setSections(event.target.value)}
            className={inputClass}
            placeholder="A, B, C"
          />
          <p className="text-[11px] text-foreground-500">{t('app.acad.sectionsHint')}</p>
        </div>
        {error && (
          <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        <Actions busy={busy} onCancel={onClose} onSave={() => void submit()} label={t('app.acad.saveClass')} />
      </div>
    </Modal>
  );
}

export function SectionModal({
  classes,
  staff,
  onClose,
  onSaved,
}: {
  classes: SchoolClass[];
  staff: Staff[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [name, setName] = useState('A');
  const [room, setRoom] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || !classId) {
      setError(t('app.acad.nameRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createSection({ classId, name, room, classTeacherId: teacherId || null });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.acad.addSection')} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="sec-class">
              {t('app.acad.className')}
            </label>
            <select
              id="sec-class"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className={inputClass}
            >
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="sec-name">
              {t('app.acad.sectionName')}
            </label>
            <input
              id="sec-name"
              type="text"
              dir="ltr"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="sec-room">
              {t('app.acad.room')}
            </label>
            <input
              id="sec-room"
              type="text"
              dir="ltr"
              value={room}
              onChange={(event) => setRoom(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="sec-teacher">
              {t('app.acad.classTeacher')}
            </label>
            <select
              id="sec-teacher"
              value={teacherId}
              onChange={(event) => setTeacherId(event.target.value)}
              className={inputClass}
            >
              <option value="">{t('app.acad.noTeacher')}</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && (
          <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        <Actions busy={busy} onCancel={onClose} onSave={() => void submit()} label={t('app.acad.saveSection')} />
      </div>
    </Modal>
  );
}

export function SubjectModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [credits, setCredits] = useState('3');
  const [type, setType] = useState<'theory' | 'practical'>('theory');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) {
      setError(t('app.acad.nameRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createSubject({
        name,
        code,
        creditHours: Number(credits) || 0,
        subjectType: type,
      });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.acad.addSubject')} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="sub-name">
            {t('app.acad.subjects')}
          </label>
          <input
            id="sub-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="sub-code">
              {t('app.acad.code')}
            </label>
            <input
              id="sub-code"
              type="text"
              dir="ltr"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className={inputClass}
              placeholder="140"
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="sub-credits">
              {t('app.acad.creditHours')}
            </label>
            <input
              id="sub-credits"
              type="number"
              min={0}
              dir="ltr"
              value={credits}
              onChange={(event) => setCredits(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="sub-type">
              {t('app.acad.subjectType')}
            </label>
            <select
              id="sub-type"
              value={type}
              onChange={(event) => setType(event.target.value as 'theory' | 'practical')}
              className={inputClass}
            >
              <option value="theory">{t('app.acad.theory')}</option>
              <option value="practical">{t('app.acad.practical')}</option>
            </select>
          </div>
        </div>
        {error && (
          <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        <Actions busy={busy} onCancel={onClose} onSave={() => void submit()} label={t('app.acad.saveSubject')} />
      </div>
    </Modal>
  );
}

export function AssignSubjectModal({
  classes,
  sections,
  subjects,
  staff,
  onClose,
  onSaved,
}: {
  classes: SchoolClass[];
  sections: Section[];
  subjects: Subject[];
  staff: Staff[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const firstSection = sections.find((item) => item.class_id === (classes[0]?.id ?? ''))?.id ?? '';
  const [sectionId, setSectionId] = useState(firstSection);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [teacherId, setTeacherId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classSections = sections.filter((item) => item.class_id === classId);

  const submit = async () => {
    if (!sectionId || !subjectId) {
      setError(t('app.acad.needSectionSubject'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await assignSubject({ sectionId, subjectId, teacherId: teacherId || null });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={t('app.acad.assignTitle')} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="asg-class">
              {t('app.acad.className')}
            </label>
            <select
              id="asg-class"
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value);
                const next = sections.find((item) => item.class_id === event.target.value);
                setSectionId(next?.id ?? '');
              }}
              className={inputClass}
            >
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="asg-section">
              {t('app.acad.sections')}
            </label>
            <select
              id="asg-section"
              value={sectionId}
              onChange={(event) => setSectionId(event.target.value)}
              className={inputClass}
            >
              {classSections.length === 0 ? <option value="">—</option> : null}
              {classSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="asg-subject">
              {t('app.acad.subjects')}
            </label>
            <select
              id="asg-subject"
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              className={inputClass}
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className={labelClass} htmlFor="asg-teacher">
              {t('app.acad.teacher')}
            </label>
            <select
              id="asg-teacher"
              value={teacherId}
              onChange={(event) => setTeacherId(event.target.value)}
              className={inputClass}
            >
              <option value="">{t('app.acad.noTeacher')}</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && (
          <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        <Actions busy={busy} onCancel={onClose} onSave={() => void submit()} label={t('app.acad.saveAssignment')} />
      </div>
    </Modal>
  );
}