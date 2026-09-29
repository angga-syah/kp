import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { passwordDefault, randomPassword, usernameDariEmail } from "@/lib/akun";
import { hapusProfil } from "@/lib/redis";
import { roleLabel, type Role } from "@/lib/roles";

export const maxDuration = 60;

export async function POST(request: Request) {
  const p = await getProfile();
  if (!p || p.role !== "admin") return new Response("Tidak diizinkan", { status: 403 });
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return new Response("Asal permintaan tidak valid", { status: 403 });
  }
  const balik = (msg: string) =>
    NextResponse.redirect(new URL(`/dashboard/admin/pengguna?error=${encodeURIComponent(msg)}`, request.url), 303);

  const form = await request.formData();
  const ids = form
    .getAll("ids")
    .map(String)
    .filter((i) => /^[0-9a-f-]{36}$/i.test(i) && i !== p.id)
    .slice(0, 200);
  if (ids.length === 0) return balik("Pilih pengguna terlebih dahulu.");

  const admin = createAdminClient();
  const [{ data: profs }, { data: daftar }, { data: siswa }] = await Promise.all([
    admin.from("profiles").select("id, nama, role").in("id", ids),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("siswa").select("profile_id, tanggal_lahir").in("profile_id", ids),
  ]);
  const email = new Map((daftar?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  const lahir = new Map((siswa ?? []).map((s) => [s.profile_id as string, s.tanggal_lahir as string | null]));

  const hasil: { nama: string; peran: string; akun: string; password: string; status: string }[] = [];
  async function proses(u: { id: string; nama: string; role: Role }) {
    const baris = { nama: u.nama, peran: roleLabel[u.role], akun: usernameDariEmail(email.get(u.id)), password: "", status: "" };
    hasil.push(baris);
    const pw = (u.role === "siswa" ? passwordDefault(lahir.get(u.id)) : null) ?? randomPassword(10);
    const { error } = await admin.auth.admin.updateUserById(u.id, { password: pw });
    if (error) {
      baris.status = `gagal: ${error.message}`;
      return;
    }
    await admin.from("profiles").update({ wajib_ganti_sandi: true }).eq("id", u.id);
    await hapusProfil(u.id);
    baris.password = pw;
    baris.status = "kata sandi direset (wajib ganti saat login)";
  }
  const daftarProfil = (profs ?? []) as { id: string; nama: string; role: Role }[];
  for (let i = 0; i < daftarProfil.length; i += 5) {
    await Promise.all(daftarProfil.slice(i, i + 5).map(proses));
  }
  hasil.sort((a, b) => a.nama.localeCompare(b.nama));

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Reset kata sandi");
  ws.columns = [
    { header: "Nama", key: "nama", width: 32 },
    { header: "Peran", key: "peran", width: 12 },
    { header: "Username / email", key: "akun", width: 36 },
    { header: "Kata sandi baru", key: "password", width: 20 },
    { header: "Status", key: "status", width: 42 },
  ];
  ws.getRow(1).font = { bold: true };
  hasil.forEach((h) => ws.addRow(h));
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="reset-sandi-pengguna.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
