import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailDariLogin, passwordDefault, randomPassword } from "@/lib/akun";
import { hapusProfil } from "@/lib/redis";

export const maxDuration = 60;

type S = {
  id: number;
  nama: string;
  nisn: string | null;
  nis: string | null;
  tanggal_lahir: string | null;
  profile_id: string | null;
  kelas: { nama: string } | null;
};

export async function POST(request: Request) {
  const p = await getProfile();
  if (!p || p.role !== "admin") return new Response("Tidak diizinkan", { status: 403 });
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return new Response("Asal permintaan tidak valid", { status: 403 });
  }

  const back = (msg: string) =>
    NextResponse.redirect(new URL(`/dashboard/admin/akun-massal?error=${encodeURIComponent(msg)}`, request.url), 303);

  const form = await request.formData();
  const modeIn = form.get("mode");
  const mode = modeIn === "reset" ? "reset" : modeIn === "nisn" ? "nisn" : "buat";
  const ids = form.getAll("siswa").map(Number).filter(Boolean).slice(0, 100);
  if (ids.length === 0) return back("Pilih minimal satu siswa.");

  const admin = createAdminClient();
  const { data } = await admin
    .from("siswa")
    .select("id, nama, nisn, nis, tanggal_lahir, profile_id, kelas(nama)")
    .in("id", ids);
  const siswa = (data ?? []) as unknown as S[];

  const hasil: { nama: string; kelas: string; username: string; password: string; status: string }[] = [];

  async function proses(s: S) {
    const username = s.nisn || s.nis || "";
    const baris = { nama: s.nama, kelas: s.kelas?.nama ?? "", username, password: "", status: "" };
    hasil.push(baris);
    if (!username) {
      baris.status = "dilewati: tidak punya NISN/NIS";
      return;
    }
    if (mode === "nisn") {
      if (!s.profile_id) {
        baris.status = "dilewati: belum punya akun";
        return;
      }
      if (!s.nisn) {
        baris.status = "dilewati: NISN belum diisi";
        return;
      }
      baris.username = s.nisn;
      const { error } = await admin.auth.admin.updateUserById(s.profile_id, {
        email: emailDariLogin(s.nisn),
        email_confirm: true,
      });
      baris.status = error ? `gagal: ${error.message}` : "username diganti ke NISN (kata sandi tidak berubah)";
      return;
    }
    const password = passwordDefault(s.tanggal_lahir) ?? randomPassword();
    const acak = !passwordDefault(s.tanggal_lahir);
    if (mode === "buat") {
      if (s.profile_id) {
        baris.status = "dilewati: sudah punya akun";
        return;
      }
      const { data: u, error } = await admin.auth.admin.createUser({
        email: emailDariLogin(username),
        password,
        email_confirm: true,
        user_metadata: { nama: s.nama },
      });
      if (error || !u.user) {
        baris.status = `gagal: ${error?.message ?? "tidak diketahui"}`;
        return;
      }
      await admin.from("profiles").update({ role: "siswa", nama: s.nama, aktif: true, wajib_ganti_sandi: true }).eq("id", u.user.id);
      await hapusProfil(u.user.id);
      await admin.from("siswa").update({ profile_id: u.user.id }).eq("id", s.id);
      baris.password = password;
      baris.status = acak ? "akun dibuat (tanggal lahir kosong: kata sandi acak)" : "akun dibuat";
    } else {
      if (!s.profile_id) {
        baris.status = "dilewati: belum punya akun";
        return;
      }
      const { error } = await admin.auth.admin.updateUserById(s.profile_id, { password });
      if (error) {
        baris.status = `gagal: ${error.message}`;
        return;
      }
      await admin.from("profiles").update({ wajib_ganti_sandi: true }).eq("id", s.profile_id);
      await hapusProfil(s.profile_id);
      baris.password = password;
      baris.status = acak ? "direset (tanggal lahir kosong: kata sandi acak)" : "kata sandi direset ke bawaan";
    }
  }

  for (let i = 0; i < siswa.length; i += 5) {
    await Promise.all(siswa.slice(i, i + 5).map(proses));
  }
  hasil.sort((a, b) => a.nama.localeCompare(b.nama));

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(mode === "buat" ? "Akun siswa" : mode === "reset" ? "Reset kata sandi" : "Username NISN");
  ws.columns = [
    { header: "Nama", key: "nama", width: 30 },
    { header: "Kelas", key: "kelas", width: 12 },
    { header: "Username (NISN)", key: "username", width: 18 },
    { header: "Kata sandi", key: "password", width: 16 },
    { header: "Status", key: "status", width: 34 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getColumn("username").numFmt = "@";
  hasil.forEach((h) => ws.addRow(h));

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${mode === "buat" ? "akun-siswa" : mode === "reset" ? "reset-sandi-siswa" : "username-nisn"}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
