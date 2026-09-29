-- Soal asesmen minat (model RIASEC, skala 1-5). Jalankan sekali setelah schema.sql.
insert into asesmen_soal (pertanyaan, kategori, urutan) values
  ('Saya senang memperbaiki atau merakit sesuatu dengan tangan.', 'realistik', 1),
  ('Saya lebih suka bekerja di luar ruangan atau dengan peralatan.', 'realistik', 2),
  ('Saya senang mencari tahu penyebab suatu masalah.', 'investigatif', 3),
  ('Saya tertarik pada sains, riset, atau eksperimen.', 'investigatif', 4),
  ('Saya senang menulis, menggambar, atau berkarya kreatif.', 'artistik', 5),
  ('Saya suka mengungkapkan ide dengan cara yang orisinal.', 'artistik', 6),
  ('Saya senang membantu dan mengajari orang lain.', 'sosial', 7),
  ('Saya nyaman mendengarkan masalah teman.', 'sosial', 8),
  ('Saya senang memimpin dan meyakinkan orang lain.', 'enterprising', 9),
  ('Saya tertarik memulai usaha sendiri.', 'enterprising', 10),
  ('Saya suka pekerjaan yang rapi, terstruktur, dan berurutan.', 'konvensional', 11),
  ('Saya teliti dalam mengelola data atau administrasi.', 'konvensional', 12);

-- Admin pertama: daftarkan user lewat Supabase Auth, lalu:
-- update profiles set role = 'admin' where id = '<uuid-user>';
