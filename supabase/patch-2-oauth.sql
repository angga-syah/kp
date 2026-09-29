-- Jalankan sekali di Supabase SQL Editor (setelah schema.sql dan patch-1).
-- Akun yang mendaftar sendiri (mis. lewat Google) tidak aktif sampai admin mengaktifkan.

alter table profiles add column if not exists aktif boolean not null default false;
update profiles set aktif = true;  -- semua akun yang sudah ada tetap aktif

create or replace function is_active() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and aktif);
$$;

-- is_staff / current_role_is hanya berlaku untuk akun aktif
create or replace function current_role_is(r app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and aktif and role = r);
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and aktif and role in ('admin', 'guru'));
$$;

-- data referensi hanya dapat dibaca akun aktif (sebelumnya: semua yang login)
drop policy if exists "baca" on tahun_ajaran;
drop policy if exists "baca" on guru;
drop policy if exists "baca" on kelas;
drop policy if exists "baca" on mapel;
drop policy if exists "baca" on jadwal;
drop policy if exists "baca" on asesmen_soal;
drop policy if exists "baca" on info_karier;
create policy "baca" on tahun_ajaran for select using (is_active());
create policy "baca" on guru for select using (is_active());
create policy "baca" on kelas for select using (is_active());
create policy "baca" on mapel for select using (is_active());
create policy "baca" on jadwal for select using (is_active());
create policy "baca" on asesmen_soal for select using (is_active());
create policy "baca" on info_karier for select using (is_active());

-- profil sendiri tetap terbaca (agar aplikasi tahu statusnya), tetapi hanya admin aktif yang mengubah
drop policy if exists "profil sendiri" on profiles;
create policy "profil sendiri" on profiles for select using (id = auth.uid() or is_staff());
