import { useState, type FormEvent } from 'react';

export type FormStatus = 'idle' | 'sending' | 'success' | 'error';

interface FormOptions {
  successMessage: string;
  networkError: string;
  genericError: string;
  lengthError: string;
  onSuccess?: () => void;
}

interface FormResponse {
  code?: string;
  message?: string;
  meta?: { message?: string; detail?: string };
}

export function useFormSubmit(formUrl: string, options: FormOptions) {
  const [status, setStatus] = useState<FormStatus>('idle');
  const [formError, setFormError] = useState('');
  const [successText, setSuccessText] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = new FormData(formElement);

    const honeypot = String(data.get('website_alt') ?? '').trim();
    if (honeypot) {
      setSuccessText(options.successMessage);
      setStatus('success');
      return;
    }
    data.delete('website_alt');

    const message = String(data.get('message') ?? '');
    if (message.length > 500) {
      setFormError(options.lengthError);
      setStatus('error');
      return;
    }

    const payload = new URLSearchParams();
    data.forEach((value, key) => payload.append(key, String(value)));

    setStatus('sending');
    setFormError('');

    try {
      const response = await fetch(formUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload.toString(),
      });
      const responseText = await response.text();
      let parsed: FormResponse | null = null;
      try {
        parsed = JSON.parse(responseText) as FormResponse;
      } catch {
        parsed = null;
      }
      const serverMessage =
        parsed?.meta?.message || parsed?.message || parsed?.meta?.detail || responseText;
      const accepted = response.ok && parsed?.code === 'OK' && !/spam/i.test(String(serverMessage || ''));

      if (accepted) {
        setSuccessText(options.successMessage);
        setStatus('success');
        formElement.reset();
        options.onSuccess?.();
      } else {
        setFormError(String(serverMessage || options.genericError));
        setStatus('error');
      }
    } catch {
      setFormError(options.networkError);
      setStatus('error');
    }
  };

  return { status, formError, successText, submit };
}