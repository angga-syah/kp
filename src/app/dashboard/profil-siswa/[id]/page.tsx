import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { STAF, nilaiAkhir } from "@/lib/roles";
import { tipeInfo, type Tipe } from "@/lib/riasec";
import { PageHead } from "@/components/ui";
import { hpRapi } from "@/lib/format";

const KONSELING: Record<string, string> = { diajukan: "Menunggu jadwal", dijadwalkan: "Dijadwalkan", selesai: "Selesai", batal: "Dibatalkan" };

type N = {
  id: number;
  tugas: number | null;
  uts: number | null;
  uas: number | null;
  mapel: { nama: string } | null;
  tahun_ajaran: { nama: string; semester: number } | null;
};
type K = { id: number; topik: string; status: string; jadwal: string | null };

export const metadata = { title: "Detail siswa" };

export default async function ProfilSiswa({ params }: PageProps<"/dashboard/profil-siswa/[id]">) {
  const { id } = await params;
  const p = await requireRole(STAF);
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("siswa")
    .select("id, nama, nisn, nis, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_hp, nama_ayah, nama_ibu, nama_wali, status, tahun_lulus, kelas_id, kelas(nama)")
    .eq("id", id)
    .maybeSingle();
  if (!s) notFound();

  const [{ data: nilai }, { data: presensi }, { data: asesmen }, { data: konseling }] = await Promise.all([
    supabase.from("nilai").select("id, tugas, uts, uas, mapel(nama), tahun_ajaran(nama, semester)").eq("siswa_id", s.id),
    supabase.from("presensi").select("status").eq("siswa_id", s.id),
    supabase
      .from("asesmen_hasil")
      .select("kategori_dominan, created_at")
      .eq("siswa_id", s.id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("konseling").select("id, topik, status, jadwal").eq("siswa_id", s.id).order("created_at", { ascending: false }).limit(5),
  ]);

  const rekap = { hadir: 0, izin: 0, sakit: 0, alpa: 0 } as Record<string, number>;
  (presensi ?? []).forEach((r) => (rekap[r.status] += 1));
  const kelasNama = (s.kelas as unknown as { nama: string } | null)?.nama;
  const kelasId = s.kelas_id;
  const dominan = asesmen?.[0]?.kategori_dominan as Tipe | undefined;

  const STATUS: Record<string, string> = { aktif: "Aktif", lulus: "Lulus", pindah: "Pindah", keluar: "Keluar" };
  const waliBeda = s.nama_wali && s.nama_wali !== s.nama_ayah && s.nama_wali !== s.nama_ibu;
  const info: [string, string][] = [
    ["NISN", s.nisn ?? "—"],
    ["NIS", s.nis ?? "—"],
    ["Kelas", kelasNama ?? "—"],
    ["Status", STATUS[s.status] ?? s.status],
    ["Jenis kelamin", s.jenis_kelamin === "L" ? "Laki-laki" : s.jenis_kelamin === "P" ? "Perempuan" : "—"],
    [
      "Tempat, tanggal lahir",
      [s.tempat_lahir, s.tanggal_lahir ? new Date(`${s.tanggal_lahir}T00:00:00Z`).toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "UTC" }) : null]
        .filter(Boolean)
        .join(", ") || "—",
    ],
    ["No. HP", hpRapi(s.no_hp) || "—"],
    ["Orang tua", [s.nama_ayah && `Ayah: ${s.nama_ayah}`, s.nama_ibu && `Ibu: ${s.nama_ibu}`].filter(Boolean).join(" · ") || "—"],
    ...(waliBeda ? [["Wali", s.nama_wali as string] as [string, string]] : []),
    ...(s.status === "lulus" ? [["Tahun lulus", s.tahun_lulus ? String(s.tahun_lulus) : "—"] as [string, string]] : []),
    ["Alamat", s.alamat ?? "—"],
  ];
  const totalHadir = Object.values(rekap).reduce((x, y) => x + y, 0);

  return (
    <>
      <Link className="kembali" href={kelasId ? `/dashboard/data/siswa?f_kelas_id=${kelasId}` : "/dashboard/data/siswa"}>
        ‹ Daftar siswa{kelasNama ? ` ${kelasNama}` : ""}
      </Link>
      <PageHead
        title={s.nama}
        note={kelasNama ? `Kelas ${kelasNama}` : "Belum ditempatkan di kelas"}
        actions={
          <>
            {p.role === "admin" && (
              <Link className="btn btn--sm" href={`/dashboard/data/siswa/${s.id}`}>
                Ubah data
              </Link>
            )}
            <Link className="btn btn--outline btn--sm" href={`/dashboard/rapor?siswa=${s.id}`}>
              Lihat rapor
            </Link>
          </>
        }
      />

      <dl className="detail">
        {info.map(([k, v]) => (
          <div key={k} className={k === "Alamat" ? "detail__wide" : undefined}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <h2 className="h2">Kehadiran</h2>
      {totalHadir === 0 ? (
        <p className="muted">Belum ada catatan kehadiran.</p>
      ) : (
        <ul className="stats stats--kecil">
          {Object.entries(rekap).map(([k, v]) => (
            <li key={k}>
              <span className="stats__n">{v}</span>
              <span className="stats__l">{k[0].toUpperCase() + k.slice(1)}</span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="h2">Nilai</h2>
      {(nilai ?? []).length === 0 ? (
        <p className="muted">Belum ada nilai.</p>
      ) : (
      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th>Mata pelajaran</th>
              <th>Tahun ajaran</th>
              <th>Tugas</th>
              <th>UTS</th>
              <th>UAS</th>
              <th>Akhir</th>
            </tr>
          </thead>
          <tbody>
            {((nilai ?? []) as unknown as N[]).map((n) => {
              const a = nilaiAkhir(n);
              return (
                <tr key={n.id}>
                  <td>{n.mapel?.nama}</td>
                  <td>{n.tahun_ajaran ? `${n.tahun_ajaran.nama} (${n.tahun_ajaran.semester === 1 ? "ganjil" : "genap"})` : "—"}</td>
                  <td className="num-cell">{n.tugas ?? "—"}</td>
                  <td className="num-cell">{n.uts ?? "—"}</td>
                  <td className="num-cell">{n.uas ?? "—"}</td>
                  <td className="num-cell">{a === null ? "—" : a.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      <h2 className="h2">Bimbingan dan konseling</h2>
      <p>
        Tipe minat dominan:{" "}
        {dominan ? (
          <>
            <strong>{tipeInfo[dominan].judul}</strong> — {tipeInfo[dominan].ringkas}
          </>
        ) : (
          <span className="muted">belum mengisi asesmen.</span>
        )}
      </p>
      {((konseling ?? []) as unknown as K[]).length > 0 && (
        <ul className="plain">
          {((konseling ?? []) as unknown as K[]).map((k) => (
            <li key={k.id}>
              <span className={`tag tag--${k.status}`}>{KONSELING[k.status] ?? k.status}</span> {k.topik}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
