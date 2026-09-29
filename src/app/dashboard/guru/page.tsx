import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui";

export const metadata = { title: "Ringkasan" };

export default async function GuruHome() {
  const p = await requireRole(["guru"]);
  const supabase = await createClient();
  const { data: jadwal } = await supabase
    .from("jadwal")
    .select("id, hari, jam_mulai, jam_selesai, kelas(nama), mapel(nama), guru!inner(profile_id)")
    .eq("guru.profile_id", p.id)
    .order("hari")
    .order("jam_mulai");

  return (
    <>
      <PageHead title={`Halo, ${p.nama}`} />
      <ul className="shortcuts">
        <li>
          <Link href="/dashboard/presensi">
            <strong>Isi presensi</strong>
            <span>Catat kehadiran siswa per kelas dan tanggal.</span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard/nilai">
            <strong>Input nilai</strong>
            <span>Isi nilai tugas, UTS, dan UAS per mata pelajaran.</span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard/rekap-presensi">
            <strong>Rekap presensi</strong>
            <span>Lihat dan unduh kehadiran per bulan.</span>
          </Link>
        </li>
      </ul>

      <h2 className="h2">Jadwal mengajar</h2>
      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th>Hari</th>
              <th>Jam</th>
              <th>Kelas</th>
              <th>Mata pelajaran</th>
            </tr>
          </thead>
          <tbody>
            {(jadwal ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="table__empty">Belum ada jadwal yang tertaut ke akun Anda.</td>
              </tr>
            )}
            {((jadwal ?? []) as unknown as {
              id: number;
              hari: number;
              jam_mulai: string;
              jam_selesai: string;
              kelas: { nama: string } | null;
              mapel: { nama: string } | null;
            }[]).map((j) => (
              <tr key={j.id}>
                <td>{["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][j.hari]}</td>
                <td className="num-cell">
                  {j.jam_mulai.slice(0, 5)}–{j.jam_selesai.slice(0, 5)}
                </td>
                <td>{j.kelas?.nama}</td>
                <td>{j.mapel?.nama}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
