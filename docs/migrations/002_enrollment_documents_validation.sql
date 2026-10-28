-- ============================================================================
-- Migration 002 — Validation report. Read-only: safe to run at any time.
-- ============================================================================

-- 1. Both tables exist and have RLS enabled.
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('enrollments', 'student_documents')
ORDER BY c.relname;

-- 2. Policies attached to the new tables.
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('enrollments', 'student_documents')
ORDER BY tablename, cmd, policyname;

-- 3. Foreign keys on the new tables (expect 6 for enrollments, 4 for student_documents).
SELECT conrelid::regclass AS table_name, conname, contype, convalidated
FROM pg_constraint
WHERE conrelid IN ('public.enrollments'::regclass, 'public.student_documents'::regclass)
  AND contype = 'f'
ORDER BY 1, 2;

-- 4. Enrollment coverage: every student with a current section must have a row
--    for that section's academic year. Expected `gap = 0`.
SELECT
  (SELECT count(*) FROM public.students WHERE section_id IS NOT NULL) AS placed_students,
  (SELECT count(*) FROM public.enrollments) AS enrollment_rows,
  (SELECT count(*) FROM public.students s
     JOIN public.sections sec ON sec.id = s.section_id
     JOIN public.classes c ON c.id = sec.class_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = s.id AND e.academic_year_id = c.academic_year_id
    )) AS gap;

-- 5. Orphan sweep on the new relationships. All expected 0.
SELECT
  (SELECT count(*) FROM public.enrollments e
    WHERE NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id = e.student_id)) AS orphan_enrollment_student,
  (SELECT count(*) FROM public.enrollments e
    WHERE NOT EXISTS (SELECT 1 FROM public.academic_years y WHERE y.id = e.academic_year_id)) AS orphan_enrollment_year,
  (SELECT count(*) FROM public.student_documents d
    WHERE NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id = d.student_id)) AS orphan_document_student;

-- 6. Duplicate placement guard must exist (expect 1 row).
SELECT indexname AS unique_guard
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'enrollments'
  AND indexdef ILIKE '%unique%';