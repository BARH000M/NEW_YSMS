-- ============================================================================
-- Migration 002 — Enrollment history + student documents
-- Forward migration. Additive only: no table, column or row is dropped.
-- Rollback: 002_enrollment_documents_rollback.sql
-- Validate: 002_enrollment_documents_validation.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. enrollments — one placement per student per academic year.
--    Today students.section_id holds only the CURRENT placement, so promoting a
--    student silently destroys their prior-year position. This table keeps every
--    year's placement so a transcript can be rebuilt for any year.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  roll_no integer,
  status text NOT NULL DEFAULT 'enrolled',
  started_on date,
  ended_on date,
  final_average numeric(5, 2),
  result text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT enrollments_student_year_key UNIQUE (student_id, academic_year_id),
  CONSTRAINT enrollments_status_check CHECK (
    status IN ('enrolled', 'promoted', 'repeated', 'transferred', 'graduated', 'withdrawn')
  )
);

CREATE INDEX IF NOT EXISTS enrollments_student_idx
  ON public.enrollments (student_id, academic_year_id DESC);
CREATE INDEX IF NOT EXISTS enrollments_year_section_idx
  ON public.enrollments (academic_year_id, section_id);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Staff can read the whole history (admissions, reports and the profile screen).
DROP POLICY IF EXISTS enrollments_staff_read ON public.enrollments;
CREATE POLICY enrollments_staff_read ON public.enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active
        AND ur.role = ANY (ARRAY['super_admin', 'admin', 'teacher', 'accountant', 'receptionist'])
    )
  );

-- Only administrators may move a placement.
DROP POLICY IF EXISTS enrollments_admin_write ON public.enrollments;
CREATE POLICY enrollments_admin_write ON public.enrollments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active
        AND ur.role = ANY (ARRAY['super_admin', 'admin'])
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active
        AND ur.role = ANY (ARRAY['super_admin', 'admin'])
    )
  );

-- A student sees their own history once their account is linked.
DROP POLICY IF EXISTS enrollments_student_read ON public.enrollments;
CREATE POLICY enrollments_student_read ON public.enrollments
  FOR SELECT USING (
    student_id IN (SELECT s.id FROM public.students s WHERE s.profile_id = auth.uid())
  );

-- A guardian sees the history of the children linked to them.
DROP POLICY IF EXISTS enrollments_guardian_read ON public.enrollments;
CREATE POLICY enrollments_guardian_read ON public.enrollments
  FOR SELECT USING (
    student_id IN (
      SELECT sg.student_id
      FROM public.student_guardians sg
      JOIN public.guardians g ON g.id = sg.guardian_id
      WHERE g.profile_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 2. student_documents — mirrors admission_documents, but for enrolled students.
--    Only the file path is stored. The object itself lives in the private
--    `documents` bucket and is reachable exclusively through short-lived signed
--    URLs minted server-side.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'other',
  title text,
  file_path text,
  verified boolean NOT NULL DEFAULT false,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_documents_type_check CHECK (
    type IN ('birth_certificate', 'national_id', 'medical', 'previous_report', 'photo', 'transfer', 'other')
  )
);

CREATE INDEX IF NOT EXISTS student_documents_student_idx
  ON public.student_documents (student_id, created_at DESC);

ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_documents_staff_read ON public.student_documents;
CREATE POLICY student_documents_staff_read ON public.student_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active
        AND ur.role = ANY (ARRAY['super_admin', 'admin', 'receptionist', 'accountant'])
    )
  );

DROP POLICY IF EXISTS student_documents_staff_write ON public.student_documents;
CREATE POLICY student_documents_staff_write ON public.student_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active
        AND ur.role = ANY (ARRAY['super_admin', 'admin', 'receptionist'])
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.is_active
        AND ur.role = ANY (ARRAY['super_admin', 'admin', 'receptionist'])
    )
  );

DROP POLICY IF EXISTS student_documents_self_read ON public.student_documents;
CREATE POLICY student_documents_self_read ON public.student_documents
  FOR SELECT USING (
    student_id IN (SELECT s.id FROM public.students s WHERE s.profile_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 3. Backfill: seed one enrollment row per student from their CURRENT section.
--    This is a no-op for any student who already has a row for that year, so the
--    script is safe to re-run. No existing data is modified.
-- ---------------------------------------------------------------------------
INSERT INTO public.enrollments (
  institution_id, student_id, academic_year_id, section_id, class_id, status, started_on
)
SELECT
  s.institution_id,
  s.id,
  c.academic_year_id,
  s.section_id,
  sec.class_id,
  'enrolled',
  COALESCE(s.enrolled_at, ay.start_date)
FROM public.students s
JOIN public.sections sec ON sec.id = s.section_id
JOIN public.classes c ON c.id = sec.class_id
JOIN public.academic_years ay ON ay.id = c.academic_year_id
ON CONFLICT ON CONSTRAINT enrollments_student_year_key DO NOTHING;