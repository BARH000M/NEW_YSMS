-- =====================================================================
-- 001_foundation_forward.sql
-- Yemen SAI Academic OS — Foundation Integrity Migration
-- Additive only. No table or column is dropped. No row is deleted.
-- Rollback: 001_foundation_rollback.sql
-- Validation: 001_foundation_validation.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- PHASE B — Identity layer backfill
-- profiles is the join table between auth.users and every business
-- entity (students / staff / guardians). It was empty, so no existing
-- account had an identity record. Backfill one profile per account
-- that already holds a role. Idempotent.
-- ---------------------------------------------------------------------
INSERT INTO public.profiles (id, institution_id, full_name, is_active)
SELECT ur.user_id,
       ur.institution_id,
       'Account',
       true
FROM public.user_roles ur
WHERE ur.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ur.user_id);

-- ---------------------------------------------------------------------
-- PHASE C — Missing foreign keys
-- Added NOT VALID first, then validated in a separate statement so the
-- table is never locked for a long scan and no row is ever deleted.
-- Every audited column is currently NULL, so validation is trivially
-- clean; these constraints exist to stop future orphan writes.
-- ---------------------------------------------------------------------

-- attendance -> institutions (tenant isolation)
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_institution_id_fkey
  FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.attendance VALIDATE CONSTRAINT attendance_institution_id_fkey;

-- attendance -> profiles (who marked the register)
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_marked_by_fkey
  FOREIGN KEY (marked_by) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.attendance VALIDATE CONSTRAINT attendance_marked_by_fkey;

-- fee_installments -> institutions
ALTER TABLE public.fee_installments
  ADD CONSTRAINT fee_installments_institution_id_fkey
  FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.fee_installments VALIDATE CONSTRAINT fee_installments_institution_id_fkey;

-- fee_approvals -> institutions / profiles (maker-checker actors)
ALTER TABLE public.fee_approvals
  ADD CONSTRAINT fee_approvals_institution_id_fkey
  FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.fee_approvals VALIDATE CONSTRAINT fee_approvals_institution_id_fkey;

ALTER TABLE public.fee_approvals
  ADD CONSTRAINT fee_approvals_requested_by_fkey
  FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.fee_approvals VALIDATE CONSTRAINT fee_approvals_requested_by_fkey;

ALTER TABLE public.fee_approvals
  ADD CONSTRAINT fee_approvals_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.fee_approvals VALIDATE CONSTRAINT fee_approvals_reviewed_by_fkey;

-- invoices -> profiles (created_by)
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.invoices VALIDATE CONSTRAINT invoices_created_by_fkey;

-- payments -> profiles (cashier)
ALTER TABLE public.payments
  ADD CONSTRAINT payments_received_by_fkey
  FOREIGN KEY (received_by) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.payments VALIDATE CONSTRAINT payments_received_by_fkey;

-- admissions -> students (converted applicant)
ALTER TABLE public.admissions
  ADD CONSTRAINT admissions_converted_student_id_fkey
  FOREIGN KEY (converted_student_id) REFERENCES public.students(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.admissions VALIDATE CONSTRAINT admissions_converted_student_id_fkey;

-- ---------------------------------------------------------------------
-- PHASE B — One identity per business record
-- A profile may be attached to at most one student, one staff record
-- and one guardian record. Partial indexes keep multiple NULLs legal
-- so unlinked records stay valid.
-- ---------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS students_profile_id_key
  ON public.students (profile_id) WHERE profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS staff_profile_id_key
  ON public.staff (profile_id) WHERE profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS guardians_profile_id_key
  ON public.guardians (profile_id) WHERE profile_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- PHASE A / C — Read path indexes
-- Academic traversal (year -> term -> class -> section -> student) and
-- the hot finance / attendance / results lookups.
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_terms_year ON public.terms (academic_year_id);
CREATE INDEX IF NOT EXISTS idx_classes_year ON public.classes (academic_year_id);
CREATE INDEX IF NOT EXISTS idx_sections_class ON public.sections (class_id);
CREATE INDEX IF NOT EXISTS idx_students_section ON public.students (section_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students (status);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance (attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance (student_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_invoices_student ON public.invoices (student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_term ON public.invoices (term_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON public.exam_results (student_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_subject ON public.exam_results (exam_subject_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_guardian ON public.student_guardians (guardian_id);
CREATE INDEX IF NOT EXISTS idx_staff_profile ON public.staff (profile_id);
CREATE INDEX IF NOT EXISTS idx_guardians_profile ON public.guardians (profile_id);