import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { geserHari, hariIni, jamWib } from "@/lib/waktu";
import { PageHead } from "@/components/ui";

export const metadata = { title: "Ringkasan" };

type J = { id: number; topik: string; jadwal: string; siswa: { id: number; nama: string; kelas: { nama: string } | null } | null };

export default async function BkHome() {
  const p = await requireRole(["bk"]);
  const supabase = await createClient();
  const hari = hariIni();
  const awal = new Date(`${hari}T00:00:00+07:00`).toISOString();
  const sepekan = new Date(`${geserHari(hari, 7)}T00:00:00+07:00`).toISOString();

  const [menunggu, { data: jadwal }, asesmen, siswaAktif] = await Promise.all([
    supabase.from("konseling").select("*", { count: "exact", head: true }).eq("status", "diajukan"),
    supabase
      .from("konseling")
      .select("id, topik, jadwal, siswa(id, nama, kelas(nama))")
      .eq("status", "dijadwalkan")
      .gte("jadwal", awal)
      .lt("jadwal", sepekan)
      .order("jadwal"),
    supabase.from("asesmen_hasil").select("siswa_id").limit(5000),
    supabase.from("siswa").select("*", { count: "exact", head: true }).eq("status", "aktif"),
  ]);
  const sudahAsesmen = new Set((asesmen.data ?? []).map((a) => a.siswa_id)).size;
  const rows = (jadwal ?? []) as unknown as J[];

  return (
    <>
      <PageHead title={`Halo, ${p.nama}`} note="Ringkasan bimbingan konseling dan karier." />

      <ul className="stats">
        <li>
          <Link href="/dashboard/konseling?status=diajukan">
            <span className="stats__n">{menunggu.count ?? 0}</span>
            <span className="stats__l">Menunggu jadwal</span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard/konseling?status=dijadwalkan">
            <span className="stats__n">{rows.length}</span>
            <span className="stats__l">Jadwal 7 hari ke depan</span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard/asesmen">
            <span className="stats__n">
              {sudahAsesmen}/{siswaAktif.count ?? 0}
            </span>
            <span className="stats__l">Siswa sudah asesmen minat</span>
          </Link>
        </li>
      </ul>

      {(menunggu.count ?? 0) > 0 && (
        <p className="notice">
          Ada {menunggu.count} pengajuan konseling menunggu jadwal. <Link href="/dashboard/konseling">Tentukan jadwal</Link>
        </p>
      )}

      <h2 className="h2">Jadwal konseling terdekat</h2>
      {rows.length === 0 ? (
        <p className="empty-hint">Tidak ada jadwal konseling dalam 7 hari ke depan.</p>
      ) : (
        <ul className="cards">
          {rows.map((k) => (
            <li key={k.id} className="card">
              <div className="card__top">
                <strong>{jamWib(k.jadwal)}</strong>
                {k.siswa && (
                  <Link className="linkbtn linkbtn--edit" href={`/dashboard/profil-siswa/${k.siswa.id}`}>
                    {k.siswa.nama}
                    {k.siswa.kelas ? ` · ${k.siswa.kelas.nama}` : ""}
                  </Link>
                )}
              </div>
              <p>{k.topik}</p>
            </li>
          ))}
        </ul>
      )}

      <ul className="shortcuts">
        <li>
          <Link href="/dashboard/konseling">
            <strong>Konseling</strong>
            <span>Jadwalkan pertemuan dan catat hasilnya.</span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard/data/info-karier">
            <strong>Info karier</strong>
            <span>Kelola info kampus, beasiswa, dan lowongan untuk siswa dan alumni.</span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard/tracer">
            <strong>Tracer study</strong>
            <span>Pantau kegiatan alumni setelah lulus.</span>
          </Link>
        </li>
      </ul>
    </>
  );
}
