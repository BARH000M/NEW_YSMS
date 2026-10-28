-- ============================================================================
-- Migration 002 — Rollback (exact reverse of the forward migration)
-- WARNING: this removes the enrollment history and student document metadata
-- created by migration 002. No other table is touched and no legacy table,
-- column or row is affected.
-- ============================================================================

ALTER TABLE public.enrollments DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS enrollments_guardian_read ON public.enrollments;
DROP POLICY IF EXISTS enrollments_student_read ON public.enrollments;
DROP POLICY IF EXISTS enrollments_admin_write ON public.enrollments;
DROP POLICY IF EXISTS enrollments_staff_read ON public.enrollments;
DROP INDEX IF EXISTS public.enrollments_year_section_idx;
DROP INDEX IF EXISTS public.enrollments_student_idx;
DROP TABLE IF EXISTS public.enrollments;

ALTER TABLE public.student_documents DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_documents_self_read ON public.student_documents;
DROP POLICY IF EXISTS student_documents_staff_write ON public.student_documents;
DROP POLICY IF EXISTS student_documents_staff_read ON public.student_documents;
DROP INDEX IF EXISTS public.student_documents_student_idx;
DROP TABLE IF EXISTS public.student_documents;

-- Note: files already uploaded to the private `documents` bucket are objects,
-- not rows. They are intentionally NOT deleted by this rollback. Remove the
-- students/<student_id>/ prefix in Storage settings if a full cleanup is needed.