import ExcelJS from "exceljs";
import { getProfile } from "@/lib/auth";

export async function GET() {
  const p = await getProfile();
  if (!p || p.role !== "admin") return new Response("Tidak diizinkan", { status: 403 });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Siswa");
  ws.columns = [
    { header: "nama", key: "nama", width: 30 },
    { header: "nisn", key: "nisn", width: 14 },
    { header: "nis", key: "nis", width: 12 },
    { header: "jenis_kelamin", key: "jk", width: 14 },
    { header: "tanggal_lahir", key: "tl", width: 16 },
    { header: "tempat_lahir", key: "tempat", width: 16 },
    { header: "alamat", key: "alamat", width: 36 },
    { header: "no_hp", key: "hp", width: 16 },
    { header: "nama_ayah", key: "ayah", width: 24 },
    { header: "nama_ibu", key: "ibu", width: 24 },
    { header: "nama_wali", key: "wali", width: 24 },
    { header: "kelas", key: "kelas", width: 12 },
    { header: "status", key: "status", width: 10 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.addRow({ nama: "Contoh Siswa", nisn: "0012345678", nis: "1001", jk: "L", tl: "2009-05-17", tempat: "Lebak", alamat: "Kp. Kaburon, Maja", kelas: "X MIA", status: "aktif" });
  ws.getColumn("nisn").numFmt = "@";
  ws.getColumn("nis").numFmt = "@";

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-siswa.xlsx"',
    },
  });
}
