-- Jalankan sekali di Supabase SQL Editor (setelah patch-5-bk.sql).
-- Kolom tambahan dari data EMIS. NIK sengaja tidak disimpan (tidak dipakai portal, data pribadi sensitif).
alter table siswa
  add column if not exists tempat_lahir text,
  add column if not exists no_hp text,
  add column if not exists nama_ayah text,
  add column if not exists nama_ibu text,
  add column if not exists nama_wali text;
