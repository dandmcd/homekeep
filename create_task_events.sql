-- Create task_events table
create table public.task_events (
  id uuid not null default gen_random_uuid (),
  user_task_id uuid not null references user_tasks (id) on delete cascade,
  due_date date not null,
  completed_at timestamp with time zone null,
  status text not null default 'pending'::text check (status in ('pending', 'completed', 'skipped')),
  created_at timestamp with time zone not null default now(),
  constraint task_events_pkey primary key (id)
);

-- Enable RLS
alter table public.task_events enable row level security;

-- Policies
create policy "Enable read access for users based on user_task_id"
on public.task_events
for select
to authenticated
using (
  exists (
    select 1 from user_tasks
    where user_tasks.id = task_events.user_task_id
    and user_tasks.user_id = auth.uid()
  )
);

create policy "Enable insert for users based on user_task_id"
on public.task_events
for insert
to authenticated
with check (
  exists (
    select 1 from user_tasks
    where user_tasks.id = task_events.user_task_id
    and user_tasks.user_id = auth.uid()
  )
);

create policy "Enable update for users based on user_task_id"
on public.task_events
for update
to authenticated
using (
  exists (
    select 1 from user_tasks
    where user_tasks.id = task_events.user_task_id
    and user_tasks.user_id = auth.uid()
  )
);

create policy "Enable delete for users based on user_task_id"
on public.task_events
for delete
to authenticated
using (
  exists (
    select 1 from user_tasks
    where user_tasks.id = task_events.user_task_id
    and user_tasks.user_id = auth.uid()
  )
);
