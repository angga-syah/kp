import { PENGELOLA_BK, STAF, type Role } from "@/lib/roles";

export type Field = {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "time" | "textarea" | "select";
  required?: boolean;
  options?: { value: string; label: string }[];
  ref?: { table: string; label: string };
  cast?: "int" | "bool";
  short?: string;
  wide?: boolean;
  /** kelompok di formulir, mis. "Identitas" */
  grup?: string;
  hint?: string;
  placeholder?: string;
  /** nilai awal di formulir tambah */
  bawaan?: string;
  /** dibawa ke formulir berikutnya pada "Simpan dan tambah lagi" */
  ingat?: boolean;
};

export type Resource = {
  table: string;
  title: string;
  read: Role[];
  write: Role[];
  order: string;
  fields: Field[];
  list: string[];
  order2?: string;
  filters?: string[];
  bulk?: string[];
  groupBy?: string;
  importable?: boolean;
};

const staff: Role[] = STAF;
const admin: Role[] = ["admin"];

export const resources: Record<string, Resource> = {
  "tahun-ajaran": {
    table: "tahun_ajaran",
    title: "Tahun ajaran",
    read: staff,
    write: admin,
    order: "id",
    list: ["nama", "semester", "aktif"],
    fields: [
      { name: "nama", label: "Nama (mis. 2026/2027)", type: "text", required: true },
      {
        name: "semester",
        label: "Semester",
        type: "select",
        required: true,
        cast: "int",
        options: [
          { value: "1", label: "Ganjil" },
          { value: "2", label: "Genap" },
        ],
      },
      {
        name: "aktif",
        label: "Aktif",
        type: "select",
        cast: "bool",
        options: [
          { value: "false", label: "Tidak" },
          { value: "true", label: "Ya" },
        ],
      },
    ],
  },
  guru: {
    table: "guru",
    title: "Guru",
    read: staff,
    write: admin,
    order: "nama",
    list: ["nama", "tugas", "no_hp", "nip"],
    fields: [
      { name: "nama", label: "Nama", type: "text", required: true },
      { name: "nip", label: "NIP", type: "text" },
      { name: "no_hp", label: "No. HP", type: "text" },
      { name: "tugas", label: "Tugas (mis. Guru BK, Guru Mapel: Fiqih)", type: "text" },
    ],
  },
  kelas: {
    table: "kelas",
    title: "Kelas",
    read: staff,
    write: admin,
    order: "nama",
    list: ["nama", "tingkat", "jurusan", "wali_guru_id", "tahun_ajaran_id"],
    fields: [
      { name: "nama", label: "Nama kelas", type: "text", required: true },
      {
        name: "tingkat",
        label: "Tingkat",
        type: "select",
        required: true,
        cast: "int",
        options: [
          { value: "10", label: "X" },
          { value: "11", label: "XI" },
          { value: "12", label: "XII" },
        ],
      },
      { name: "jurusan", label: "Jurusan", type: "text" },
      { name: "wali_guru_id", label: "Wali kelas", type: "select", cast: "int", ref: { table: "guru", label: "nama" } },
      { name: "tahun_ajaran_id", label: "Tahun ajaran", type: "select", required: true, cast: "int", ref: { table: "tahun_ajaran", label: "nama" } },
    ],
  },
  mapel: {
    table: "mapel",
    title: "Mata pelajaran",
    read: staff,
    write: admin,
    order: "kode",
    list: ["kode", "nama"],
    fields: [
      { name: "kode", label: "Kode", type: "text", required: true },
      { name: "nama", label: "Nama", type: "text", required: true },
    ],
  },
  siswa: {
    table: "siswa",
    title: "Siswa",
    read: staff,
    write: admin,
    order: "nama",
    list: ["nisn", "nama", "kelas_id", "status", "tahun_lulus"],
    fields: [
      { name: "nama", label: "Nama", type: "text", required: true },
      { name: "nisn", label: "NISN", type: "text" },
      { name: "nis", label: "NIS", type: "text" },
      {
        name: "jenis_kelamin",
        label: "Jenis kelamin",
        type: "select",
        options: [
          { value: "L", label: "Laki-laki" },
          { value: "P", label: "Perempuan" },
        ],
      },
      { name: "tempat_lahir", label: "Tempat lahir", type: "text" },
      { name: "tanggal_lahir", label: "Tanggal lahir", type: "date" },
      { name: "alamat", label: "Alamat", type: "textarea" },
      { name: "no_hp", label: "No. HP", type: "text" },
      { name: "nama_ayah", label: "Nama ayah", type: "text" },
      { name: "nama_ibu", label: "Nama ibu", type: "text" },
      { name: "nama_wali", label: "Nama wali", type: "text" },
      { name: "kelas_id", label: "Kelas", type: "select", cast: "int", ref: { table: "kelas", label: "nama" } },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "aktif", label: "Aktif" },
          { value: "lulus", label: "Lulus" },
          { value: "pindah", label: "Pindah" },
          { value: "keluar", label: "Keluar" },
        ],
      },
      { name: "tahun_lulus", label: "Tahun lulus", type: "number" },
    ],
  },
  jadwal: {
    table: "jadwal",
    title: "Jadwal pelajaran",
    read: staff,
    write: admin,
    order: "hari",
    list: ["kelas_id", "hari", "jam_mulai", "jam_selesai", "mapel_id", "guru_id"],
    fields: [
      { name: "kelas_id", label: "Kelas", type: "select", required: true, cast: "int", ref: { table: "kelas", label: "nama" } },
      { name: "mapel_id", label: "Mata pelajaran", type: "select", required: true, cast: "int", ref: { table: "mapel", label: "nama" } },
      { name: "guru_id", label: "Guru", type: "select", cast: "int", ref: { table: "guru", label: "nama" } },
      {
        name: "hari",
        label: "Hari",
        type: "select",
        required: true,
        cast: "int",
        options: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map((h, i) => ({
          value: String(i + 1),
          label: h,
        })),
      },
      { name: "jam_mulai", label: "Jam mulai", type: "time", required: true },
      { name: "jam_selesai", label: "Jam selesai", type: "time", required: true },
    ],
  },
  alumni: {
    table: "alumni",
    title: "Alumni",
    read: staff,
    write: admin,
    order: "nama",
    list: ["nama", "tahun_lulus", "no_hp", "email"],
    fields: [
      { name: "nama", label: "Nama", type: "text", required: true },
      { name: "tahun_lulus", label: "Tahun lulus", type: "number", required: true },
      { name: "no_hp", label: "No. HP", type: "text" },
      { name: "email", label: "Email", type: "text" },
    ],
  },
  "info-karier": {
    table: "info_karier",
    title: "Info karier",
    read: staff,
    write: PENGELOLA_BK,
    order: "id",
    list: ["jenis", "judul", "kategori_riasec", "batas_waktu"],
    fields: [
      {
        name: "jenis",
        label: "Jenis",
        type: "select",
        required: true,
        options: [
          { value: "kampus", label: "Kampus" },
          { value: "beasiswa", label: "Beasiswa" },
          { value: "karier", label: "Karier" },
        ],
      },
      { name: "judul", label: "Judul", type: "text", required: true },
      { name: "deskripsi", label: "Deskripsi", type: "textarea" },
      { name: "tautan", label: "Tautan", type: "text" },
      { name: "batas_waktu", label: "Batas waktu", type: "date" },
      {
        name: "kategori_riasec",
        label: "Cocok untuk tipe",
        type: "select",
        options: ["realistik", "investigatif", "artistik", "sosial", "enterprising", "konvensional"].map((k) => ({
          value: k,
          label: k[0].toUpperCase() + k.slice(1),
        })),
      },
    ],
  },
  "konten-profil": {
    table: "konten_profil",
    title: "Profil madrasah",
    read: staff,
    write: admin,
    order: "bagian",
    list: ["bagian", "isi", "urutan"],
    fields: [
      {
        name: "bagian",
        label: "Bagian di halaman utama",
        type: "select",
        required: true,
        options: [
          { value: "profil", label: "Profil" },
          { value: "sambutan", label: "Sambutan kepala madrasah" },
          { value: "visi", label: "Visi" },
          { value: "misi", label: "Misi" },
          { value: "program", label: "Program unggulan" },
          { value: "fasilitas", label: "Fasilitas" },
          { value: "ekstrakurikuler", label: "Ekstrakurikuler" },
          { value: "kontak", label: "Kontak" },
        ],
      },
      { name: "judul", label: "Judul (opsional)", type: "text" },
      { name: "isi", label: "Isi", type: "textarea", required: true },
      { name: "urutan", label: "Urutan", type: "number" },
    ],
  },
  prestasi: {
    table: "prestasi",
    title: "Prestasi",
    read: staff,
    write: admin,
    order: "tahun",
    list: ["tahun", "judul", "tingkat"],
    fields: [
      { name: "tahun", label: "Tahun", type: "number", required: true },
      { name: "judul", label: "Prestasi", type: "text", required: true },
      {
        name: "tingkat",
        label: "Tingkat",
        type: "select",
        options: ["madrasah", "kecamatan", "kabupaten", "provinsi", "nasional", "internasional"].map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1) })),
      },
      { name: "keterangan", label: "Keterangan (opsional)", type: "textarea" },
    ],
  },
  pengumuman: {
    table: "pengumuman",
    title: "Pengumuman",
    read: staff,
    write: staff,
    order: "id",
    list: ["judul"],
    fields: [
      { name: "judul", label: "Judul", type: "text", required: true },
      { name: "isi", label: "Isi", type: "textarea", required: true },
    ],
  },
  "soal-asesmen": {
    table: "asesmen_soal",
    title: "Soal asesmen minat",
    read: staff,
    write: PENGELOLA_BK,
    order: "urutan",
    list: ["urutan", "pertanyaan", "kategori"],
    fields: [
      { name: "pertanyaan", label: "Pernyataan", type: "textarea", required: true },
      {
        name: "kategori",
        label: "Tipe",
        type: "select",
        required: true,
        options: ["realistik", "investigatif", "artistik", "sosial", "enterprising", "konvensional"].map((k) => ({
          value: k,
          label: k[0].toUpperCase() + k.slice(1),
        })),
      },
      { name: "urutan", label: "Urutan", type: "number" },
    ],
  },
};

type Meta = {
  short?: Record<string, string>;
  wide?: string[];
  filters?: string[];
  bulk?: string[];
  groupBy?: string;
  order2?: string;
  importable?: boolean;
  list?: string[];
};

const META: Record<string, Meta> = {
  guru: { short: { tugas: "Tugas", no_hp: "No. HP" }, wide: ["nama", "tugas"] },
  kelas: { filters: ["tingkat", "tahun_ajaran_id"], short: { wali_guru_id: "Wali kelas", tahun_ajaran_id: "Tahun ajaran" } },
  siswa: {
    list: ["nama", "nis", "nisn", "kelas_id", "status"],
    filters: ["kelas_id", "status", "jenis_kelamin"],
    bulk: ["kelas_id", "status"],
    groupBy: "kelas_id",
    short: { nis: "NIS / ID", nisn: "NISN", kelas_id: "Kelas" },
    wide: ["nama", "alamat"],
    importable: false,
  },
  jadwal: {
    filters: ["kelas_id", "hari", "guru_id"],
    groupBy: "kelas_id",
    order2: "jam_mulai",
    short: { kelas_id: "Kelas", mapel_id: "Mata pelajaran", guru_id: "Guru", jam_mulai: "Mulai", jam_selesai: "Selesai" },
  },
  alumni: { short: { tahun_lulus: "Lulus" } },
  "info-karier": { filters: ["jenis", "kategori_riasec"], wide: ["judul", "tautan"], short: { kategori_riasec: "Tipe minat", batas_waktu: "Batas" } },
  "konten-profil": { filters: ["bagian"], wide: ["judul"], importable: false },
  prestasi: { filters: ["tingkat"], wide: ["judul"] },
  pengumuman: { wide: ["judul"], importable: false },
  "soal-asesmen": { filters: ["kategori"], wide: ["pertanyaan"], short: { pertanyaan: "Pernyataan", kategori: "Tipe" } },
};

for (const [k, m] of Object.entries(META)) {
  const r = resources[k];
  if (!r) continue;
  if (m.list) r.list = m.list;
  if (m.filters) r.filters = m.filters;
  if (m.bulk) r.bulk = m.bulk;
  if (m.groupBy) r.groupBy = m.groupBy;
  if (m.order2) r.order2 = m.order2;
  if (m.importable !== undefined) r.importable = m.importable;
  for (const f of r.fields) {
    if (m.short?.[f.name]) f.short = m.short[f.name];
    if (m.wide?.includes(f.name)) f.wide = true;
  }
}

// Petunjuk formulir: kelompok, contoh isian, dan nilai bawaan agar formulir mudah diisi.
const FORM: Record<string, Record<string, Partial<Field>>> = {
  siswa: {
    nama: { grup: "Identitas", placeholder: "Nama lengkap sesuai ijazah" },
    nisn: { grup: "Identitas", placeholder: "0012345678", hint: "10 angka, lihat di EMIS." },
    nis: { grup: "Identitas", hint: "Nomor induk madrasah, boleh kosong." },
    jenis_kelamin: { grup: "Identitas" },
    tempat_lahir: { grup: "Identitas", placeholder: "Mis. Lebak" },
    tanggal_lahir: { grup: "Identitas", hint: "Pastikan benar; dipakai untuk akun siswa." },
    alamat: { grup: "Kontak dan orang tua", placeholder: "Kampung, desa, kecamatan" },
    no_hp: { grup: "Kontak dan orang tua", placeholder: "08…" },
    nama_ayah: { grup: "Kontak dan orang tua" },
    nama_ibu: { grup: "Kontak dan orang tua" },
    nama_wali: { grup: "Kontak dan orang tua", hint: "Isi bila siswa tinggal bersama wali." },
    kelas_id: { grup: "Sekolah", ingat: true },
    status: { grup: "Sekolah", bawaan: "aktif", required: true },
    tahun_lulus: { grup: "Sekolah", hint: "Isi hanya bila sudah lulus." },
  },
  guru: {
    nama: { placeholder: "Nama lengkap dengan gelar" },
    nip: { hint: "Boleh kosong." },
    no_hp: { placeholder: "08…" },
    tugas: { placeholder: "Mis. Guru mapel: Fiqih; wali kelas X" },
  },
  kelas: {
    nama: { placeholder: "Mis. X MIA", hint: "Awali dengan X, XI, atau XII." },
    tahun_ajaran_id: { ingat: true },
  },
  mapel: { kode: { placeholder: "Mis. C" }, nama: { placeholder: "Mis. Fiqih" } },
  jadwal: {
    kelas_id: { ingat: true },
    hari: { ingat: true },
    jam_mulai: { hint: "Contoh 07:15" },
    guru_id: { hint: "Kosongkan bila belum ada gurunya." },
  },
  "tahun-ajaran": { nama: { placeholder: "2026/2027" }, aktif: { hint: "Hanya satu tahun ajaran yang aktif." } },
  pengumuman: { judul: { placeholder: "Mis. Libur Maulid Nabi" }, isi: { hint: "Tampil di halaman utama portal." } },
  "info-karier": { tautan: { placeholder: "https://…", hint: "Alamat situs resmi, bila ada." }, batas_waktu: { hint: "Batas pendaftaran, bila ada." } },
  alumni: { email: { placeholder: "nama@gmail.com" }, no_hp: { placeholder: "08…" } },
  prestasi: { judul: { placeholder: "Mis. Juara 1 Lomba Pramuka Kabupaten" } },
  "konten-profil": {
    bagian: { hint: "Misi, program, fasilitas: satu butir per data." },
    urutan: { hint: "Angka kecil tampil lebih dulu." },
  },
};
for (const [k, fields] of Object.entries(FORM)) {
  for (const f of resources[k]?.fields ?? []) Object.assign(f, fields[f.name] ?? {});
}
// Kolom NIS berisi nomor sementara; cukup NISN di daftar.
resources.siswa.list = ["nama", "nisn", "kelas_id", "status"];

export const labelKolom = (r: Resource, name: string) => {
  const f = r.fields.find((x) => x.name === name);
  return f?.short ?? f?.label ?? name;
};
