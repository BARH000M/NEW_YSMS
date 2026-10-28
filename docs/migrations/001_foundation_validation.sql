-- =====================================================================
-- 001_foundation_validation.sql
-- Post-migration validation. Every query must return the expected value
-- documented in the comment above it.
-- =====================================================================

-- 1. No FK may remain unvalidated (expect: 0 rows)
SELECT conname AS unvalidated_constraint
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND contype = 'f'
  AND NOT convalidated;

-- 2. Total FK count on public tables (expect: 65 or higher, never lower
--    than the pre-migration count of 54)
SELECT count(*) AS total_foreign_keys
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace AND contype = 'f';

-- 3. Orphan sweep — every count must be 0
SELECT
  (SELECT count(*) FROM students s LEFT JOIN sections sec ON sec.id = s.section_id
     WHERE s.section_id IS NOT NULL AND sec.id IS NULL) AS orphan_students_section,
  (SELECT count(*) FROM sections s LEFT JOIN classes c ON c.id = s.class_id
     WHERE c.id IS NULL) AS orphan_sections_class,
  (SELECT count(*) FROM classes c LEFT JOIN academic_years y ON y.id = c.academic_year_id
     WHERE y.id IS NULL) AS orphan_classes_year,
  (SELECT count(*) FROM terms t LEFT JOIN academic_years y ON y.id = t.academic_year_id
     WHERE y.id IS NULL) AS orphan_terms_year,
  (SELECT count(*) FROM invoices i LEFT JOIN students s ON s.id = i.student_id
     WHERE s.id IS NULL) AS orphan_invoices_student,
  (SELECT count(*) FROM payments p LEFT JOIN invoices i ON i.id = p.invoice_id
     WHERE i.id IS NULL) AS orphan_payments_invoice,
  (SELECT count(*) FROM exam_results r LEFT JOIN students s ON s.id = r.student_id
     WHERE s.id IS NULL) AS orphan_results_student,
  (SELECT count(*) FROM attendance a LEFT JOIN students s ON s.id = a.student_id
     WHERE s.id IS NULL) AS orphan_attendance_student;

-- 4. Academic chain completeness (expect all 0)
SELECT
  (SELECT count(*) FROM students WHERE section_id IS NULL) AS students_without_section,
  (SELECT count(*) FROM classes WHERE academic_year_id IS NULL) AS classes_without_year,
  (SELECT count(*) FROM terms WHERE academic_year_id IS NULL) AS terms_without_year,
  (SELECT count(*) FROM attendance WHERE section_id IS NULL) AS attendance_without_section;

-- 5. Identity layer coverage
--    profiles_total must be >= the number of role-holding accounts.
SELECT
  (SELECT count(*) FROM profiles) AS profiles_total,
  (SELECT count(DISTINCT user_id) FROM user_roles WHERE is_active) AS active_accounts,
  (SELECT count(*) FROM students WHERE profile_id IS NULL) AS students_unlinked,
  (SELECT count(*) FROM staff WHERE profile_id IS NULL) AS staff_unlinked,
  (SELECT count(*) FROM guardians WHERE profile_id IS NULL) AS guardians_unlinked;

-- 6. Duplicate identity guard — expect 0 rows on each
SELECT profile_id, count(*) FROM students WHERE profile_id IS NOT NULL GROUP BY profile_id HAVING count(*) > 1;
SELECT profile_id, count(*) FROM staff WHERE profile_id IS NOT NULL GROUP BY profile_id HAVING count(*) > 1;
SELECT profile_id, count(*) FROM guardians WHERE profile_id IS NOT NULL GROUP BY profile_id HAVING count(*) > 1;

-- 7. RLS must still be on for every academic/finance table (expect all true)
SELECT c.relname, c.relrowsecurity AS rls_enabled,
       (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policies
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND c.relname IN ('students','staff','guardians','student_guardians','profiles','user_roles',
                    'invoices','payments','attendance','exam_results','classes','sections',
                    'academic_years','terms','fee_installments','fee_approvals')
ORDER BY c.relname;