-- =====================================================================
-- 001_foundation_rollback.sql
-- Reverts 001_foundation_forward.sql exactly.
-- Safe to run at any time: only removes constraints, indexes and the
-- placeholder profile rows the forward migration itself created.
-- No student, invoice, payment, attendance or result row is touched.
-- =====================================================================

-- 1. Drop the foreign keys added in migration 001
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_institution_id_fkey;
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_marked_by_fkey;
ALTER TABLE public.fee_installments DROP CONSTRAINT IF EXISTS fee_installments_institution_id_fkey;
ALTER TABLE public.fee_approvals DROP CONSTRAINT IF EXISTS fee_approvals_institution_id_fkey;
ALTER TABLE public.fee_approvals DROP CONSTRAINT IF EXISTS fee_approvals_requested_by_fkey;
ALTER TABLE public.fee_approvals DROP CONSTRAINT IF EXISTS fee_approvals_reviewed_by_fkey;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_created_by_fkey;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_received_by_fkey;
ALTER TABLE public.admissions DROP CONSTRAINT IF EXISTS admissions_converted_student_id_fkey;

-- 2. Drop the uniqueness guards
DROP INDEX IF EXISTS public.students_profile_id_key;
DROP INDEX IF EXISTS public.staff_profile_id_key;
DROP INDEX IF EXISTS public.guardians_profile_id_key;

-- 3. Drop the read-path indexes
DROP INDEX IF EXISTS public.idx_terms_year;
DROP INDEX IF EXISTS public.idx_classes_year;
DROP INDEX IF EXISTS public.idx_sections_class;
DROP INDEX IF EXISTS public.idx_students_section;
DROP INDEX IF EXISTS public.idx_students_status;
DROP INDEX IF EXISTS public.idx_attendance_date;
DROP INDEX IF EXISTS public.idx_attendance_student_date;
DROP INDEX IF EXISTS public.idx_invoices_student;
DROP INDEX IF EXISTS public.idx_invoices_term;
DROP INDEX IF EXISTS public.idx_payments_invoice;
DROP INDEX IF EXISTS public.idx_exam_results_student;
DROP INDEX IF EXISTS public.idx_exam_results_subject;
DROP INDEX IF EXISTS public.idx_student_guardians_guardian;
DROP INDEX IF EXISTS public.idx_staff_profile;
DROP INDEX IF EXISTS public.idx_guardians_profile;

-- 4. Remove placeholder profiles created by the forward migration.
-- Only rows that are still unattached and still carry the placeholder
-- name are removed, so real profiles created afterwards are kept.
DELETE FROM public.profiles p
WHERE p.full_name = 'Account'
  AND p.last_login_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.students s WHERE s.profile_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.staff st WHERE st.profile_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.guardians g WHERE g.profile_id = p.id);