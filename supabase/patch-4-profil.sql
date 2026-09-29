-- Jalankan sekali di Supabase SQL Editor (setelah patch-3-sandi.sql).
-- Profil madrasah publik (halaman utama), prestasi, statistik publik, dan kolom tugas guru.

alter table guru add column if not exists tugas text;

create table if not exists konten_profil (
  id serial primary key,
  bagian text not null check (bagian in ('profil','sambutan','visi','misi','program','fasilitas','ekstrakurikuler','kontak')),
  judul text,
  isi text not null,
  urutan int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists prestasi (
  id serial primary key,
  tahun smallint not null,
  judul text not null,
  tingkat text check (tingkat in ('madrasah','kecamatan','kabupaten','provinsi','nasional','internasional')),
  keterangan text,
  created_at timestamptz not null default now()
);

alter table konten_profil enable row level security;
alter table prestasi enable row level security;
drop policy if exists "publik baca" on konten_profil;
drop policy if exists "admin kelola" on konten_profil;
drop policy if exists "publik baca" on prestasi;
drop policy if exists "admin kelola" on prestasi;
create policy "publik baca" on konten_profil for select using (true);
create policy "admin kelola" on konten_profil for all using (current_role_is('admin'));
create policy "publik baca" on prestasi for select using (true);
create policy "admin kelola" on prestasi for all using (current_role_is('admin'));

-- angka ringkas untuk halaman utama, tanpa membuka data pribadi
create or replace function statistik_publik() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'siswa',  (select count(*) from siswa where status = 'aktif'),
    'guru',   (select count(*) from guru),
    'kelas',  (select count(*) from kelas),
    'alumni', (select count(*) from alumni)
  );
$$;
grant execute on function statistik_publik() to anon, authenticated;

-- isi awal: hanya fakta dari surat balasan dan logo madrasah
insert into konten_profil (bagian, judul, isi, urutan)
select * from (values
  ('profil', 'Tentang madrasah',
   'Madrasah Aliyah Al-Riyadhul Janah adalah madrasah aliyah swasta di bawah naungan Yayasan Pendidikan Islam Al-Riyadhul Janah, berlokasi di Maja, Kabupaten Lebak, Banten. Madrasah terakreditasi B (BAN-SM Nomor 1346/BAN-SM/SK/2021).', 1),
  ('profil', 'Kepala madrasah', 'Aip Bustanil Arifin, S.Pd.I', 2)
) as v(bagian, judul, isi, urutan)
where not exists (select 1 from konten_profil);
