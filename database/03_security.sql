-- ============================================================================
--  SAI College — Academic OS
--  03 / 04 — SECURITY  (row level security + grants)
-- ----------------------------------------------------------------------------
--  Run AFTER 02_keys_and_indexes.sql.
--
--  Model in one paragraph: every school table has RLS on and the anonymous
--  key can read nothing. A signed-in account is allowed in because of a row in
--  public.user_roles. Reading your own record (student / guardian) is granted
--  separately, so a student never sees another student's fees or marks.
--
--  The long "exists (select 1 from user_roles ...)" test that used to be copied
--  into every policy is now a single helper, public.has_role(). Nothing about
--  the resulting permissions changes — only the amount of repetition.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Role helper
-- ---------------------------------------------------------------------------
-- has_role()       -> true if the caller holds any active role
-- has_role(array)  -> true if the caller holds one of the listed roles
-- ---------------------------------------------------------------------------

create or replace function public.has_role(roles text[] default null)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.is_active
      and (roles is null or ur.role = any (roles))
  );
$$;

grant execute on function public.has_role(text[]) to authenticated;


-- ---------------------------------------------------------------------------
-- 1. Turn RLS on everywhere
-- ---------------------------------------------------------------------------

alter table public.institutions            enable row level security;
alter table public.profiles                enable row level security;
alter table public.user_roles              enable row level security;
alter table public.role_permissions        enable row level security;
alter table public.settings                enable row level security;
alter table public.module_flags            enable row level security;
alter table public.notifications           enable row level security;
alter table public.audit_log               enable row level security;
alter table public.academic_years          enable row level security;
alter table public.terms                   enable row level security;
alter table public.subjects                enable row level security;
alter table public.classes                 enable row level security;
alter table public.sections                enable row level security;
alter table public.class_subjects          enable row level security;
alter table public.timetable_slots         enable row level security;
alter table public.calendar_events         enable row level security;
alter table public.grade_bands             enable row level security;
alter table public.staff                   enable row level security;
alter table public.staff_documents         enable row level security;
alter table public.students                enable row level security;
alter table public.student_profile_extras  enable row level security;
alter table public.guardians               enable row level security;
alter table public.student_guardians       enable row level security;
alter table public.student_siblings        enable row level security;
alter table public.enrollments             enable row level security;
alter table public.student_documents       enable row level security;
alter table public.admissions              enable row level security;
alter table public.admission_documents     enable row level security;
alter table public.admission_details       enable row level security;
alter table public.enquiries               enable row level security;
alter table public.complaints              enable row level security;
alter table public.visitors                enable row level security;
alter table public.postal_records          enable row level security;
alter table public.call_logs               enable row level security;
alter table public.fee_heads               enable row level security;
alter table public.invoices                enable row level security;
alter table public.invoice_items           enable row level security;
alter table public.payments                enable row level security;
alter table public.fee_installments        enable row level security;
alter table public.fee_approvals           enable row level security;
alter table public.fee_discounts           enable row level security;
alter table public.fee_discount_allotments enable row level security;
alter table public.expenses                enable row level security;
alter table public.income_heads            enable row level security;
alter table public.other_incomes           enable row level security;
alter table public.exams                   enable row level security;
alter table public.exam_subjects           enable row level security;
alter table public.exam_results            enable row level security;
alter table public.attendance              enable row level security;
alter table public.assignments             enable row level security;
alter table public.online_courses          enable row level security;
alter table public.download_contents       enable row level security;
alter table public.notices                 enable row level security;
alter table public.library_books           enable row level security;
alter table public.library_members         enable row level security;
alter table public.library_issues          enable row level security;
alter table public.messages                enable row level security;
alter table public.message_reads           enable row level security;
alter table public.transport_vehicles      enable row level security;
alter table public.transport_routes        enable row level security;
alter table public.transport_route_stops   enable row level security;
alter table public.transport_allocations   enable row level security;
alter table public.hostels                 enable row level security;
alter table public.hostel_room_types       enable row level security;
alter table public.hostel_rooms            enable row level security;
alter table public.hostel_allocations      enable row level security;


-- ---------------------------------------------------------------------------
-- 2. Identity and platform
-- ---------------------------------------------------------------------------

create policy profiles_select on public.profiles for select to authenticated
  using ((id = auth.uid()) OR public.has_role(ARRAY['super_admin','admin','teacher','receptionist','accountant','librarian']));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid());

create policy role_permissions_select on public.role_permissions for select to authenticated using true;
create policy role_permissions_write on public.role_permissions for all to authenticated
  using (public.has_role(ARRAY['super_admin'])) with check (public.has_role(ARRAY['super_admin']));

create policy institutions_select on public.institutions for select to authenticated
  using (id = (select ur.institution_id from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active limit 1));
create policy institutions_update on public.institutions for update to authenticated
  using (public.has_role(ARRAY['super_admin','admin']));

create policy settings_select on public.settings for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher','receptionist','accountant','librarian']));
create policy settings_write on public.settings for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin'])) with check (public.has_role(ARRAY['super_admin','admin']));

create policy module_flags_select on public.module_flags for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher','receptionist','accountant','librarian']));
create policy module_flags_write on public.module_flags for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin'])) with check (public.has_role(ARRAY['super_admin','admin']));

create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy audit_log_select on public.audit_log for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin']));
create policy audit_log_insert on public.audit_log for insert to authenticated
  with check ((actor_id = auth.uid()) AND public.has_role(ARRAY['super_admin','admin','accountant']));


-- ---------------------------------------------------------------------------
-- 3. Academic structure
-- ---------------------------------------------------------------------------

create policy academic_years_select on public.academic_years for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher','receptionist','accountant','librarian']));
create policy academic_years_write on public.academic_years for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin'])) with check (public.has_role(ARRAY['super_admin','admin']));

create policy terms_select on public.terms for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher','receptionist','accountant','librarian']));
create policy terms_write on public.terms for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin'])) with check (public.has_role(ARRAY['super_admin','admin']));

create policy subjects_select on public.subjects for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher','receptionist','accountant','librarian']));
create policy subjects_write on public.subjects for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin'])) with check (public.has_role(ARRAY['super_admin','admin']));

create policy classes_select on public.classes for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher','receptionist','accountant','librarian']));
create policy classes_write on public.classes for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin'])) with check (public.has_role(ARRAY['super_admin','admin']));

create policy sections_select on public.sections for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher','receptionist','accountant','librarian']));
create policy sections_write on public.sections for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin'])) with check (public.has_role(ARRAY['super_admin','admin']));

create policy class_subjects_select on public.class_subjects for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher','receptionist','accountant','librarian']));
create policy class_subjects_write on public.class_subjects for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin'])) with check (public.has_role(ARRAY['super_admin','admin']));

create policy timetable_slots_select on public.timetable_slots for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher','receptionist','accountant','librarian']));
create policy timetable_slots_write on public.timetable_slots for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin'])) with check (public.has_role(ARRAY['super_admin','admin']));

create policy calendar_events_select on public.calendar_events for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher','receptionist','accountant','librarian']));
create policy calendar_events_write on public.calendar_events for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin'])) with check (public.has_role(ARRAY['super_admin','admin']));

create policy grade_bands_staff_read on public.grade_bands for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant','receptionist','teacher','student','parent']));
create policy grade_bands_academic_write on public.grade_bands for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher'])) with check (public.has_role(ARRAY['super_admin','admin','teacher']));


-- ---------------------------------------------------------------------------
-- 4. People
-- ---------------------------------------------------------------------------

create policy staff_select on public.staff for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher','receptionist','accountant','librarian']));
create policy staff_write on public.staff for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin'])) with check (public.has_role(ARRAY['super_admin','admin']));

create policy staff_documents_select on public.staff_documents for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher']));
create policy staff_documents_write on public.staff_documents for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin'])) with check (public.has_role(ARRAY['super_admin','admin']));

create policy students_select on public.students for select to authenticated
  using ((profile_id = auth.uid()) OR public.has_role(ARRAY['super_admin','admin','teacher','receptionist','accountant','librarian']));
create policy students_write on public.students for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin'])) with check (public.has_role(ARRAY['super_admin','admin']));

create policy student_extras_read on public.student_profile_extras for select to authenticated
  using ((student_id in (select s.id from public.students s where s.profile_id = auth.uid()))
         OR public.has_role(ARRAY['super_admin','admin','teacher','receptionist','accountant','librarian']));
create policy student_extras_write on public.student_profile_extras for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','receptionist'])) with check (public.has_role(ARRAY['super_admin','admin','receptionist']));

create policy guardians_select on public.guardians for select to authenticated
  using ((profile_id = auth.uid()) OR public.has_role(ARRAY['super_admin','admin','teacher','receptionist']));
create policy guardians_write on public.guardians for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin'])) with check (public.has_role(ARRAY['super_admin','admin']));

create policy student_guardians_select on public.student_guardians for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher','receptionist']));
create policy student_guardians_write on public.student_guardians for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin'])) with check (public.has_role(ARRAY['super_admin','admin']));

create policy siblings_read on public.student_siblings for select to authenticated
  using ((student_id in (select s.id from public.students s where s.profile_id = auth.uid()))
         OR public.has_role(ARRAY['super_admin','admin','teacher','receptionist','accountant']));
create policy siblings_write on public.student_siblings for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','receptionist'])) with check (public.has_role(ARRAY['super_admin','admin','receptionist']));

create policy enrollments_staff_read on public.enrollments for select to public
  using (public.has_role(ARRAY['super_admin','admin','teacher','accountant','receptionist']));
create policy enrollments_admin_write on public.enrollments for all to public
  using (public.has_role(ARRAY['super_admin','admin'])) with check (public.has_role(ARRAY['super_admin','admin']));
create policy enrollments_student_read on public.enrollments for select to public
  using (student_id in (select s.id from public.students s where s.profile_id = auth.uid()));
create policy enrollments_guardian_read on public.enrollments for select to public
  using (student_id in (select sg.student_id from public.student_guardians sg
                        join public.guardians g on g.id = sg.guardian_id
                        where g.profile_id = auth.uid()));

create policy student_documents_staff_read on public.student_documents for select to public
  using (public.has_role(ARRAY['super_admin','admin','receptionist','accountant']));
create policy student_documents_staff_write on public.student_documents for all to public
  using (public.has_role(ARRAY['super_admin','admin','receptionist'])) with check (public.has_role(ARRAY['super_admin','admin','receptionist']));
create policy student_documents_self_read on public.student_documents for select to public
  using (student_id in (select s.id from public.students s where s.profile_id = auth.uid()));


-- ---------------------------------------------------------------------------
-- 5. Admissions and front office
-- ---------------------------------------------------------------------------

create policy admissions_select on public.admissions for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','receptionist']));
create policy admissions_write on public.admissions for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','receptionist'])) with check (public.has_role(ARRAY['super_admin','admin','receptionist']));

create policy admission_documents_select on public.admission_documents for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','receptionist']));
create policy admission_documents_write on public.admission_documents for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','receptionist'])) with check (public.has_role(ARRAY['super_admin','admin','receptionist']));

create policy admission_details_read on public.admission_details for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','receptionist','teacher']));
create policy admission_details_write on public.admission_details for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','receptionist'])) with check (public.has_role(ARRAY['super_admin','admin','receptionist']));

create policy enquiries_select on public.enquiries for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','receptionist']));
create policy enquiries_write on public.enquiries for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','receptionist'])) with check (public.has_role(ARRAY['super_admin','admin','receptionist']));

create policy complaints_select on public.complaints for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','receptionist']));
create policy complaints_write on public.complaints for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','receptionist'])) with check (public.has_role(ARRAY['super_admin','admin','receptionist']));

create policy visitors_select on public.visitors for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher','receptionist']));
create policy visitors_write on public.visitors for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','receptionist'])) with check (public.has_role(ARRAY['super_admin','admin','receptionist']));

create policy postal_records_select on public.postal_records for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','receptionist']));
create policy postal_records_write on public.postal_records for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','receptionist'])) with check (public.has_role(ARRAY['super_admin','admin','receptionist']));

create policy call_logs_staff_read on public.call_logs for select to authenticated
  using (public.has_role());
create policy call_logs_reception_write on public.call_logs for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','receptionist'])) with check (public.has_role(ARRAY['super_admin','admin','receptionist']));


-- ---------------------------------------------------------------------------
-- 6. Fees and finance
-- ---------------------------------------------------------------------------

create policy fee_heads_staff_read on public.fee_heads for select to authenticated using (public.has_role());
create policy fee_heads_admin_write on public.fee_heads for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant'])) with check (public.has_role(ARRAY['super_admin','admin','accountant']));

create policy invoices_staff_read on public.invoices for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant','receptionist']));
create policy invoices_student_read on public.invoices for select to authenticated
  using (student_id in (select s.id from public.students s where s.profile_id = auth.uid()));
create policy invoices_accountant_write on public.invoices for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant'])) with check (public.has_role(ARRAY['super_admin','admin','accountant']));

create policy invoice_items_staff_read on public.invoice_items for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant','receptionist']));
create policy invoice_items_write on public.invoice_items for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant'])) with check (public.has_role(ARRAY['super_admin','admin','accountant']));

create policy payments_staff_read on public.payments for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant','receptionist']));
create policy payments_student_read on public.payments for select to authenticated
  using (student_id in (select s.id from public.students s where s.profile_id = auth.uid()));
create policy payments_write on public.payments for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant'])) with check (public.has_role(ARRAY['super_admin','admin','accountant']));

create policy installments_staff_read on public.fee_installments for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant','receptionist']));
create policy installments_accountant_write on public.fee_installments for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant'])) with check (public.has_role(ARRAY['super_admin','admin','accountant']));

create policy approvals_staff_read on public.fee_approvals for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant']));
create policy approvals_accountant_write on public.fee_approvals for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant'])) with check (public.has_role(ARRAY['super_admin','admin','accountant']));

create policy fee_discounts_staff_read on public.fee_discounts for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant','receptionist','teacher']));
create policy fee_discounts_finance_write on public.fee_discounts for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant'])) with check (public.has_role(ARRAY['super_admin','admin','accountant']));

create policy fee_discount_allotments_staff_read on public.fee_discount_allotments for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant','receptionist','teacher']));
create policy fee_discount_allotments_self_read on public.fee_discount_allotments for select to authenticated
  using ((student_id in (select s.id from public.students s where s.profile_id = auth.uid()))
         OR (student_id in (select sg.student_id from public.student_guardians sg
                            join public.guardians g on g.id = sg.guardian_id
                            where g.profile_id = auth.uid())));
create policy fee_discount_allotments_finance_write on public.fee_discount_allotments for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant'])) with check (public.has_role(ARRAY['super_admin','admin','accountant']));

create policy expenses_staff_read on public.expenses for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant']));
create policy expenses_finance_write on public.expenses for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant'])) with check (public.has_role(ARRAY['super_admin','admin','accountant']));

create policy income_heads_read on public.income_heads for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant']));
create policy income_heads_write on public.income_heads for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant'])) with check (public.has_role(ARRAY['super_admin','admin','accountant']));

create policy other_incomes_read on public.other_incomes for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant']));
create policy other_incomes_write on public.other_incomes for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','accountant'])) with check (public.has_role(ARRAY['super_admin','admin','accountant']));


-- ---------------------------------------------------------------------------
-- 7. Assessment, attendance and coursework
-- ---------------------------------------------------------------------------

create policy exams_staff_read on public.exams for select to authenticated using (public.has_role());
create policy exams_write on public.exams for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher'])) with check (public.has_role(ARRAY['super_admin','admin','teacher']));

create policy exam_subjects_staff_read on public.exam_subjects for select to authenticated using (public.has_role());
create policy exam_subjects_write on public.exam_subjects for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher'])) with check (public.has_role(ARRAY['super_admin','admin','teacher']));

create policy exam_results_staff_read on public.exam_results for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher','accountant']));
create policy exam_results_student_read on public.exam_results for select to authenticated
  using (student_id in (select s.id from public.students s where s.profile_id = auth.uid()));
create policy exam_results_write on public.exam_results for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher'])) with check (public.has_role(ARRAY['super_admin','admin','teacher']));

create policy attendance_staff_read on public.attendance for select to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher','accountant','receptionist']));
create policy attendance_teacher_write on public.attendance for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher'])) with check (public.has_role(ARRAY['super_admin','admin','teacher']));

create policy assignments_staff_read on public.assignments for select to authenticated using (public.has_role());
create policy assignments_teacher_write on public.assignments for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher'])) with check (public.has_role(ARRAY['super_admin','admin','teacher']));

create policy online_courses_staff_read on public.online_courses for select to authenticated using (public.has_role());
create policy online_courses_admin_write on public.online_courses for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher'])) with check (public.has_role(ARRAY['super_admin','admin','teacher']));


-- ---------------------------------------------------------------------------
-- 8. Campus services
-- ---------------------------------------------------------------------------

create policy download_contents_read on public.download_contents for select to authenticated using true;
create policy download_contents_staff_write on public.download_contents for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher','librarian'])) with check (public.has_role(ARRAY['super_admin','admin','teacher','librarian']));

create policy notices_read on public.notices for select to authenticated using true;
create policy notices_staff_write on public.notices for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','teacher','receptionist'])) with check (public.has_role(ARRAY['super_admin','admin','teacher','receptionist']));

create policy library_books_staff_read on public.library_books for select to authenticated using true;
create policy library_books_staff_write on public.library_books for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','librarian'])) with check (public.has_role(ARRAY['super_admin','admin','librarian']));

create policy library_members_staff_read on public.library_members for select to authenticated using (public.has_role());
create policy library_members_self_read on public.library_members for select to authenticated
  using (exists (select 1 from public.students s where s.id = library_members.student_id and s.profile_id = auth.uid()));
create policy library_members_staff_write on public.library_members for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','librarian'])) with check (public.has_role(ARRAY['super_admin','admin','librarian']));

create policy library_issues_staff_read on public.library_issues for select to authenticated using (public.has_role());
create policy library_issues_self_read on public.library_issues for select to authenticated
  using (exists (select 1 from public.library_members m
                 join public.students s on s.id = m.student_id
                 where m.id = library_issues.member_id and s.profile_id = auth.uid()));
create policy library_issues_staff_write on public.library_issues for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','librarian'])) with check (public.has_role(ARRAY['super_admin','admin','librarian']));

create policy messages_read on public.messages for select to public
  using ((sender_id = auth.uid())
      OR (recipient_id = auth.uid())
      OR (audience = 'all')
      OR ((audience = 'staff') AND public.has_role(ARRAY['super_admin','admin','teacher','accountant','receptionist','librarian']))
      OR ((audience = 'teachers') AND public.has_role(ARRAY['teacher']))
      OR ((audience = 'students') AND public.has_role(ARRAY['student']))
      OR ((audience = 'parents') AND public.has_role(ARRAY['parent'])));
create policy messages_insert on public.messages for insert to public
  with check ((auth.uid() is not null) AND (sender_id = auth.uid()));
create policy messages_delete on public.messages for delete to public
  using ((sender_id = auth.uid()) OR public.has_role(ARRAY['super_admin','admin']));

create policy message_reads_own on public.message_reads for select to public using (user_id = auth.uid());
create policy message_reads_insert_own on public.message_reads for insert to public with check (user_id = auth.uid());

-- Transport and hostel: readable by any signed-in account, written by staff.
create policy transport_read on public.transport_vehicles for select to authenticated using (true);
create policy transport_write on public.transport_vehicles for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','receptionist'])) with check (public.has_role(ARRAY['super_admin','admin','receptionist']));

create policy routes_read on public.transport_routes for select to authenticated using (true);
create policy routes_write on public.transport_routes for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','receptionist'])) with check (public.has_role(ARRAY['super_admin','admin','receptionist']));

create policy stops_read on public.transport_route_stops for select to authenticated using (true);
create policy stops_write on public.transport_route_stops for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','receptionist'])) with check (public.has_role(ARRAY['super_admin','admin','receptionist']));

create policy transport_alloc_read on public.transport_allocations for select to authenticated
  using ((student_id in (select s.id from public.students s where s.profile_id = auth.uid()))
         OR public.has_role(ARRAY['super_admin','admin','teacher','receptionist','accountant']));
create policy transport_alloc_write on public.transport_allocations for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin','receptionist'])) with check (public.has_role(ARRAY['super_admin','admin','receptionist']));

create policy hostels_read on public.hostels for select to authenticated using (true);
create policy hostels_write on public.hostels for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin'])) with check (public.has_role(ARRAY['super_admin','admin']));

create policy room_types_read on public.hostel_room_types for select to authenticated using (true);
create policy room_types_write on public.hostel_room_types for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin'])) with check (public.has_role(ARRAY['super_admin','admin']));

create policy rooms_read on public.hostel_rooms for select to authenticated using (true);
create policy rooms_write on public.hostel_rooms for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin'])) with check (public.has_role(ARRAY['super_admin','admin']));

create policy hostel_alloc_read on public.hostel_allocations for select to authenticated
  using ((student_id in (select s.id from public.students s where s.profile_id = auth.uid()))
         OR public.has_role(ARRAY['super_admin','admin','teacher','receptionist','accountant']));
create policy hostel_alloc_write on public.hostel_allocations for all to authenticated
  using (public.has_role(ARRAY['super_admin','admin'])) with check (public.has_role(ARRAY['super_admin','admin']));


-- ---------------------------------------------------------------------------
-- 9. Grants
-- ---------------------------------------------------------------------------
-- Signed-in accounts get table access; RLS then decides which rows they see.
-- The anonymous key gets nothing at all — the console has no public surface.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;

revoke all on all tables in schema public from anon;