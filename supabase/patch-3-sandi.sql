-- Jalankan sekali di Supabase SQL Editor (setelah patch-2-oauth.sql).
-- Menandai akun yang wajib mengganti kata sandi bawaan pada login pertama.
alter table profiles add column if not exists wajib_ganti_sandi boolean not null default false;
