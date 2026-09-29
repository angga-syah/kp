-- Jalankan sekali di Supabase SQL Editor (setelah patch-5-bk.sql).
-- Guru BK juga mengajar (dan bisa menjadi wali kelas), jadi boleh mengisi presensi dan nilai.
create or replace function is_pengajar() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and aktif and role::text in ('admin', 'guru', 'bk'));
$$;
