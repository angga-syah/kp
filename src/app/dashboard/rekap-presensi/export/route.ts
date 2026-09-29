import ExcelJS from "exceljs";
import { getProfile } from "@/lib/auth";
import { PENGAJAR } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { kelasBolehIsi, rekapPresensi } from "@/lib/akses";

export async function GET(request: Request) {
  const p = await getProfile();
  if (!p || !PENGAJAR.includes(p.role)) return new Response("Tidak diizinkan", { status: 403 });
  const url = new URL(request.url);
  const kelas = Number(url.searchParams.get("kelas"));
  const bulan = url.searchParams.get("bulan") ?? "";
  if (!kelas || !/^\d{4}-\d{2}$/.test(bulan)) return new Response("Parameter tidak valid", { status: 400 });

  const supabase = await createClient();
  const boleh = await kelasBolehIsi(supabase, p);
  if (boleh && !boleh.includes(kelas)) return new Response("Tidak diizinkan", { status: 403 });

  const { data: k } = await supabase.from("kelas").select("nama").eq("id", kelas).maybeSingle();
  const rows = await rekapPresensi(supabase, kelas, bulan);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Presensi ${bulan}`);
  ws.columns = [
    { header: "Nama", key: "nama", width: 30 },
    { header: "NISN", key: "nisn", width: 14 },
    { header: "Hadir", key: "hadir", width: 8 },
    { header: "Izin", key: "izin", width: 8 },
    { header: "Sakit", key: "sakit", width: 8 },
    { header: "Alpa", key: "alpa", width: 8 },
    { header: "Kehadiran (%)", key: "persen", width: 14 },
  ];
  ws.getRow(1).font = { bold: true };
  rows.forEach((r) => ws.addRow({ ...r, persen: r.persen === null ? null : Math.round(r.persen) }));
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="presensi-${(k?.nama ?? "kelas").replace(/[^\w-]+/g, "_")}-${bulan}.xlsx"`,
    },
  });
}
