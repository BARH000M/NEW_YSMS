-- 006_messaging_forward.sql
-- Internal messaging between the school office and staff / teachers / students / parents.
-- Applied to the Readdy Backend on 2026-10-28.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  sender_id uuid,
  sender_name text not null default 'School Office',
  sender_role text,
  subject text not null,
  body text not null,
  audience text not null default 'all', -- all | staff | teachers | students | parents | user
  recipient_id uuid,                   -- set only when audience = 'user'
  created_at timestamptz not null default now()
);

create index if not exists messages_created_idx on public.messages (created_at desc);
create index if not exists messages_recipient_idx on public.messages (recipient_id);

create table if not exists public.message_reads (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.messages enable row level security;
alter table public.message_reads enable row level security;

-- A message is readable by its sender, its single recipient, or anybody whose
-- active role matches the audience. Students and parents never see staff traffic.
create policy messages_read on public.messages for select using (
  sender_id = auth.uid()
  or recipient_id = auth.uid()
  or audience = 'all'
  or (audience = 'staff' and exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','teacher','accountant','receptionist','librarian'])))
  or (audience = 'teachers' and exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = 'teacher'))
  or (audience = 'students' and exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = 'student'))
  or (audience = 'parents' and exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = 'parent'))
);

create policy messages_insert on public.messages for insert
  with check (auth.uid() is not null and sender_id = auth.uid());

create policy messages_delete on public.messages for delete using (
  sender_id = auth.uid()
  or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin']))
);

create policy message_reads_own on public.message_reads for select using (user_id = auth.uid());
create policy message_reads_insert_own on public.message_reads for insert with check (user_id = auth.uid());