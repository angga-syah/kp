-- MA Al-Riyadhul Janah: akademik, career guidance, tracer study
-- Jalankan di Supabase SQL Editor.

create type app_role as enum ('admin', 'guru', 'siswa', 'alumni');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role app_role not null default 'siswa',
  nama text not null,
  created_at timestamptz not null default now()
);

create or replace function current_role_is(r app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = r);
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'guru'));
$$;

-- AKADEMIK
create table tahun_ajaran (
  id serial primary key,
  nama text not null unique,
  semester smallint not null check (semester in (1, 2)),
  aktif boolean not null default false
);

create table guru (
  id serial primary key,
  profile_id uuid unique references profiles on delete set null,
  nip text unique,
  nama text not null,
  no_hp text
);

create table kelas (
  id serial primary key,
  nama text not null,
  tingkat smallint not null check (tingkat in (10, 11, 12)),
  jurusan text,
  wali_guru_id int references guru on delete set null,
  tahun_ajaran_id int not null references tahun_ajaran on delete cascade,
  unique (nama, tahun_ajaran_id)
);

create table siswa (
  id serial primary key,
  profile_id uuid unique references profiles on delete set null,
  nisn text unique,
  nis text unique,
  nama text not null,
  jenis_kelamin char(1) check (jenis_kelamin in ('L', 'P')),
  tanggal_lahir date,
  alamat text,
  kelas_id int references kelas on delete set null,
  status text not null default 'aktif' check (status in ('aktif', 'lulus', 'pindah', 'keluar')),
  tahun_lulus smallint
);

create table mapel (
  id serial primary key,
  kode text unique not null,
  nama text not null
);

create table jadwal (
  id serial primary key,
  kelas_id int not null references kelas on delete cascade,
  mapel_id int not null references mapel on delete cascade,
  guru_id int references guru on delete set null,
  hari smallint not null check (hari between 1 and 6),
  jam_mulai time not null,
  jam_selesai time not null
);

create table presensi (
  id bigserial primary key,
  siswa_id int not null references siswa on delete cascade,
  tanggal date not null,
  status text not null check (status in ('hadir', 'izin', 'sakit', 'alpa')),
  keterangan text,
  unique (siswa_id, tanggal)
);

create table nilai (
  id bigserial primary key,
  siswa_id int not null references siswa on delete cascade,
  mapel_id int not null references mapel on delete cascade,
  tahun_ajaran_id int not null references tahun_ajaran on delete cascade,
  tugas numeric(5, 2),
  uts numeric(5, 2),
  uas numeric(5, 2),
  unique (siswa_id, mapel_id, tahun_ajaran_id)
);

-- CAREER GUIDANCE
create table asesmen_soal (
  id serial primary key,
  pertanyaan text not null,
  kategori text not null check (kategori in ('realistik', 'investigatif', 'artistik', 'sosial', 'enterprising', 'konvensional')),
  urutan int not null default 0
);

create table asesmen_hasil (
  id bigserial primary key,
  siswa_id int not null references siswa on delete cascade,
  skor jsonb not null,
  kategori_dominan text not null,
  created_at timestamptz not null default now()
);

create table info_karier (
  id serial primary key,
  jenis text not null check (jenis in ('kampus', 'beasiswa', 'karier')),
  judul text not null,
  deskripsi text,
  tautan text,
  batas_waktu date,
  kategori_riasec text,
  created_at timestamptz not null default now()
);

create table konseling (
  id bigserial primary key,
  siswa_id int not null references siswa on delete cascade,
  guru_id int references guru on delete set null,
  topik text not null,
  jadwal timestamptz,
  status text not null default 'diajukan' check (status in ('diajukan', 'dijadwalkan', 'selesai', 'batal')),
  catatan text,
  created_at timestamptz not null default now()
);

-- TRACER STUDY
create table alumni (
  id serial primary key,
  profile_id uuid unique references profiles on delete set null,
  siswa_id int unique references siswa on delete set null,
  nama text not null,
  tahun_lulus smallint not null,
  no_hp text,
  email text
);

create table tracer_respons (
  id bigserial primary key,
  alumni_id int not null references alumni on delete cascade,
  tahun_isi smallint not null,
  status text not null check (status in ('kuliah', 'bekerja', 'wirausaha', 'mencari_kerja', 'lainnya')),
  institusi text,
  bidang text,
  jabatan_prodi text,
  penghasilan_range text,
  relevansi smallint check (relevansi between 1 and 5),
  masukan text,
  created_at timestamptz not null default now(),
  unique (alumni_id, tahun_isi)
);

-- RLS
alter table profiles enable row level security;
alter table tahun_ajaran enable row level security;
alter table guru enable row level security;
alter table kelas enable row level security;
alter table siswa enable row level security;
alter table mapel enable row level security;
alter table jadwal enable row level security;
alter table presensi enable row level security;
alter table nilai enable row level security;
alter table asesmen_soal enable row level security;
alter table asesmen_hasil enable row level security;
alter table info_karier enable row level security;
alter table konseling enable row level security;
alter table alumni enable row level security;
alter table tracer_respons enable row level security;

create policy "profil sendiri" on profiles for select using (id = auth.uid() or is_staff());
create policy "admin kelola profil" on profiles for all using (current_role_is('admin'));

-- referensi: semua login boleh baca, admin tulis
create policy "baca" on tahun_ajaran for select using (auth.uid() is not null);
create policy "admin" on tahun_ajaran for all using (current_role_is('admin'));
create policy "baca" on guru for select using (auth.uid() is not null);
create policy "admin" on guru for all using (current_role_is('admin'));
create policy "baca" on kelas for select using (auth.uid() is not null);
create policy "admin" on kelas for all using (current_role_is('admin'));
create policy "baca" on mapel for select using (auth.uid() is not null);
create policy "admin" on mapel for all using (current_role_is('admin'));
create policy "baca" on jadwal for select using (auth.uid() is not null);
create policy "admin" on jadwal for all using (current_role_is('admin'));
create policy "baca" on asesmen_soal for select using (auth.uid() is not null);
create policy "admin" on asesmen_soal for all using (current_role_is('admin'));
create policy "baca" on info_karier for select using (auth.uid() is not null);
create policy "staf" on info_karier for all using (is_staff());

-- siswa & data turunannya
create policy "siswa lihat diri/staf" on siswa for select
  using (profile_id = auth.uid() or is_staff());
create policy "admin" on siswa for all using (current_role_is('admin'));

create policy "presensi baca" on presensi for select
  using (is_staff() or siswa_id in (select id from siswa where profile_id = auth.uid()));
create policy "presensi staf tulis" on presensi for all using (is_staff());

create policy "nilai baca" on nilai for select
  using (is_staff() or siswa_id in (select id from siswa where profile_id = auth.uid()));
create policy "nilai staf tulis" on nilai for all using (is_staff());

create policy "asesmen hasil baca" on asesmen_hasil for select
  using (is_staff() or siswa_id in (select id from siswa where profile_id = auth.uid()));
create policy "asesmen hasil isi sendiri" on asesmen_hasil for insert
  with check (siswa_id in (select id from siswa where profile_id = auth.uid()));

create policy "konseling baca" on konseling for select
  using (is_staff() or siswa_id in (select id from siswa where profile_id = auth.uid()));
create policy "konseling ajukan" on konseling for insert
  with check (siswa_id in (select id from siswa where profile_id = auth.uid()));
create policy "konseling staf ubah" on konseling for update using (is_staff());

-- alumni & tracer
create policy "alumni baca" on alumni for select
  using (profile_id = auth.uid() or is_staff());
create policy "alumni admin" on alumni for all using (current_role_is('admin'));

create policy "tracer baca" on tracer_respons for select
  using (is_staff() or alumni_id in (select id from alumni where profile_id = auth.uid()));
create policy "tracer isi sendiri" on tracer_respons for insert
  with check (alumni_id in (select id from alumni where profile_id = auth.uid()));
create policy "tracer ubah sendiri" on tracer_respons for update
  using (alumni_id in (select id from alumni where profile_id = auth.uid()));

-- profil otomatis saat user baru dibuat
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, nama, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'nama', split_part(new.email, '@', 1)), 'siswa');
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
