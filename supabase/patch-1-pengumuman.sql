-- Jalankan sekali di Supabase SQL Editor (setelah schema.sql).
create table pengumuman (
  id serial primary key,
  judul text not null,
  isi text not null,
  dibuat_oleh uuid default auth.uid() references profiles on delete set null,
  created_at timestamptz not null default now()
);

alter table pengumuman enable row level security;
create policy "publik baca" on pengumuman for select using (true);
create policy "staf kelola" on pengumuman for all using (is_staff());
