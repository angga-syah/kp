-- Jalankan sekali di Supabase SQL Editor (setelah patch-4-profil.sql).
-- Menambah peran Guru BK. BK mengelola konseling, asesmen minat, dan info karier;
-- presensi dan nilai tetap hanya diisi admin dan guru.
-- Nilai enum baru tidak boleh dipakai dalam transaksi yang sama, jadi fungsi di bawah membandingkan role::text.

alter type app_role add value if not exists 'bk';

-- pegawai (boleh membaca data siswa, presensi, nilai, konseling, alumni, tracer)
create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and aktif and role::text in ('admin', 'guru', 'bk'));
$$;

create or replace function is_pengajar() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and aktif and role::text in ('admin', 'guru'));
$$;

create or replace function is_pengelola_bk() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and aktif and role::text in ('admin', 'bk'));
$$;

-- presensi & nilai: hanya pengajar yang menulis
drop policy if exists "presensi staf tulis" on presensi;
create policy "presensi staf tulis" on presensi for all using (is_pengajar()) with check (is_pengajar());
drop policy if exists "nilai staf tulis" on nilai;
create policy "nilai staf tulis" on nilai for all using (is_pengajar()) with check (is_pengajar());

-- konseling: hanya admin dan BK yang menjadwalkan/mencatat
drop policy if exists "konseling staf ubah" on konseling;
create policy "konseling staf ubah" on konseling for update using (is_pengelola_bk());

-- soal asesmen dan info karier: admin dan BK
drop policy if exists "bk kelola" on asesmen_soal;
create policy "bk kelola" on asesmen_soal for all using (is_pengelola_bk()) with check (is_pengelola_bk());
drop policy if exists "staf" on info_karier;
create policy "staf" on info_karier for all using (is_pengelola_bk()) with check (is_pengelola_bk());
