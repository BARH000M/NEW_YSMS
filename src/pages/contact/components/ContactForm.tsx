import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import { inputClass, labelClass } from '@/components/feature/formStyles';

const FORM_URL = 'https://readdy.ai/api/form/dbgvcgo03l94aq7vdtn0';

export default function ContactForm() {
  const { t } = useTranslation();
  const [messageLength, setMessageLength] = useState(0);

  const { status, formError, successText, submit } = useFormSubmit(FORM_URL, {
    successMessage: t('form.successContact'),
    networkError: t('form.errorNetwork'),
    genericError: t('form.errorGeneric'),
    lengthError: t('form.errorLength'),
    onSuccess: () => setMessageLength(0),
  });

  return (
    <form
      id="contact-form"
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

      <h2 className="font-heading text-xl md:text-2xl">{t('contact.form.title')}</h2>
      <p className="text-xs text-foreground-500 mt-2">{t('contact.form.subtitle')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <div className="min-w-0">
          <label className={labelClass} htmlFor="ct-name">{t('form.fullName')} *</label>
          <input id="ct-name" name="name" required className={`${inputClass} mt-1`} placeholder="Ahmed Al-Hamdani" />
        </div>
        <div className="min-w-0">
          <label className={labelClass} htmlFor="ct-email">{t('form.email')} *</label>
          <input id="ct-email" type="email" name="email" required className={`${inputClass} mt-1`} placeholder="you@example.com" dir="ltr" />
        </div>
        <div className="min-w-0">
          <label className={labelClass} htmlFor="ct-phone">{t('form.phone')} <span className="font-normal text-foreground-400">({t('form.optional')})</span></label>
          <input id="ct-phone" name="phone" className={`${inputClass} mt-1`} placeholder="+967 7XX XXX XXX" dir="ltr" />
        </div>
        <div className="min-w-0">
          <label className={labelClass} htmlFor="ct-subject">{t('form.subject')} *</label>
          <input id="ct-subject" name="subject" required className={`${inputClass} mt-1`} placeholder={t('contact.form.subjectPlaceholder')} />
        </div>
        <div className="min-w-0 sm:col-span-2">
          <label className={labelClass} htmlFor="ct-message">{t('form.message')} *</label>
          <textarea
            id="ct-message"
            name="message"
            rows={6}
            required
            maxLength={500}
            onChange={(event) => setMessageLength(event.target.value.length)}
            className={`${inputClass} mt-1 resize-none`}
            placeholder={t('form.messagePlaceholder')}
          />
          <div className="text-end text-xs text-foreground-500 mt-1">{messageLength}/500 {t('form.characters')}</div>
        </div>
      </div>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full box-border bg-primary-500 hover:bg-primary-600 text-background-50 font-semibold text-sm py-3 rounded-md whitespace-nowrap cursor-pointer disabled:opacity-60 mt-2"
      >
        {status === 'sending' ? t('action.sending') : t('action.send')}
      </button>

      {status === 'success' && (
        <p className="text-sm text-secondary-700 mt-3">
          <span className="w-4 h-4 inline-flex items-center justify-center me-1"><i className="ri-checkbox-circle-line" /></span>
          {successText || t('form.successContact')}
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