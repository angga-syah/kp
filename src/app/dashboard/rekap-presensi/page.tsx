import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { kelasBolehIsi, rekapPresensi } from "@/lib/akses";
import { PageHead, one } from "@/components/ui";
import { PENGAJAR } from "@/lib/roles";
import { hariIni } from "@/lib/waktu";

export const metadata = { title: "Rekap presensi" };

export default async function RekapPresensi({ searchParams }: PageProps<"/dashboard/rekap-presensi">) {
  const p = await requireRole(PENGAJAR);
  const sp = await searchParams;
  const supabase = await createClient();
  const boleh = await kelasBolehIsi(supabase, p);
  let kq = supabase.from("kelas").select("id, nama").order("nama");
  if (boleh) kq = kq.in("id", boleh.length ? boleh : [-1]);
  const { data: kelas } = await kq;

  const kelasId = one(sp.kelas) ?? "";
  const bulan = /^\d{4}-\d{2}$/.test(one(sp.bulan) ?? "") ? (one(sp.bulan) as string) : hariIni().slice(0, 7);
  const diizinkan = !!kelas?.some((k) => String(k.id) === kelasId);
  const rows = kelasId && diizinkan ? await rekapPresensi(supabase, Number(kelasId), bulan) : [];

  return (
    <>
      <PageHead title="Rekap presensi" note="Jumlah kehadiran per siswa dalam satu bulan." />
      <form method="get" className="filterbar">
        <label>
          Kelas
          <select name="kelas" defaultValue={kelasId} required>
            <option value="" disabled>
              Pilih…
            </option>
            {(kelas ?? []).map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>
        </label>
        <label>
          Bulan
          <input type="month" name="bulan" defaultValue={bulan} required />
        </label>
        <SubmitButton className="btn btn--outline">Tampilkan</SubmitButton>
        {kelasId && diizinkan && (
          <Link
            className="btn btn--outline"
            href={`/dashboard/rekap-presensi/export?kelas=${kelasId}&bulan=${bulan}`}
            prefetch={false}
          >
            Unduh Excel
          </Link>
        )}
      </form>

      {kelasId && diizinkan && (
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Hadir</th>
                <th>Izin</th>
                <th>Sakit</th>
                <th>Alpa</th>
                <th>Kehadiran</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="table__empty">
                    Belum ada siswa aktif di kelas ini.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.nama}</td>
                  <td className="num-cell">{r.hadir}</td>
                  <td className="num-cell">{r.izin}</td>
                  <td className="num-cell">{r.sakit}</td>
                  <td className="num-cell">{r.alpa}</td>
                  <td className="num-cell">{r.persen === null ? "—" : `${r.persen.toFixed(0)}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
