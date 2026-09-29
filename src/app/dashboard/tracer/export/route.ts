import ExcelJS from "exceljs";
import { getProfile } from "@/lib/auth";
import { STAF } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

type R = {
  tahun_isi: number;
  status: string;
  institusi: string | null;
  bidang: string | null;
  jabatan_prodi: string | null;
  penghasilan_range: string | null;
  relevansi: number | null;
  masukan: string | null;
  alumni: { nama: string; tahun_lulus: number } | null;
};

export async function GET(request: Request) {
  const p = await getProfile();
  if (!p || !STAF.includes(p.role)) {
    return new Response("Tidak diizinkan", { status: 403 });
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("tracer_respons")
    .select("tahun_isi, status, institusi, bidang, jabatan_prodi, penghasilan_range, relevansi, masukan, alumni(nama, tahun_lulus)")
    .order("tahun_isi", { ascending: false });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Tracer study");
  ws.columns = [
    { header: "Nama", key: "nama", width: 28 },
    { header: "Tahun lulus", key: "lulus", width: 12 },
    { header: "Tahun isi", key: "tahun", width: 10 },
    { header: "Kegiatan", key: "status", width: 16 },
    { header: "Kampus / tempat kerja", key: "institusi", width: 30 },
    { header: "Prodi / bidang", key: "bidang", width: 24 },
    { header: "Jabatan", key: "jabatan", width: 20 },
    { header: "Penghasilan", key: "penghasilan", width: 14 },
    { header: "Kesesuaian (1-5)", key: "relevansi", width: 16 },
    { header: "Masukan", key: "masukan", width: 40 },
  ];
  ws.getRow(1).font = { bold: true };
  const lulus = new URL(request.url).searchParams.get("lulus");
  for (const r of ((data ?? []) as unknown as R[]).filter((x) => !lulus || String(x.alumni?.tahun_lulus) === lulus)) {
    ws.addRow({
      nama: r.alumni?.nama,
      lulus: r.alumni?.tahun_lulus,
      tahun: r.tahun_isi,
      status: r.status,
      institusi: r.institusi,
      bidang: r.bidang,
      jabatan: r.jabatan_prodi,
      penghasilan: r.penghasilan_range,
      relevansi: r.relevansi,
      masukan: r.masukan,
    });
  }
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="tracer-study.xlsx"',
    },
  });
}
