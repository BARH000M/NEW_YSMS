-- ============================================================================
--  SAI College — Academic OS
--  02 / 04 — KEYS, RELATIONSHIPS AND INDEXES
-- ----------------------------------------------------------------------------
--  Run AFTER 01_tables.sql. Adds primary keys, unique rules, check rules,
--  foreign keys and the read-path indexes.
--
--  This file is written for a FIRST-TIME install: constraint names cannot use
--  "if not exists" in Postgres, so running it a second time will report
--  "already exists" errors. That is expected and harmless — the constraints
--  are already in place.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Identity and platform
-- ---------------------------------------------------------------------------

alter table public.institutions add constraint institutions_pkey PRIMARY KEY (id);
alter table public.institutions add constraint institutions_code_key UNIQUE (code);

alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table public.profiles add constraint profiles_locale_check CHECK ((locale = ANY (ARRAY['ar'::text, 'en'::text, 'zh'::text])));
alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.profiles add constraint profiles_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL;

alter table public.user_roles add constraint user_roles_pkey PRIMARY KEY (user_id);
alter table public.user_roles add constraint user_roles_role_check CHECK ((role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'teacher'::text, 'accountant'::text, 'student'::text, 'parent'::text, 'receptionist'::text, 'librarian'::text])));
alter table public.user_roles add constraint user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.user_roles add constraint user_roles_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL;

alter table public.role_permissions add constraint role_permissions_pkey PRIMARY KEY (role, module);
alter table public.role_permissions add constraint role_permissions_role_check CHECK ((role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'teacher'::text, 'accountant'::text, 'student'::text, 'parent'::text, 'receptionist'::text, 'librarian'::text])));

alter table public.settings add constraint settings_pkey PRIMARY KEY (id);
alter table public.settings add constraint settings_institution_id_key_key UNIQUE (institution_id, key);
alter table public.settings add constraint settings_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

alter table public.module_flags add constraint module_flags_pkey PRIMARY KEY (id);
alter table public.module_flags add constraint module_flags_institution_id_module_key UNIQUE (institution_id, module);
alter table public.module_flags add constraint module_flags_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

alter table public.notifications add constraint notifications_pkey PRIMARY KEY (id);
alter table public.notifications add constraint notifications_channel_check CHECK ((channel = ANY (ARRAY['in_app'::text, 'email'::text, 'sms'::text, 'whatsapp'::text])));
alter table public.notifications add constraint notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.notifications add constraint notifications_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

alter table public.audit_log add constraint audit_log_pkey PRIMARY KEY (id);
alter table public.audit_log add constraint audit_log_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL;


-- ---------------------------------------------------------------------------
-- 2. Academic structure
-- ---------------------------------------------------------------------------

alter table public.academic_years add constraint academic_years_pkey PRIMARY KEY (id);
alter table public.academic_years add constraint academic_years_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

alter table public.terms add constraint terms_pkey PRIMARY KEY (id);
alter table public.terms add constraint terms_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE;

alter table public.subjects add constraint subjects_pkey PRIMARY KEY (id);
alter table public.subjects add constraint subjects_institution_id_code_key UNIQUE (institution_id, code);
alter table public.subjects add constraint subjects_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

alter table public.classes add constraint classes_pkey PRIMARY KEY (id);
alter table public.classes add constraint classes_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE;

alter table public.sections add constraint sections_pkey PRIMARY KEY (id);
alter table public.sections add constraint sections_class_id_name_key UNIQUE (class_id, name);
alter table public.sections add constraint sections_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
alter table public.sections add constraint sections_class_teacher_id_fkey FOREIGN KEY (class_teacher_id) REFERENCES staff(id) ON DELETE SET NULL;

alter table public.class_subjects add constraint class_subjects_pkey PRIMARY KEY (id);
alter table public.class_subjects add constraint class_subjects_section_id_subject_id_key UNIQUE (section_id, subject_id);
alter table public.class_subjects add constraint class_subjects_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE;
alter table public.class_subjects add constraint class_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
alter table public.class_subjects add constraint class_subjects_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES staff(id) ON DELETE SET NULL;

alter table public.timetable_slots add constraint timetable_slots_pkey PRIMARY KEY (id);
alter table public.timetable_slots add constraint timetable_slots_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)));
alter table public.timetable_slots add constraint timetable_slots_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE;
alter table public.timetable_slots add constraint timetable_slots_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;
alter table public.timetable_slots add constraint timetable_slots_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES staff(id) ON DELETE SET NULL;

alter table public.calendar_events add constraint calendar_events_pkey PRIMARY KEY (id);
alter table public.calendar_events add constraint calendar_events_type_check CHECK ((type = ANY (ARRAY['general'::text, 'exam'::text, 'holiday'::text, 'event'::text, 'meeting'::text])));
alter table public.calendar_events add constraint calendar_events_audience_check CHECK ((audience = ANY (ARRAY['all'::text, 'staff'::text, 'students'::text, 'parents'::text])));
alter table public.calendar_events add constraint calendar_events_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.calendar_events add constraint calendar_events_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

alter table public.grade_bands add constraint grade_bands_pkey PRIMARY KEY (id);
alter table public.grade_bands add constraint grade_bands_range_check CHECK (((percent_from >= (0)::numeric) AND (percent_upto <= (100)::numeric) AND (percent_upto >= percent_from)));
alter table public.grade_bands add constraint grade_bands_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;


-- ---------------------------------------------------------------------------
-- 3. People
-- ---------------------------------------------------------------------------

alter table public.staff add constraint staff_pkey PRIMARY KEY (id);
alter table public.staff add constraint staff_contract_type_check CHECK ((contract_type = ANY (ARRAY['full_time'::text, 'part_time'::text, 'contract'::text])));
alter table public.staff add constraint staff_institution_id_staff_no_key UNIQUE (institution_id, staff_no);
alter table public.staff add constraint staff_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.staff add constraint staff_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.staff_documents add constraint staff_documents_pkey PRIMARY KEY (id);
alter table public.staff_documents add constraint staff_documents_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE;

alter table public.students add constraint students_pkey PRIMARY KEY (id);
alter table public.students add constraint students_institution_id_student_no_key UNIQUE (institution_id, student_no);
alter table public.students add constraint students_gender_check CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text])));
alter table public.students add constraint students_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'graduated'::text, 'withdrawn'::text])));
alter table public.students add constraint students_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.students add constraint students_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.students add constraint students_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL;
alter table public.students add constraint students_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE SET NULL;

alter table public.student_profile_extras add constraint student_profile_extras_pkey PRIMARY KEY (student_id);
alter table public.student_profile_extras add constraint student_profile_extras_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

alter table public.guardians add constraint guardians_pkey PRIMARY KEY (id);
alter table public.guardians add constraint guardians_relation_check CHECK ((relation = ANY (ARRAY['father'::text, 'mother'::text, 'guardian'::text, 'other'::text])));
alter table public.guardians add constraint guardians_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.guardians add constraint guardians_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES auth.users(id) ON DELETE SET NULL;

alter table public.student_guardians add constraint student_guardians_pkey PRIMARY KEY (id);
alter table public.student_guardians add constraint student_guardians_student_id_guardian_id_key UNIQUE (student_id, guardian_id);
alter table public.student_guardians add constraint student_guardians_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table public.student_guardians add constraint student_guardians_guardian_id_fkey FOREIGN KEY (guardian_id) REFERENCES guardians(id) ON DELETE CASCADE;

alter table public.student_siblings add constraint student_siblings_pkey PRIMARY KEY (id);
alter table public.student_siblings add constraint student_siblings_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.student_siblings add constraint student_siblings_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table public.student_siblings add constraint student_siblings_sibling_student_id_fkey FOREIGN KEY (sibling_student_id) REFERENCES students(id) ON DELETE SET NULL;

alter table public.enrollments add constraint enrollments_pkey PRIMARY KEY (id);
alter table public.enrollments add constraint enrollments_student_year_key UNIQUE (student_id, academic_year_id);
alter table public.enrollments add constraint enrollments_status_check CHECK ((status = ANY (ARRAY['enrolled'::text, 'promoted'::text, 'repeated'::text, 'transferred'::text, 'graduated'::text, 'withdrawn'::text])));
alter table public.enrollments add constraint enrollments_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.enrollments add constraint enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table public.enrollments add constraint enrollments_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE;
alter table public.enrollments add constraint enrollments_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL;
alter table public.enrollments add constraint enrollments_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

alter table public.student_documents add constraint student_documents_pkey PRIMARY KEY (id);
alter table public.student_documents add constraint student_documents_type_check CHECK ((type = ANY (ARRAY['birth_certificate'::text, 'national_id'::text, 'medical'::text, 'previous_report'::text, 'photo'::text, 'transfer'::text, 'other'::text])));
alter table public.student_documents add constraint student_documents_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.student_documents add constraint student_documents_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table public.student_documents add constraint student_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL;


-- ---------------------------------------------------------------------------
-- 4. Admissions and front office
-- ---------------------------------------------------------------------------

alter table public.admissions add constraint admissions_pkey PRIMARY KEY (id);
alter table public.admissions add constraint admissions_reference_no_key UNIQUE (reference_no);
alter table public.admissions add constraint admissions_source_check CHECK ((source = ANY (ARRAY['website'::text, 'walk_in'::text, 'phone'::text, 'referral'::text])));
alter table public.admissions add constraint admissions_status_check CHECK ((status = ANY (ARRAY['new'::text, 'contacted'::text, 'documents_pending'::text, 'interview'::text, 'accepted'::text, 'rejected'::text, 'enrolled'::text])));
alter table public.admissions add constraint admissions_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.admissions add constraint admissions_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES staff(id) ON DELETE SET NULL;
alter table public.admissions add constraint admissions_converted_student_id_fkey FOREIGN KEY (converted_student_id) REFERENCES students(id) ON DELETE SET NULL;

alter table public.admission_documents add constraint admission_documents_pkey PRIMARY KEY (id);
alter table public.admission_documents add constraint admission_documents_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE CASCADE;

alter table public.admission_details add constraint admission_details_pkey PRIMARY KEY (admission_id);
alter table public.admission_details add constraint admission_details_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE CASCADE;

alter table public.enquiries add constraint enquiries_pkey PRIMARY KEY (id);
alter table public.enquiries add constraint enquiries_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'closed'::text])));
alter table public.enquiries add constraint enquiries_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.enquiries add constraint enquiries_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES staff(id) ON DELETE SET NULL;

alter table public.complaints add constraint complaints_pkey PRIMARY KEY (id);
alter table public.complaints add constraint complaints_reference_no_key UNIQUE (reference_no);
alter table public.complaints add constraint complaints_status_check CHECK ((status = ANY (ARRAY['new'::text, 'investigating'::text, 'resolved'::text, 'closed'::text])));
alter table public.complaints add constraint complaints_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.complaints add constraint complaints_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES staff(id) ON DELETE SET NULL;

alter table public.visitors add constraint visitors_pkey PRIMARY KEY (id);
alter table public.visitors add constraint visitors_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.visitors add constraint visitors_host_staff_id_fkey FOREIGN KEY (host_staff_id) REFERENCES staff(id) ON DELETE SET NULL;

alter table public.postal_records add constraint postal_records_pkey PRIMARY KEY (id);
alter table public.postal_records add constraint postal_records_direction_check CHECK ((direction = ANY (ARRAY['in'::text, 'out'::text])));
alter table public.postal_records add constraint postal_records_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

alter table public.call_logs add constraint call_logs_pkey PRIMARY KEY (id);
alter table public.call_logs add constraint call_logs_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.call_logs add constraint call_logs_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES profiles(id) ON DELETE SET NULL;


-- ---------------------------------------------------------------------------
-- 5. Fees and finance
-- ---------------------------------------------------------------------------

alter table public.fee_heads add constraint fee_heads_pkey PRIMARY KEY (id);
alter table public.fee_heads add constraint fee_heads_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

alter table public.invoices add constraint invoices_pkey PRIMARY KEY (id);
alter table public.invoices add constraint invoices_institution_id_invoice_no_key UNIQUE (institution_id, invoice_no);
alter table public.invoices add constraint invoices_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.invoices add constraint invoices_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table public.invoices add constraint invoices_term_id_fkey FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE SET NULL;
alter table public.invoices add constraint invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

alter table public.invoice_items add constraint invoice_items_pkey PRIMARY KEY (id);
alter table public.invoice_items add constraint invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
alter table public.invoice_items add constraint invoice_items_fee_head_id_fkey FOREIGN KEY (fee_head_id) REFERENCES fee_heads(id) ON DELETE SET NULL;

alter table public.payments add constraint payments_pkey PRIMARY KEY (id);
alter table public.payments add constraint payments_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.payments add constraint payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
alter table public.payments add constraint payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table public.payments add constraint payments_received_by_fkey FOREIGN KEY (received_by) REFERENCES profiles(id) ON DELETE SET NULL;

alter table public.fee_installments add constraint fee_installments_pkey PRIMARY KEY (id);
alter table public.fee_installments add constraint fee_installments_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.fee_installments add constraint fee_installments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;

alter table public.fee_approvals add constraint fee_approvals_pkey PRIMARY KEY (id);
alter table public.fee_approvals add constraint fee_approvals_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.fee_approvals add constraint fee_approvals_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
alter table public.fee_approvals add constraint fee_approvals_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;
alter table public.fee_approvals add constraint fee_approvals_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.fee_approvals add constraint fee_approvals_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

alter table public.fee_discounts add constraint fee_discounts_pkey PRIMARY KEY (id);
alter table public.fee_discounts add constraint fee_discounts_amount_check CHECK ((amount >= (0)::numeric));
alter table public.fee_discounts add constraint fee_discounts_type_check CHECK ((discount_type = ANY (ARRAY['fixed'::text, 'percent'::text])));
alter table public.fee_discounts add constraint fee_discounts_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

alter table public.fee_discount_allotments add constraint fee_discount_allotments_pkey PRIMARY KEY (id);
alter table public.fee_discount_allotments add constraint fee_discount_allotments_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.fee_discount_allotments add constraint fee_discount_allotments_discount_id_fkey FOREIGN KEY (discount_id) REFERENCES fee_discounts(id) ON DELETE CASCADE;
alter table public.fee_discount_allotments add constraint fee_discount_allotments_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table public.fee_discount_allotments add constraint fee_discount_allotments_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL;
alter table public.fee_discount_allotments add constraint fee_discount_allotments_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

alter table public.expenses add constraint expenses_pkey PRIMARY KEY (id);
alter table public.expenses add constraint expenses_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.expenses add constraint expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

alter table public.income_heads add constraint income_heads_pkey PRIMARY KEY (id);
alter table public.income_heads add constraint income_heads_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

alter table public.other_incomes add constraint other_incomes_pkey PRIMARY KEY (id);
alter table public.other_incomes add constraint other_incomes_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.other_incomes add constraint other_incomes_head_id_fkey FOREIGN KEY (head_id) REFERENCES income_heads(id) ON DELETE SET NULL;


-- ---------------------------------------------------------------------------
-- 6. Assessment, attendance and coursework
-- ---------------------------------------------------------------------------

alter table public.exams add constraint exams_pkey PRIMARY KEY (id);
alter table public.exams add constraint exams_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.exams add constraint exams_term_id_fkey FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE SET NULL;

alter table public.exam_subjects add constraint exam_subjects_pkey PRIMARY KEY (id);
alter table public.exam_subjects add constraint exam_subjects_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE;
alter table public.exam_subjects add constraint exam_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
alter table public.exam_subjects add constraint exam_subjects_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL;

alter table public.exam_results add constraint exam_results_pkey PRIMARY KEY (id);
alter table public.exam_results add constraint exam_results_exam_subject_id_student_id_key UNIQUE (exam_subject_id, student_id);
alter table public.exam_results add constraint exam_results_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE;
alter table public.exam_results add constraint exam_results_exam_subject_id_fkey FOREIGN KEY (exam_subject_id) REFERENCES exam_subjects(id) ON DELETE CASCADE;
alter table public.exam_results add constraint exam_results_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

alter table public.attendance add constraint attendance_pkey PRIMARY KEY (id);
alter table public.attendance add constraint attendance_student_id_attendance_date_key UNIQUE (student_id, attendance_date);
alter table public.attendance add constraint attendance_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.attendance add constraint attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table public.attendance add constraint attendance_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL;
alter table public.attendance add constraint attendance_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES profiles(id) ON DELETE SET NULL;

alter table public.assignments add constraint assignments_pkey PRIMARY KEY (id);
alter table public.assignments add constraint assignments_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.assignments add constraint assignments_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE;
alter table public.assignments add constraint assignments_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;
alter table public.assignments add constraint assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

alter table public.online_courses add constraint online_courses_pkey PRIMARY KEY (id);
alter table public.online_courses add constraint online_courses_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;


-- ---------------------------------------------------------------------------
-- 7. Campus services
-- ---------------------------------------------------------------------------

alter table public.download_contents add constraint download_contents_pkey PRIMARY KEY (id);
alter table public.download_contents add constraint download_contents_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.download_contents add constraint download_contents_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;
alter table public.download_contents add constraint download_contents_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

alter table public.notices add constraint notices_pkey PRIMARY KEY (id);
alter table public.notices add constraint notices_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.notices add constraint notices_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

alter table public.library_books add constraint library_books_pkey PRIMARY KEY (id);
alter table public.library_books add constraint library_books_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

alter table public.library_members add constraint library_members_pkey PRIMARY KEY (id);
alter table public.library_members add constraint library_members_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.library_members add constraint library_members_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table public.library_members add constraint library_members_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE;

alter table public.library_issues add constraint library_issues_pkey PRIMARY KEY (id);
alter table public.library_issues add constraint library_issues_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.library_issues add constraint library_issues_book_id_fkey FOREIGN KEY (book_id) REFERENCES library_books(id) ON DELETE CASCADE;
alter table public.library_issues add constraint library_issues_member_id_fkey FOREIGN KEY (member_id) REFERENCES library_members(id) ON DELETE CASCADE;

alter table public.messages add constraint messages_pkey PRIMARY KEY (id);
alter table public.messages add constraint messages_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

alter table public.message_reads add constraint message_reads_pkey PRIMARY KEY (message_id, user_id);
alter table public.message_reads add constraint message_reads_message_id_fkey FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE;

alter table public.transport_vehicles add constraint transport_vehicles_pkey PRIMARY KEY (id);
alter table public.transport_vehicles add constraint transport_vehicles_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

alter table public.transport_routes add constraint transport_routes_pkey PRIMARY KEY (id);
alter table public.transport_routes add constraint transport_routes_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.transport_routes add constraint transport_routes_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES transport_vehicles(id) ON DELETE SET NULL;

alter table public.transport_route_stops add constraint transport_route_stops_pkey PRIMARY KEY (id);
alter table public.transport_route_stops add constraint transport_route_stops_route_id_fkey FOREIGN KEY (route_id) REFERENCES transport_routes(id) ON DELETE CASCADE;

alter table public.transport_allocations add constraint transport_allocations_pkey PRIMARY KEY (id);
alter table public.transport_allocations add constraint transport_allocations_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.transport_allocations add constraint transport_allocations_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table public.transport_allocations add constraint transport_allocations_route_id_fkey FOREIGN KEY (route_id) REFERENCES transport_routes(id) ON DELETE CASCADE;
alter table public.transport_allocations add constraint transport_allocations_stop_id_fkey FOREIGN KEY (stop_id) REFERENCES transport_route_stops(id) ON DELETE SET NULL;

alter table public.hostels add constraint hostels_pkey PRIMARY KEY (id);
alter table public.hostels add constraint hostels_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

alter table public.hostel_room_types add constraint hostel_room_types_pkey PRIMARY KEY (id);
alter table public.hostel_room_types add constraint hostel_room_types_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;

alter table public.hostel_rooms add constraint hostel_rooms_pkey PRIMARY KEY (id);
alter table public.hostel_rooms add constraint hostel_rooms_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE;
alter table public.hostel_rooms add constraint hostel_rooms_room_type_id_fkey FOREIGN KEY (room_type_id) REFERENCES hostel_room_types(id) ON DELETE SET NULL;

alter table public.hostel_allocations add constraint hostel_allocations_pkey PRIMARY KEY (id);
alter table public.hostel_allocations add constraint hostel_allocations_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
alter table public.hostel_allocations add constraint hostel_allocations_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
alter table public.hostel_allocations add constraint hostel_allocations_room_id_fkey FOREIGN KEY (room_id) REFERENCES hostel_rooms(id) ON DELETE CASCADE;


-- ---------------------------------------------------------------------------
-- 8. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_audit_log_table ON public.audit_log USING btree (table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_institution ON public.profiles USING btree (institution_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications USING btree (user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles USING btree (role);
CREATE INDEX IF NOT EXISTS idx_terms_year ON public.terms USING btree (academic_year_id);

CREATE INDEX IF NOT EXISTS idx_classes_year ON public.classes USING btree (academic_year_id);
CREATE INDEX IF NOT EXISTS idx_sections_class ON public.sections USING btree (class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_teacher ON public.class_subjects USING btree (teacher_id);
CREATE UNIQUE INDEX IF NOT EXISTS timetable_slots_section_day_period_key ON public.timetable_slots USING btree (section_id, day_of_week, period);
CREATE UNIQUE INDEX IF NOT EXISTS grade_bands_institution_name_key ON public.grade_bands USING btree (institution_id, lower(name));

-- One login can attach to at most one staff / student / guardian record.
CREATE INDEX IF NOT EXISTS idx_staff_profile ON public.staff USING btree (profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS staff_profile_id_key ON public.staff USING btree (profile_id) WHERE (profile_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_guardians_profile ON public.guardians USING btree (profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS guardians_profile_id_key ON public.guardians USING btree (profile_id) WHERE (profile_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_students_profile ON public.students USING btree (profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS students_profile_id_key ON public.students USING btree (profile_id) WHERE (profile_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_students_section ON public.students USING btree (section_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students USING btree (status);
CREATE INDEX IF NOT EXISTS idx_student_guardians_guardian ON public.student_guardians USING btree (guardian_id);
CREATE INDEX IF NOT EXISTS enrollments_student_idx ON public.enrollments USING btree (student_id, academic_year_id DESC);
CREATE INDEX IF NOT EXISTS enrollments_year_section_idx ON public.enrollments USING btree (academic_year_id, section_id);
CREATE INDEX IF NOT EXISTS student_documents_student_idx ON public.student_documents USING btree (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admissions_status ON public.admissions USING btree (status);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints USING btree (status);
CREATE INDEX IF NOT EXISTS call_logs_call_at_idx ON public.call_logs USING btree (call_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_student ON public.invoices USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices USING btree (status);
CREATE INDEX IF NOT EXISTS idx_invoices_term ON public.invoices USING btree (term_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items USING btree (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments USING btree (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_student ON public.payments USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_installments_invoice ON public.fee_installments USING btree (invoice_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.fee_approvals USING btree (status);
CREATE INDEX IF NOT EXISTS fee_discounts_institution_idx ON public.fee_discounts USING btree (institution_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS fee_discounts_code_key ON public.fee_discounts USING btree (institution_id, lower(code)) WHERE (code IS NOT NULL);
CREATE INDEX IF NOT EXISTS fee_discount_allotments_student_idx ON public.fee_discount_allotments USING btree (student_id);
CREATE INDEX IF NOT EXISTS fee_discount_allotments_discount_idx ON public.fee_discount_allotments USING btree (discount_id, academic_year_id);
CREATE UNIQUE INDEX IF NOT EXISTS fee_discount_allotments_unique ON public.fee_discount_allotments USING btree (discount_id, student_id);
CREATE INDEX IF NOT EXISTS expenses_spent_on_idx ON public.expenses USING btree (spent_on DESC);

CREATE INDEX IF NOT EXISTS idx_exam_subjects_exam ON public.exam_subjects USING btree (exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON public.exam_results USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_subject ON public.exam_results USING btree (exam_subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance USING btree (student_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_section_date ON public.attendance USING btree (section_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance USING btree (attendance_date);
CREATE INDEX IF NOT EXISTS assignments_section_idx ON public.assignments USING btree (section_id);
CREATE INDEX IF NOT EXISTS assignments_due_date_idx ON public.assignments USING btree (due_date);

CREATE INDEX IF NOT EXISTS download_contents_publish_idx ON public.download_contents USING btree (publish_date DESC);
CREATE INDEX IF NOT EXISTS notices_publish_idx ON public.notices USING btree (publish_date DESC);
CREATE INDEX IF NOT EXISTS library_issues_status_idx ON public.library_issues USING btree (status);
CREATE INDEX IF NOT EXISTS messages_recipient_idx ON public.messages USING btree (recipient_id);
CREATE INDEX IF NOT EXISTS messages_created_idx ON public.messages USING btree (created_at DESC);