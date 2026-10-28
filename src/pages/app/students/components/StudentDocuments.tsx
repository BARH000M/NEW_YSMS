import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import {
  deleteStudentDocument,
  fetchStudentDocuments,
  requestSignedDocumentUrls,
  setDocumentVerified,
  uploadStudentDocument,
} from '@/api/documents';
import type { StudentDocumentType } from '@/api/types';
import { formatDate } from '@/utils/date';
import { Badge, Card, EmptyState, ErrorState, LoadingBlock } from '@/components/app/ui';
import { inputClass, labelClass } from '@/components/feature/formStyles';

const TYPES: StudentDocumentType[] = [
  'birth_certificate',
  'national_id',
  'medical',
  'previous_report',
  'photo',
  'transfer',
  'other',
];

const ICONS: Record<string, string> = {
  birth_certificate: 'ri-file-user-line',
  national_id: 'ri-id-card-line',
  medical: 'ri-heart-pulse-line',
  previous_report: 'ri-file-chart-line',
  photo: 'ri-image-line',
  transfer: 'ri-arrow-left-right-line',
  other: 'ri-file-text-line',
};

export default function StudentDocuments({
  studentId,
  institutionId,
  canWrite,
}: {
  studentId: string;
  institutionId: string;
  canWrite: boolean;
}) {
  const { t, i18n } = useTranslation();
  const state = useAsync(() => fetchStudentDocuments(studentId), [studentId]);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [type, setType] = useState<StudentDocumentType>('birth_certificate');
  const [title, setTitle] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const documents = useMemo(() => state.data ?? [], [state.data]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError(t('app.docs.chooseFile'));
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await uploadStudentDocument({ studentId, institutionId, file, type, title });
      setTitle('');
      setFileName(null);
      if (fileRef.current) fileRef.current.value = '';
      setNotice(t('app.docs.uploaded'));
      state.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = async (id: string) => {
    setError(null);
    try {
      const [signed] = await requestSignedDocumentUrls([id]);
      if (!signed?.url) {
        setError(signed?.error ?? t('app.docs.noFile'));
        return;
      }
      window.open(signed.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
    }
  };

  const handleVerify = async (id: string, verified: boolean) => {
    setError(null);
    try {
      await setDocumentVerified(id, verified);
      state.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await deleteStudentDocument(id);
      setConfirmId(null);
      state.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="min-w-0">
        <h3 className="text-xs font-semibold text-foreground-900">{t('app.docs.title')}</h3>
        <p className="text-[11px] text-foreground-500 mt-0.5">{t('app.docs.subtitle')}</p>
      </div>

      {canWrite ? (
        <Card className="p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className={labelClass} htmlFor="doc-type">
                {t('app.docs.type')}
              </label>
              <select
                id="doc-type"
                value={type}
                onChange={(e) => setType(e.target.value as StudentDocumentType)}
                className={inputClass}
              >
                {TYPES.map((item) => (
                  <option key={item} value={item}>
                    {t(`app.docs.types.${item}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className={labelClass} htmlFor="doc-title">
                {t('app.docs.docTitle')}
              </label>
              <input
                id="doc-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder={t('app.docs.docTitleHint')}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
            <label
              htmlFor="doc-file"
              className="flex-1 min-w-0 inline-flex items-center gap-2 border border-dashed border-background-300 rounded-md px-3 py-2 text-[11px] text-foreground-600 cursor-pointer hover:border-primary-400"
            >
              <i className="ri-upload-cloud-2-line text-base text-foreground-500" />
              <span className="truncate">{fileName ?? t('app.docs.chooseFile')}</span>
            </label>
            <input
              ref={fileRef}
              id="doc-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => void handleUpload()}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-[11px] font-semibold px-3.5 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-upload-2-line" />
              {busy ? t('app.docs.uploading') : t('app.docs.upload')}
            </button>
          </div>
          <p className="text-[10px] text-foreground-500 mt-2">{t('app.docs.limit')}</p>
        </Card>
      ) : null}

      {notice && (
        <p className="text-xs text-secondary-900 bg-secondary-100 border border-secondary-200 rounded-md px-3 py-2">
          {notice}
        </p>
      )}
      {error && (
        <p className="text-xs text-primary-900 bg-primary-100 border border-primary-200 rounded-md px-3 py-2 break-words">
          {error}
        </p>
      )}

      {documents.length === 0 ? (
        <Card>
          <EmptyState icon="ri-folder-open-line" label={t('app.docs.empty')} />
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {documents.map((doc) => (
            <Card key={doc.id} className="p-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="w-9 h-9 rounded-md bg-background-100 text-foreground-600 flex items-center justify-center shrink-0">
                  <i className={`${ICONS[doc.type] ?? 'ri-file-text-line'} text-base`} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-foreground-950 truncate max-w-[220px]">
                      {doc.title ?? t(`app.docs.types.${doc.type}`)}
                    </p>
                    {doc.verified ? (
                      <Badge tone="secondary">{t('app.docs.verified')}</Badge>
                    ) : (
                      <Badge tone="neutral">{t('app.docs.pending')}</Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-foreground-500 mt-0.5">
                    {t(`app.docs.types.${doc.type}`)} · {formatDate(doc.created_at, i18n.language)}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleOpen(doc.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-external-link-line" />
                    {t('app.docs.open')}
                  </button>
                  {canWrite ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleVerify(doc.id, !doc.verified)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground-700 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                      >
                        <i className={doc.verified ? 'ri-close-circle-line' : 'ri-checkbox-circle-line'} />
                        {doc.verified ? t('app.docs.unverify') : t('app.docs.verify')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(doc.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-500 hover:text-primary-700 cursor-pointer"
                        aria-label={t('app.common.delete')}
                      >
                        <i className="ri-delete-bin-line" />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {confirmId === doc.id ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border border-primary-200 bg-primary-100 px-3 py-2 mt-2">
                  <p className="text-[11px] text-primary-900 flex-1">{t('app.docs.confirmDelete')}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDelete(doc.id)}
                      className="text-[11px] font-semibold text-background-50 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 px-2.5 py-1.5 rounded-md whitespace-nowrap cursor-pointer"
                    >
                      {busy ? t('app.common.saving') : t('app.common.delete')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="text-[11px] font-semibold text-foreground-700 border border-background-300 px-2.5 py-1.5 rounded-md whitespace-nowrap cursor-pointer"
                    >
                      {t('app.common.cancel')}
                    </button>
                  </div>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}