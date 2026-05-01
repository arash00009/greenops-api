create table if not exists leads (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  name text,
  email text not null,
  message text
);

