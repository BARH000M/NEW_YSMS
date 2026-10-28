import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { programMeta } from '@/mocks/college';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import { inputClass, labelClass } from '@/components/feature/formStyles';

const FORM_URL = 'https://readdy.ai/api/form/dbgvcgo03l94aq7vdtm0';

export default function ApplicationForm() {
  const { t } = useTranslation();
  const [noteLength, setNoteLength] = useState(0);

  const { status, formError, successText, submit } = useFormSubmit(FORM_URL, {
    successMessage: t('form.successAdmission'),
    networkError: t('form.errorNetwork'),
    genericError: t('form.errorGeneric'),
    lengthError: t('form.errorLength'),
    onSuccess: () => setNoteLength(0),
  });

  return (
    <form
      id="admission-form"
      data-readdy-form
      onSubmit={submit}
      className="bg-background-50 border border-background-200 rounded-lg p-5 md:p-8"
    >
      <input
        type="text"
        name="website_alt"
        className="inq-extra-field"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        readOnly
      />

      <h2 className="font-heading text-xl md:text-2xl">{t('admission.form.title')}</h2>
      <p className="text-xs text-foreground-500 mt-2">{t('admission.form.subtitle')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <div className="min-w-0">
          <label className={labelClass} htmlFor="adm-name">{t('form.fullName')} *</label>
          <input id="adm-name" name="name" required className={`${inputClass} mt-1`} placeholder="Ahmed Al-Hamdani" />
        </div>
        <div className="min-w-0">
          <label className={labelClass} htmlFor="adm-phone">{t('form.phone')} *</label>
          <input id="adm-phone" name="phone" required className={`${inputClass} mt-1`} placeholder="+967 7XX XXX XXX" dir="ltr" />
        </div>
        <div className="min-w-0">
          <label className={labelClass} htmlFor="adm-email">{t('form.email')} <span className="font-normal text-foreground-400">({t('form.optional')})</span></label>
          <input id="adm-email" type="email" name="email" className={`${inputClass} mt-1`} placeholder="you@example.com" dir="ltr" />
        </div>
        <div className="min-w-0">
          <label className={labelClass} htmlFor="adm-program">{t('form.program')} *</label>
          <select id="adm-program" name="program" required defaultValue="" className={`${inputClass} mt-1 cursor-pointer`}>
            <option value="" disabled>{t('admission.form.selectProgram')}</option>
            {programMeta.map((program) => (
              <option key={program.id} value={t(`programs.items.${program.id}.title`)}>
                {t(`programs.items.${program.id}.title`)}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <label className={labelClass} htmlFor="adm-schedule">{t('admission.form.schedule')}</label>
          <select id="adm-schedule" name="schedule" defaultValue="morning" className={`${inputClass} mt-1 cursor-pointer`}>
            <option value="morning">{t('admission.form.morning')}</option>
            <option value="evening">{t('admission.form.evening')}</option>
            <option value="weekend">{t('admission.form.weekend')}</option>
          </select>
        </div>
        <div className="min-w-0">
          <label className={labelClass} htmlFor="adm-education">{t('admission.form.education')}</label>
          <select id="adm-education" name="education" defaultValue="highSchool" className={`${inputClass} mt-1 cursor-pointer`}>
            <option value="highSchool">{t('admission.form.highSchool')}</option>
            <option value="diploma">{t('admission.form.diploma')}</option>
            <option value="bachelor">{t('admission.form.bachelor')}</option>
          </select>
        </div>
        <div className="min-w-0 sm:col-span-2">
          <label className={labelClass} htmlFor="adm-notes">{t('admission.form.notes')}</label>
          <textarea
            id="adm-notes"
            name="message"
            rows={4}
            maxLength={500}
            onChange={(event) => setNoteLength(event.target.value.length)}
            className={`${inputClass} mt-1 resize-none`}
            placeholder={t('admission.form.notesPlaceholder')}
          />
          <div className="text-end text-xs text-foreground-500 mt-1">{noteLength}/500 {t('form.characters')}</div>
        </div>
      </div>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full box-border bg-primary-500 hover:bg-primary-600 text-background-50 font-semibold text-sm py-3 rounded-md whitespace-nowrap cursor-pointer disabled:opacity-60 mt-2"
      >
        {status === 'sending' ? t('action.sending') : t('admission.form.submit')}
      </button>

      {status === 'success' && (
        <p className="text-sm text-secondary-700 mt-3">
          <span className="w-4 h-4 inline-flex items-center justify-center me-1"><i className="ri-checkbox-circle-line" /></span>
          {successText || t('form.successAdmission')}
        </p>
      )}
      {status === 'error' && (
        <p className="text-sm text-primary-700 mt-3">
          <span className="w-4 h-4 inline-flex items-center justify-center me-1"><i className="ri-error-warning-line" /></span>
          {formError}
        </p>
      )}
    </form>
  );
}