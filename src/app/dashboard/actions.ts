"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resources, type Field } from "@/lib/resources";
import { PENGAJAR, PENGELOLA_BK, ROLES, isRole, type Role } from "@/lib/roles";
import { RIASEC } from "@/lib/riasec";
import { kelasBolehIsi, mapelBolehIsi } from "@/lib/akses";
import { DOMAIN_SISWA_LAMA, emailAlias, emailDariLogin, passwordDefault, randomPassword } from "@/lib/akun";
import { loadOptions } from "@/lib/resource-data";
import { parseListParams, terapkanFilter } from "@/lib/data-query";
import type { ResetState } from "@/lib/types";
import { hapusProfil } from "@/lib/redis";
import { hariIni, tanggalValid, wibKeIso } from "@/lib/waktu";
import { cellText, jamDariSel, tanggalDariSel } from "@/lib/excel";
import { bacaSiswa, jarakEja, namaKunci, tingkatDariNama } from "@/lib/impor-siswa";

const enc = encodeURIComponent;
const PUBLIK = ["konten-profil", "prestasi", "pengumuman"];
const segarkanBeranda = (key: string) => {
  if (PUBLIK.includes(key)) revalidatePath("/");
};
const str = (v: FormDataEntryValue | null) => (v === null ? "" : String(v).trim());

function castValue(f: Field, raw: FormDataEntryValue | null) {
  const v = str(raw);
  if (v === "") return null;
  if (f.type === "number" || f.cast === "int") return Number(v);
  if (f.cast === "bool") return v === "true";
  return v;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/masuk");
}

export async function createRow(key: string, formData: FormData) {
  const res = resources[key];
  if (!res) redirect("/dashboard");
  await requireRole(res.write);
  const lagi = formData.get("_lagi") === "1";
  const row: Record<string, unknown> = {};
  for (const f of res.fields) {
    const v = castValue(f, formData.get(f.name));
    if (v !== null) row[f.name] = v;
  }
  const supabase = await createClient();
  const { error } = await supabase.from(res.table).insert(row);
  if (error) redirect(`/dashboard/data/${key}/baru?error=${enc(error.message)}`);
  revalidatePath(`/dashboard/data/${key}`);
  segarkanBeranda(key);
  if (lagi) {
    const ingat = new URLSearchParams({ ok: "tambah" });
    for (const f of res.fields) if (f.ingat && row[f.name] != null) ingat.set(f.name, String(row[f.name]));
    redirect(`/dashboard/data/${key}/baru?${ingat}`);
  }
  redirect(`/dashboard/data/${key}?ok=tambah`);
}
export async function deleteRow(key: string, id: string, formData: FormData) {
  const res = resources[key];
  if (!res) redirect("/dashboard");
  await requireRole(res.write);
  const err = await hapusData(key, [id || str(formData.get("id"))]);
  const back = balik(formData, key);
  if (err) redirect(tambahParam(back, "error", err));
  redirect(tambahParam(back, "ok", "hapus"));
}
async function tautkanData(admin: ReturnType<typeof createAdminClient>, id: string, role: Role, nama: string, email: string, tahunLulus: string) {
  if (role === "siswa") await admin.from("siswa").insert({ profile_id: id, nama });
  if (role === "guru") await admin.from("guru").insert({ profile_id: id, nama });
  if (role === "bk") await admin.from("guru").insert({ profile_id: id, nama, tugas: "Guru BK" });
  if (role === "alumni") {
    await admin.from("alumni").insert({ profile_id: id, nama, email, tahun_lulus: Number(tahunLulus) });
  }
}

export async function createUser(formData: FormData) {
  await requireRole(["admin"]);
  const emailInput = str(formData.get("email")).toLowerCase();
  const passwordInput = str(formData.get("password"));
  const nama = str(formData.get("nama"));
  const role = str(formData.get("role"));
  const tahunLulus = str(formData.get("tahun_lulus"));
  const back = "/dashboard/admin/pengguna";
  if (!nama || !isRole(role) || (passwordInput && passwordInput.length < 8)) {
    redirect(`${back}?error=${enc("Lengkapi nama dan peran. Kata sandi (jika diisi) minimal 8 karakter.")}`);
  }
  if (role === "alumni" && !tahunLulus) {
    redirect(`${back}?error=${enc("Tahun lulus wajib untuk alumni.")}`);
  }
  // Tanpa kata sandi: akun hanya bisa dipakai lewat Google (kata sandi acak yang tidak diketahui siapa pun).
  const password = passwordInput || `${crypto.randomUUID()}${crypto.randomUUID()}`;

  const admin = createAdminClient();
  // email kosong → alias Gmail bersama; bila alias sudah dipakai, coba nomor berikutnya
  let email = emailInput;
  let hasil: Awaited<ReturnType<typeof admin.auth.admin.createUser>> | null = null;
  for (let urut = 0; urut < 20; urut++) {
    if (!emailInput) email = emailAlias(`${role}.${nama}`, urut);
    hasil = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nama } });
    const dipakai = hasil.error && /already|exists|registered/i.test(hasil.error.message);
    if (!dipakai || emailInput) break;
  }
  const { data, error } = hasil!;
  if (error || !data.user) redirect(`${back}?error=${enc(error?.message ?? "Gagal membuat akun.")}`);

  const id = data.user.id;
  await admin.from("profiles").update({ role: role as Role, nama, aktif: true, wajib_ganti_sandi: !!passwordInput }).eq("id", id);
  await hapusProfil(id);
  await tautkanData(admin, id, role as Role, nama, email, tahunLulus);
  revalidatePath(back);
  redirect(`${back}?ok=dibuat&email=${enc(email)}`);
}

export async function aktifkanUser(formData: FormData) {
  await requireRole(["admin"]);
  const id = str(formData.get("id"));
  const role = str(formData.get("role"));
  const tahunLulus = str(formData.get("tahun_lulus"));
  const back = "/dashboard/admin/pengguna";
  if (!id || !isRole(role)) redirect(`${back}?error=${enc("Pilih peran.")}`);
  if (role === "alumni" && !tahunLulus) redirect(`${back}?error=${enc("Tahun lulus wajib untuk alumni.")}`);

  const admin = createAdminClient();
  const { data: u } = await admin.auth.admin.getUserById(id);
  const { data: prof } = await admin.from("profiles").select("nama").eq("id", id).single();
  if (!u.user || !prof) redirect(`${back}?error=${enc("Akun tidak ditemukan.")}`);
  const { error } = await admin.from("profiles").update({ role: role as Role, aktif: true }).eq("id", id);
  await hapusProfil(id);
  if (error) redirect(`${back}?error=${enc(error.message)}`);
  await tautkanData(admin, id, role as Role, prof.nama, u.user.email ?? "", tahunLulus);
  revalidatePath(back);
  redirect(`${back}?ok=aktif`);
}

export async function deleteUserById(id: string) {
  await hapusUserTunggal(id);
}
export async function deleteUser(formData: FormData) {
  await hapusUserTunggal(str(formData.get("id")));
}
async function hapusUserTunggal(id: string) {
  const me = await requireRole(["admin"]);
  const back = "/dashboard/admin/pengguna";
  if (id === me.id) redirect(`${back}?error=${enc("Tidak dapat menghapus akun sendiri.")}`);
  const { error } = await createAdminClient().auth.admin.deleteUser(id);
  await hapusProfil(id);
  if (error) redirect(`${back}?error=${enc(error.message)}`);
  revalidatePath(back);
  redirect(back);
}

export async function savePresensi(formData: FormData) {
  const p = await requireRole(PENGAJAR);
  const kelas = Number(str(formData.get("kelas")));
  const tanggal = str(formData.get("tanggal"));
  const back = `/dashboard/presensi?kelas=${kelas}&tanggal=${tanggal}`;
  if (!tanggalValid(tanggal)) redirect(`${back}&error=${enc("Tanggal tidak valid.")}`);
  if (tanggal > hariIni()) redirect(`${back}&error=${enc("Presensi tidak dapat diisi untuk tanggal yang belum tiba.")}`);
  const supabase = await createClient();
  const boleh = await kelasBolehIsi(supabase, p);
  if (boleh && !boleh.includes(kelas)) redirect(`${back}&error=${enc("Anda tidak bertugas di kelas ini.")}`);
  const { data: anggota } = await supabase.from("siswa").select("id").eq("kelas_id", kelas).eq("status", "aktif");
  const valid = new Set((anggota ?? []).map((s) => s.id as number));
  const rows: { siswa_id: number; tanggal: string; status: string; keterangan: string | null }[] = [];
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("status_")) continue;
    const id = Number(k.slice(7));
    const status = String(v);
    const ket = str(formData.get(`ket_${id}`)).slice(0, 200);
    if (valid.has(id) && ["hadir", "izin", "sakit", "alpa"].includes(status)) {
      rows.push({ siswa_id: id, tanggal, status, keterangan: status === "hadir" ? null : ket || null });
    }
  }
  if (rows.length === 0) redirect(back);
  const { error } = await supabase.from("presensi").upsert(rows, { onConflict: "siswa_id,tanggal" });
  if (error) redirect(`${back}&error=${enc(error.message)}`);
  redirect(`${back}&ok=1`);
}
export async function saveNilai(formData: FormData) {
  const p = await requireRole(PENGAJAR);
  const kelas = Number(str(formData.get("kelas")));
  const mapel = Number(str(formData.get("mapel")));
  const back = `/dashboard/nilai?kelas=${kelas}&mapel=${mapel}`;
  const supabase = await createClient();
  const boleh = await kelasBolehIsi(supabase, p);
  if (boleh && !boleh.includes(kelas)) redirect(`${back}&error=${enc("Anda tidak bertugas di kelas ini.")}`);
  const mapelBoleh = await mapelBolehIsi(supabase, p, kelas);
  if (mapelBoleh && !mapelBoleh.includes(mapel)) redirect(`${back}&error=${enc("Anda tidak mengajar mata pelajaran ini di kelas tersebut.")}`);
  const { data: taAktif } = await supabase.from("tahun_ajaran").select("id").eq("aktif", true).limit(1).maybeSingle();
  if (!taAktif) redirect(`${back}&error=${enc("Belum ada tahun ajaran aktif.")}`);
  const ta = taAktif.id as number;
  const { data: anggota } = await supabase.from("siswa").select("id").eq("kelas_id", kelas).eq("status", "aktif");
  const valid = new Set((anggota ?? []).map((s) => s.id as number));
  const byId = new Map<number, Record<string, number | null>>();
  for (const [k, v] of formData.entries()) {
    const m = /^(tugas|uts|uas)_(\d+)$/.exec(k);
    if (!m) continue;
    const id = Number(m[2]);
    if (!valid.has(id)) continue;
    const raw = String(v).trim();
    const n = raw === "" ? null : Number(raw);
    if (n !== null && (Number.isNaN(n) || n < 0 || n > 100)) {
      redirect(`${back}&error=${enc("Nilai harus 0–100.")}`);
    }
    byId.set(id, { ...(byId.get(id) ?? {}), [m[1]]: n });
  }
  const rows = [...byId.entries()].map(([siswa_id, s]) => ({
    siswa_id,
    mapel_id: mapel,
    tahun_ajaran_id: ta,
    tugas: s.tugas ?? null,
    uts: s.uts ?? null,
    uas: s.uas ?? null,
  }));
  if (rows.length === 0) redirect(back);
  const { error } = await supabase.from("nilai").upsert(rows, { onConflict: "siswa_id,mapel_id,tahun_ajaran_id" });
  if (error) redirect(`${back}&error=${enc(error.message)}`);
  // baris yang dikosongkan seluruhnya tidak perlu disimpan
  await supabase
    .from("nilai")
    .delete()
    .eq("mapel_id", mapel)
    .eq("tahun_ajaran_id", ta)
    .in("siswa_id", rows.map((r) => r.siswa_id))
    .is("tugas", null)
    .is("uts", null)
    .is("uas", null);
  redirect(`${back}&ok=1`);
}
export async function submitAsesmen(formData: FormData) {
  const p = await requireRole(["siswa"]);
  const back = "/dashboard/siswa/asesmen";
  const supabase = await createClient();
  const { data: siswa } = await supabase.from("siswa").select("id").eq("profile_id", p.id).single();
  if (!siswa) redirect(`${back}?error=${enc("Data siswa belum tertaut ke akun Anda.")}`);
  const { data: soal } = await supabase.from("asesmen_soal").select("id, kategori");
  const skor: Record<string, number> = Object.fromEntries(RIASEC.map((k) => [k, 0]));
  let dijawab = 0;
  for (const s of soal ?? []) {
    const n = Number(str(formData.get(`q_${s.id}`)));
    if (n >= 1 && n <= 5) {
      skor[s.kategori] += n;
      dijawab++;
    }
  }
  if (!soal?.length || dijawab < soal.length) {
    redirect(`${back}?error=${enc("Jawab semua pernyataan.")}`);
  }
  const dominan = Object.entries(skor).sort((a, b) => b[1] - a[1])[0][0];
  const { error } = await supabase
    .from("asesmen_hasil")
    .insert({ siswa_id: siswa.id, skor, kategori_dominan: dominan });
  if (error) redirect(`${back}?error=${enc(error.message)}`);
  redirect(back);
}

export async function ajukanKonseling(formData: FormData) {
  const p = await requireRole(["siswa"]);
  const back = "/dashboard/konseling";
  const topik = str(formData.get("topik"));
  if (!topik) redirect(`${back}?error=${enc("Isi topik konseling.")}`);
  const supabase = await createClient();
  const { data: siswa } = await supabase.from("siswa").select("id").eq("profile_id", p.id).single();
  if (!siswa) redirect(`${back}?error=${enc("Data siswa belum tertaut ke akun Anda.")}`);
  const { error } = await supabase.from("konseling").insert({ siswa_id: siswa.id, topik: topik.slice(0, 1000) });
  if (error) redirect(`${back}?error=${enc(error.message)}`);
  redirect(`${back}?ok=ajukan`);
}

const STATUS_KONSELING = ["diajukan", "dijadwalkan", "selesai", "batal"];

export async function updateKonseling(id: number, formData: FormData) {
  const p = await requireRole(PENGELOLA_BK);
  const b = str(formData.get("_back"));
  const back = b.startsWith("/dashboard/konseling") ? b : "/dashboard/konseling";
  const supabase = await createClient();
  const jadwalIn = str(formData.get("jadwal"));
  const jadwal = jadwalIn ? wibKeIso(jadwalIn) : null;
  if (jadwalIn && !jadwal) redirect(tambahParam(back, "error", "Jadwal tidak valid."));
  let status = str(formData.get("status"));
  if (!STATUS_KONSELING.includes(status)) redirect(tambahParam(back, "error", "Status tidak valid."));
  if (status === "diajukan" && jadwal) status = "dijadwalkan";
  const ubah: Record<string, unknown> = { status, jadwal, catatan: str(formData.get("catatan")).slice(0, 2000) || null };
  // guru BK yang menangani dicatat; admin yang mengubah tidak menghapus penanggung jawab yang sudah ada
  const { data: guru } = await supabase.from("guru").select("id").eq("profile_id", p.id).maybeSingle();
  if (guru) ubah.guru_id = guru.id;
  const { error } = await supabase.from("konseling").update(ubah).eq("id", id);
  if (error) redirect(tambahParam(back, "error", error.message));
  revalidatePath("/dashboard/konseling");
  redirect(tambahParam(back, "ok", "1"));
}

export async function saveTracer(formData: FormData) {
  const p = await requireRole(["alumni"]);
  const back = "/dashboard/alumni";
  const supabase = await createClient();
  const { data: alumni } = await supabase.from("alumni").select("id").eq("profile_id", p.id).single();
  if (!alumni) redirect(`${back}?error=${enc("Data alumni belum tertaut ke akun Anda.")}`);
  const relevansi = str(formData.get("relevansi"));
  const status = str(formData.get("status"));
  // kolom pekerjaan disembunyikan di formulir untuk yang kuliah/mencari kerja
  const kerja = !["kuliah", "mencari_kerja"].includes(status);
  const { error } = await supabase.from("tracer_respons").upsert(
    {
      alumni_id: alumni.id,
      tahun_isi: new Date().getFullYear(),
      status,
      institusi: str(formData.get("institusi")) || null,
      bidang: str(formData.get("bidang")) || null,
      jabatan_prodi: (kerja && str(formData.get("jabatan_prodi"))) || null,
      penghasilan_range: (kerja && str(formData.get("penghasilan_range"))) || null,
      relevansi: relevansi ? Number(relevansi) : null,
      masukan: str(formData.get("masukan")) || null,
    },
    { onConflict: "alumni_id,tahun_isi" },
  );
  if (error) redirect(`${back}?error=${enc(error.message)}`);
  redirect(`${back}?ok=1`);
}

export async function updateRow(key: string, id: string, formData: FormData) {
  const res = resources[key];
  if (!res) redirect("/dashboard");
  await requireRole(res.write);
  const row: Record<string, unknown> = {};
  for (const f of res.fields) row[f.name] = castValue(f, formData.get(f.name));
  const supabase = await createClient();
  const { error } = await supabase.from(res.table).update(row).eq("id", id);
  if (error) redirect(`/dashboard/data/${key}/${id}?error=${enc(error.message)}`);
  revalidatePath(`/dashboard/data/${key}`);
  segarkanBeranda(key);
  redirect(`/dashboard/data/${key}?ok=ubah`);
}

export async function changePassword(formData: FormData) {
  const me = await requireRole(ROLES);
  const back = "/dashboard/akun";
  const pw = str(formData.get("password"));
  if (pw.length < 8) redirect(`${back}?error=${enc("Kata sandi minimal 8 karakter.")}`);
  if (pw !== str(formData.get("confirm"))) redirect(`${back}?error=${enc("Konfirmasi kata sandi tidak sama.")}`);
  const supabase = await createClient();
  if (me.role === "siswa") {
    const { data: sis } = await supabase.from("siswa").select("tanggal_lahir").eq("profile_id", me.id).maybeSingle();
    if (pw === passwordDefault(sis?.tanggal_lahir)) {
      redirect(`${back}?error=${enc("Kata sandi baru tidak boleh sama dengan kata sandi bawaan (tanggal lahir).")}`);
    }
  }
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) redirect(`${back}?error=${enc(error.message)}`);
  await createAdminClient().from("profiles").update({ wajib_ganti_sandi: false }).eq("id", me.id);
  await hapusProfil(me.id);
  redirect(`${back}?ok=1`);
}

export async function importSiswa(formData: FormData) {
  await requireRole(["admin"]);
  const back = "/dashboard/admin/impor";
  const galat = (m: string) => redirect(`${back}?error=${enc(m)}`);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) galat("Pilih file .xlsx.");
  if ((file as File).size > 5 * 1024 * 1024) galat("File maksimal 5 MB.");

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(((await (file as File).arrayBuffer()) as unknown) as ExcelJS.Buffer);
  } catch {
    galat("File tidak dapat dibaca. Gunakan format .xlsx.");
  }

  const { baris, masalah, adaLembar } = bacaSiswa(wb);
  if (!adaLembar) galat("Kolom nama tidak ditemukan. Baris judul harus berisi kolom 'nama' atau 'Nama Lengkap'.");
  if (baris.length === 0) galat("Tidak ada baris data.");
  if (masalah.length) {
    galat(`Tidak ada data yang disimpan. ${masalah.slice(0, 6).join(" ")}${masalah.length > 6 ? ` (dan ${masalah.length - 6} masalah lain)` : ""}`);
  }

  const supabase = await createClient();
  const [{ data: kelas }, { data: ta }, { data: ada }] = await Promise.all([
    supabase.from("kelas").select("id, nama, tahun_ajaran_id"),
    supabase.from("tahun_ajaran").select("id").eq("aktif", true).limit(1).maybeSingle(),
    supabase.from("siswa").select("id, nama, nisn, nis, tanggal_lahir"),
  ]);

  // kelas: utamakan yang ada di tahun ajaran aktif; yang belum ada dibuat otomatis
  const kelasId = new Map<string, number>();
  [...(kelas ?? [])]
    .sort((a, b) => Number(a.tahun_ajaran_id === ta?.id) - Number(b.tahun_ajaran_id === ta?.id))
    .forEach((k) => kelasId.set(String(k.nama).toLowerCase(), k.id as number));
  const perluKelas = [...new Set(baris.map((b) => b.kelas).filter((k): k is string => !!k && !kelasId.has(k.toLowerCase())))];
  if (perluKelas.length) {
    const tanpaTingkat = perluKelas.filter((k) => !tingkatDariNama(k));
    if (!ta) galat(`Kelas ${perluKelas.join(", ")} belum ada. Tandai satu tahun ajaran sebagai aktif agar kelas dibuat otomatis, atau buat di menu Kelas.`);
    if (tanpaTingkat.length) galat(`Tingkat kelas ${tanpaTingkat.join(", ")} tidak dikenali (nama kelas harus diawali X, XI, atau XII). Buat dulu di menu Kelas.`);
    const { data: dibuat, error } = await supabase
      .from("kelas")
      .insert(perluKelas.map((nama) => ({ nama, tingkat: tingkatDariNama(nama), tahun_ajaran_id: ta!.id })))
      .select("id, nama");
    if (error) galat(`Gagal membuat kelas: ${error.message}`);
    (dibuat ?? []).forEach((k) => kelasId.set(String(k.nama).toLowerCase(), k.id as number));
  }

  // cocokkan siswa lama: NISN, lalu NIS, lalu nama (hanya bila nama unik dan siswa itu belum punya NISN)
  const byNisn = new Map<string, number>();
  const byNis = new Map<string, number>();
  const byNama = new Map<string, number[]>();
  (ada ?? []).forEach((x) => {
    if (x.nisn) byNisn.set(String(x.nisn), x.id as number);
    if (x.nis) byNis.set(String(x.nis), x.id as number);
    if (!x.nisn) byNama.set(namaKunci(String(x.nama)), [...(byNama.get(namaKunci(String(x.nama))) ?? []), x.id as number]);
  });
  const tambah: Record<string, unknown>[] = [];
  const ubah: { id: number; data: Record<string, unknown> }[] = [];
  const dipakai = new Set<number>();
  for (const b of baris) {
    const { _lokasi, kelas: kNama, ...isi } = b;
    void _lokasi;
    const data: Record<string, unknown> = { ...isi, kelas_id: kNama ? kelasId.get(kNama.toLowerCase()) ?? null : null };
    const calonNama = byNama.get(namaKunci(b.nama!));
    // cadangan: tanggal lahir sama dan ejaan nama hampir sama (satu kandidat saja)
    const calonEja = (ada ?? []).filter(
      (x) =>
        !x.nisn &&
        !!b.tanggal_lahir &&
        x.tanggal_lahir === b.tanggal_lahir &&
        jarakEja(namaKunci(String(x.nama)), namaKunci(b.nama!)) <= 2,
    );
    const id =
      (b.nisn && byNisn.get(b.nisn)) ||
      (b.nis && byNis.get(b.nis)) ||
      (calonNama?.length === 1 ? calonNama[0] : undefined) ||
      (calonEja.length === 1 ? (calonEja[0].id as number) : undefined);
    if (id && !dipakai.has(id)) {
      dipakai.add(id);
      // data lama tidak dikosongkan oleh sel yang kosong di file
      ubah.push({ id, data: Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null)) });
    } else {
      tambah.push(data);
    }
  }

  for (const grup of potong(ubah, 10)) {
    const hasil = await Promise.all(grup.map((u) => supabase.from("siswa").update(u.data).eq("id", u.id)));
    const e = hasil.find((h) => h.error)?.error;
    if (e) galat(`Gagal memperbarui siswa: ${e.message} (NISN/NIS harus unik).`);
  }
  for (const grup of potong(tambah)) {
    const { error } = await supabase.from("siswa").insert(grup);
    if (error) galat(`Gagal menambah siswa: ${error.message} (NISN/NIS harus unik).`);
  }
  revalidatePath("/dashboard/data/siswa");
  const info = [`${tambah.length} siswa baru ditambahkan, ${ubah.length} siswa diperbarui.`];
  if (perluKelas.length) info.push(`Kelas baru dibuat: ${perluKelas.join(", ")}.`);
  redirect(`${back}?info=${enc(info.join(" "))}`);
}

export async function promoteAlumni(formData: FormData) {
  await requireRole(["admin"]);
  const back = "/dashboard/admin/kelulusan";
  const ids = formData.getAll("siswa").map((v) => Number(v)).filter(Boolean);
  const tahun = Number(str(formData.get("tahun_lulus")));
  if (!tahun || ids.length === 0) redirect(`${back}?error=${enc("Pilih siswa dan isi tahun lulus.")}`);

  const supabase = await createClient();
  const { data: siswa } = await supabase.from("siswa").select("id, nama, profile_id").in("id", ids);
  const { error: e1 } = await supabase.from("siswa").update({ status: "lulus", tahun_lulus: tahun }).in("id", ids);
  if (e1) redirect(`${back}?error=${enc(e1.message)}`);

  const alumni = (siswa ?? []).map((s) => ({
    siswa_id: s.id,
    profile_id: s.profile_id,
    nama: s.nama,
    tahun_lulus: tahun,
  }));
  const { error: e2 } = await supabase.from("alumni").upsert(alumni, { onConflict: "siswa_id" });
  if (e2) redirect(`${back}?error=${enc(e2.message)}`);

  const profileIds = (siswa ?? []).map((s) => s.profile_id).filter(Boolean);
  if (profileIds.length) await supabase.from("profiles").update({ role: "alumni" }).in("id", profileIds);
  await hapusProfil(...profileIds);
  revalidatePath(back);
  redirect(`${back}?ok=${alumni.length}`);
}

export async function imporNisn(formData: FormData) {
  await requireRole(["admin"]);
  const back = "/dashboard/admin/impor";
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect(`${back}?error=${enc("Pilih file .xlsx.")}`);
  if (file.size > 5 * 1024 * 1024) redirect(`${back}?error=${enc("File maksimal 5 MB.")}`);

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load((await file.arrayBuffer()) as unknown as ExcelJS.Buffer);
  } catch {
    redirect(`${back}?error=${enc("File tidak dapat dibaca. Gunakan format .xlsx.")}`);
  }
  const ws = wb.worksheets[0];
  const headers: Record<string, number> = {};
  ws?.getRow(1).eachCell((c, i) => {
    headers[cellText(c.value).toLowerCase()] = i;
  });
  if (!ws || !headers["nama"] || !headers["nisn"]) {
    redirect(`${back}?error=${enc("Baris pertama harus berisi kolom 'nama' dan 'nisn'.")}`);
  }

  const norm = (t: string) => t.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const supabase = await createClient();
  const { data: semua } = await supabase.from("siswa").select("id, nama");
  const peta = new Map<string, number[]>();
  (semua ?? []).forEach((x) => {
    const k = norm(String(x.nama));
    peta.set(k, [...(peta.get(k) ?? []), x.id as number]);
  });

  let berhasil = 0;
  const tidakCocok: number[] = [];
  const tidakValid: number[] = [];
  const kerja: { id: number; nisn: string }[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const nama = cellText(row.getCell(headers["nama"]).value);
    if (!nama) return;
    const nisn = cellText(row.getCell(headers["nisn"]).value).replace(/\D/g, "");
    if (!/^\d{10}$/.test(nisn)) return void tidakValid.push(n);
    const ids = peta.get(norm(nama));
    if (!ids || ids.length !== 1) return void tidakCocok.push(n);
    kerja.push({ id: ids[0], nisn });
  });
  for (const k of kerja) {
    const { error } = await supabase.from("siswa").update({ nisn: k.nisn }).eq("id", k.id);
    if (error) {
      redirect(`${back}?error=${enc(`Gagal menyimpan NISN: ${error.message} (NISN harus unik).`)}`);
    }
    berhasil++;
  }
  const bagian = [`${berhasil} NISN diperbarui.`];
  if (tidakCocok.length) bagian.push(`Baris ${tidakCocok.slice(0, 8).join(", ")} tidak cocok dengan satu siswa.`);
  if (tidakValid.length) bagian.push(`Baris ${tidakValid.slice(0, 8).join(", ")} berisi NISN tidak valid (harus 10 digit).`);
  revalidatePath("/dashboard/data/siswa");
  redirect(`${back}?info=${enc(bagian.join(" "))}`);
}

/* ---------- pembantu data massal ---------- */

function balik(formData: FormData, key: string): string {
  const b = str(formData.get("_back"));
  return b.startsWith(`/dashboard/data/${key}`) ? b : `/dashboard/data/${key}`;
}

function tambahParam(path: string, k: string, v: string): string {
  const u = new URL(path, "http://lokal");
  u.searchParams.delete("ok");
  u.searchParams.delete("error");
  u.searchParams.set(k, v);
  return u.pathname + u.search;
}

const potong = <T,>(a: T[], n = 200): T[][] => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

async function ambilIds(key: string, formData: FormData): Promise<string[]> {
  if (formData.get("_semua") === "1") {
    const res = resources[key];
    const sp = Object.fromEntries(new URL(str(formData.get("_back")) || "/", "http://lokal").searchParams.entries());
    const lp = parseListParams(res, sp);
    const supabase = await createClient();
    const { data } = await terapkanFilter(supabase.from(res.table).select("id"), res, lp).limit(5000);
    return (data ?? []).map((r) => String((r as { id: number }).id));
  }
  return formData.getAll("ids").map(String);
}

async function hapusData(key: string, ids: string[]): Promise<string | null> {
  const res = resources[key];
  const bersih = ids.filter((i) => /^\d+$/.test(i)).slice(0, 5000);
  if (!res || bersih.length === 0) return "Tidak ada data yang dipilih.";
  const supabase = await createClient();
  const punyaAkun = ["siswa", "guru", "alumni"].includes(key);
  const profileIds: string[] = [];
  for (const grup of potong(bersih)) {
    if (punyaAkun) {
      const { data } = await supabase.from(res.table).select("profile_id").in("id", grup);
      (data ?? []).forEach((r) => {
        if (r.profile_id) profileIds.push(r.profile_id as string);
      });
    }
    const { error } = await supabase.from(res.table).delete().in("id", grup);
    if (error) return error.message;
  }
  if (profileIds.length) {
    // akun login yang tertaut ikut dihapus agar tidak menjadi akun yatim
    const admin = createAdminClient();
    for (const g of potong(profileIds, 10)) await Promise.all(g.map((id) => admin.auth.admin.deleteUser(id)));
    await hapusProfil(...profileIds);
  }
  revalidatePath(`/dashboard/data/${key}`);
  segarkanBeranda(key);
  return null;
}

export async function bulkDelete(key: string, formData: FormData) {
  const res = resources[key];
  if (!res) redirect("/dashboard");
  await requireRole(res.write);
  const err = await hapusData(key, await ambilIds(key, formData));
  const back = balik(formData, key);
  if (err) redirect(tambahParam(back, "error", err));
  redirect(tambahParam(back, "ok", "hapus"));
}

export async function bulkUpdate(key: string, field: string, formData: FormData) {
  const res = resources[key];
  if (!res || !(res.bulk ?? []).includes(field)) redirect("/dashboard");
  await requireRole(res.write);
  const back = balik(formData, key);
  const f = res.fields.find((x) => x.name === field)!;
  const ids = (await ambilIds(key, formData)).filter((i) => /^\d+$/.test(i)).slice(0, 5000);
  if (ids.length === 0) redirect(tambahParam(back, "error", "Pilih data terlebih dahulu."));
  const v = castValue(f, formData.get(`bulk_${field}`));
  if (v === null) redirect(tambahParam(back, "error", `Pilih nilai untuk ${f.short ?? f.label} dulu.`));
  const supabase = await createClient();
  for (const grup of potong(ids)) {
    const { error } = await supabase.from(res.table).update({ [field]: v }).in("id", grup);
    if (error) redirect(tambahParam(back, "error", error.message));
  }
  revalidatePath(`/dashboard/data/${key}`);
  redirect(tambahParam(back, "ok", "ubah"));
}

/* ---------- impor Excel generik ---------- */

export async function imporResource(key: string, formData: FormData) {
  const res = resources[key];
  if (!res || res.importable === false) redirect("/dashboard");
  await requireRole(res.write);
  const back = `/dashboard/data/${key}/impor`;
  const galat = (m: string) => redirect(`${back}?error=${enc(m)}`);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) galat("Pilih file .xlsx.");
  if ((file as File).size > 5 * 1024 * 1024) galat("File maksimal 5 MB.");
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(((await (file as File).arrayBuffer()) as unknown) as ExcelJS.Buffer);
  } catch {
    galat("File tidak dapat dibaca. Gunakan format .xlsx.");
  }
  const ws = wb.worksheets[0];
  if (!ws) galat("Lembar kerja kosong.");

  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
  const kolom: Record<string, number> = {};
  ws.getRow(1).eachCell((c, i) => {
    const h = norm(cellText(c.value));
    for (const f of res.fields) {
      if (h === norm(f.name) || h === norm(f.label.replace(/\s*\(.*?\)\s*/g, "")) || h === norm(f.short ?? "")) kolom[f.name] = i;
    }
  });
  const hilang = res.fields.filter((f) => f.required && !kolom[f.name]).map((f) => f.short ?? f.label);
  if (hilang.length) galat(`Kolom wajib tidak ditemukan di baris pertama: ${hilang.join(", ")}.`);

  const supabase = await createClient();
  const optionsOf = await loadOptions(supabase, res);
  const baris: Record<string, unknown>[] = [];
  const masalah: string[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const kosong = res.fields.every((f) => !kolom[f.name] || cellText(row.getCell(kolom[f.name]).value) === "");
    if (kosong) return;
    const data: Record<string, unknown> = {};
    for (const f of res.fields) {
      const label = f.short ?? f.label;
      const mentah = kolom[f.name] ? row.getCell(kolom[f.name]).value : null;
      const teks = kolom[f.name] ? cellText(mentah as ExcelJS.CellValue) : "";
      let nilai: unknown = null;
      if (teks !== "" || f.type === "time") {
        if (f.type === "select") {
          const opsi = optionsOf(f.name).find((o) => norm(o.label) === norm(teks) || o.value === teks);
          if (!opsi) masalah.push(`Baris ${n}: "${teks}" tidak dikenal pada kolom ${label}.`);
          else nilai = f.cast === "int" ? Number(opsi.value) : f.cast === "bool" ? opsi.value === "true" : opsi.value;
        } else if (f.type === "number") {
          const x = Number(teks.replace(",", "."));
          if (Number.isNaN(x)) masalah.push(`Baris ${n}: kolom ${label} harus angka.`);
          else nilai = x;
        } else if (f.type === "date") {
          nilai = tanggalDariSel(mentah as ExcelJS.CellValue);
          if (!nilai && teks) masalah.push(`Baris ${n}: kolom ${label} bukan tanggal yang valid.`);
        } else if (f.type === "time") {
          nilai = jamDariSel(mentah as ExcelJS.CellValue);
          if (!nilai && teks) masalah.push(`Baris ${n}: kolom ${label} bukan jam yang valid (contoh 07:30).`);
        } else {
          nilai = teks;
        }
      }
      if (f.required && (nilai === null || nilai === "")) masalah.push(`Baris ${n}: kolom ${label} wajib diisi.`);
      if (nilai !== null && nilai !== "") data[f.name] = nilai;
    }
    baris.push(data);
  });

  if (masalah.length) {
    const lebih = masalah.length > 6 ? ` (dan ${masalah.length - 6} masalah lain)` : "";
    galat(`Tidak ada data yang dimasukkan. ${masalah.slice(0, 6).join(" ")}${lebih}`);
  }
  if (baris.length === 0) galat("Tidak ada baris data (mulai dari baris kedua).");

  for (let i = 0; i < baris.length; i += 200) {
    const { error } = await supabase.from(res.table).insert(baris.slice(i, i + 200));
    if (error) galat(`Gagal menyimpan baris ${i + 2}–${Math.min(i + 201, baris.length + 1)}: ${error.message}`);
  }
  revalidatePath(`/dashboard/data/${key}`);
  segarkanBeranda(key);
  redirect(`/dashboard/data/${key}?ok=impor`);
}

/* ---------- pindahkan email akun siswa lama ke alias Gmail ---------- */

export async function pindahkanEmailSiswa() {
  await requireRole(["admin"]);
  const back = "/dashboard/admin/akun-massal";
  const admin = createAdminClient();
  const lama: { id: string; username: string }[] = [];
  for (let page = 1; page <= 10; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    users.forEach((u) => {
      if (u.email?.endsWith(`@${DOMAIN_SISWA_LAMA}`)) lama.push({ id: u.id, username: u.email.split("@")[0] });
    });
    if (users.length < 1000) break;
  }
  let berhasil = 0;
  const gagal: string[] = [];
  for (const grup of potong(lama, 5)) {
    await Promise.all(
      grup.map(async (u) => {
        const { error } = await admin.auth.admin.updateUserById(u.id, { email: emailDariLogin(u.username), email_confirm: true });
        if (error) gagal.push(`${u.username.toUpperCase()} (${error.message})`);
        else berhasil++;
      }),
    );
  }
  const pesan = [`${berhasil} akun siswa dipindahkan ke email ${emailDariLogin("NISN")}.`];
  if (gagal.length) pesan.push(`Gagal: ${gagal.slice(0, 5).join(", ")}${gagal.length > 5 ? ` dan ${gagal.length - 5} lainnya` : ""}.`);
  revalidatePath(back);
  redirect(`${back}?info=${enc(pesan.join(" "))}`);
}

/* ---------- reset kata sandi satu pengguna ---------- */

export async function resetSandiUser(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const me = await requireRole(["admin"]);
  const id = str(formData.get("id"));
  if (!id) return { error: "Akun tidak valid." };
  if (id === me.id) return { error: "Gunakan menu Akun saya untuk mengganti kata sandi sendiri." };
  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("role").eq("id", id).single();
  if (!prof) return { error: "Akun tidak ditemukan." };
  let password: string | null = null;
  if (prof.role === "siswa") {
    const { data: sis } = await admin.from("siswa").select("tanggal_lahir").eq("profile_id", id).maybeSingle();
    password = passwordDefault(sis?.tanggal_lahir);
  }
  password ??= randomPassword(10);
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) return { error: error.message };
  await admin.from("profiles").update({ wajib_ganti_sandi: true }).eq("id", id);
  await hapusProfil(id);
  return { id, password };
}

export async function bulkDeleteUser(formData: FormData) {
  const me = await requireRole(["admin"]);
  const dasar = "/dashboard/admin/pengguna";
  const b = str(formData.get("_back"));
  const back = b.startsWith(dasar) ? b : dasar;
  const ids = formData
    .getAll("ids")
    .map(String)
    .filter((i) => /^[0-9a-f-]{36}$/i.test(i) && i !== me.id)
    .slice(0, 500);
  if (ids.length === 0) redirect(tambahParam(back, "error", "Pilih pengguna terlebih dahulu."));
  const admin = createAdminClient();
  for (const g of potong(ids, 10)) await Promise.all(g.map((id) => admin.auth.admin.deleteUser(id)));
  await hapusProfil(...ids);
  revalidatePath(dasar);
  redirect(tambahParam(back, "ok", "hapus"));
}
