import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BOBOT, HARI, nilaiAkhir } from "@/lib/roles";
import { tipeInfo, type Tipe } from "@/lib/riasec";
import { hariIni } from "@/lib/waktu";
import { PageHead } from "@/components/ui";

type J = { id: number; hari: number; jam_mulai: string; jam_selesai: string; mapel: { nama: string } | null; guru: { nama: string } | null };
type N = { id: number; tugas: number | null; uts: number | null; uas: number | null; mapel: { nama: string } | null };

export const metadata = { title: "Beranda siswa" };

export default async function SiswaHome() {
  const p = await requireRole(["siswa"]);
  const supabase = await createClient();
  const { data: siswa } = await supabase
    .from("siswa")
    .select("id, nama, nisn, kelas_id, kelas(nama)")
    .eq("profile_id", p.id)
    .maybeSingle();

  if (!siswa) {
    return (
      <>
        <PageHead title={`Halo, ${p.nama}`} />
        <p className="notice notice--error">Akun Anda belum tertaut ke data siswa. Hubungi admin madrasah.</p>
      </>
    );
  }

  const { data: ta } = await supabase.from("tahun_ajaran").select("id, nama, semester").eq("aktif", true).limit(1).maybeSingle();
  let nq = supabase.from("nilai").select("id, tugas, uts, uas, mapel(nama)").eq("siswa_id", siswa.id);
  if (ta) nq = nq.eq("tahun_ajaran_id", ta.id);
  const [{ data: jadwal }, { data: nilai }, { data: presensi }, { data: asesmen }, { data: konseling }] = await Promise.all([
    siswa.kelas_id
      ? supabase
          .from("jadwal")
          .select("id, hari, jam_mulai, jam_selesai, mapel(nama), guru(nama)")
          .eq("kelas_id", siswa.kelas_id)
          .order("hari")
          .order("jam_mulai")
      : Promise.resolve({ data: [] }),
    nq,
    supabase.from("presensi").select("status").eq("siswa_id", siswa.id),
    supabase.from("asesmen_hasil").select("kategori_dominan").eq("siswa_id", siswa.id).order("created_at", { ascending: false }).limit(1),
    supabase.from("konseling").select("status").eq("siswa_id", siswa.id).in("status", ["diajukan", "dijadwalkan"]),
  ]);

  const rekap = { hadir: 0, izin: 0, sakit: 0, alpa: 0 } as Record<string, number>;
  (presensi ?? []).forEach((r) => (rekap[r.status] += 1));
  const totalHadir = Object.values(rekap).reduce((a, b) => a + b, 0);
  const kelasNama = (siswa.kelas as unknown as { nama: string } | null)?.nama;
  const semuaJadwal = (jadwal ?? []) as unknown as J[];
  const hariKe = new Date(`${hariIni()}T00:00:00Z`).getUTCDay(); // 0 = Minggu
  const hariIniJadwal = semuaJadwal.filter((j) => j.hari === hariKe);
  const tipe = asesmen?.[0]?.kategori_dominan as Tipe | undefined;
  const konselingAktif = konseling?.length ?? 0;

  return (
    <>
      <PageHead title={`Halo, ${siswa.nama}`} note={kelasNama ? `Kelas ${kelasNama}` : "Belum ditempatkan di kelas."} />

      <section className="today" aria-labelledby="hari-ini">
        <h2 id="hari-ini" className="h2">
          Hari ini, {hariKe === 0 ? "Minggu" : HARI[hariKe]}
        </h2>
        {hariIniJadwal.length === 0 ? (
          <p className="muted">{hariKe === 0 ? "Hari libur. Selamat beristirahat." : "Tidak ada jadwal pelajaran hari ini."}</p>
        ) : (
          <ol className="today__list">
            {hariIniJadwal.map((j) => (
              <li key={j.id}>
                <span className="num-cell">
                  {j.jam_mulai.slice(0, 5)}–{j.jam_selesai.slice(0, 5)}
                </span>
                <strong>{j.mapel?.nama}</strong>
                {j.guru && <span className="muted">{j.guru.nama}</span>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <ul className="shortcuts">
        <li>
          <Link href="/dashboard/siswa/asesmen">
            <strong>Asesmen minat</strong>
            <span>{tipe ? `Tipe minatmu: ${tipeInfo[tipe].judul}. Lihat saran jurusan.` : "Belum diisi. Kenali minatmu dalam 5 menit."}</span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard/konseling">
            <strong>Konseling BK</strong>
            <span>{konselingAktif ? `${konselingAktif} pengajuan sedang diproses.` : "Ingin bercerita soal jurusan atau belajar? Ajukan di sini."}</span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard/rapor">
            <strong>Rapor</strong>
            <span>Lihat dan cetak rapor semester ini.</span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard/karier">
            <strong>Info kampus dan beasiswa</strong>
            <span>Peluang kuliah dan beasiswa dari guru BK.</span>
          </Link>
        </li>
      </ul>

      <h2 className="h2">Kehadiran</h2>
      <ul className="stats">
        {Object.entries(rekap).map(([k, v]) => (
          <li key={k}>
            <span>
              <span className="stats__n">{v}</span>
              <span className="stats__l">{k}</span>
            </span>
          </li>
        ))}
      </ul>
      {totalHadir > 0 && <p className="muted">Kehadiran {Math.round((rekap.hadir / totalHadir) * 100)}% dari {totalHadir} hari tercatat.</p>}

      <h2 className="h2">Nilai{ta ? ` ${ta.nama} semester ${ta.semester === 1 ? "ganjil" : "genap"}` : ""}</h2>
      <p className="muted">
        Nilai akhir = tugas {BOBOT.tugas * 100}% + UTS {BOBOT.uts * 100}% + UAS {BOBOT.uas * 100}%. Tanda — berarti nilainya belum diisi guru.
      </p>
      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th>Mata pelajaran</th>
              <th>Tugas</th>
              <th>UTS</th>
              <th>UAS</th>
              <th>Akhir</th>
            </tr>
          </thead>
          <tbody>
            {(nilai ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="table__empty">
                  Belum ada nilai.
                </td>
              </tr>
            )}
            {((nilai ?? []) as unknown as N[]).map((n) => {
              const a = nilaiAkhir(n);
              return (
                <tr key={n.id}>
                  <td>{n.mapel?.nama}</td>
                  <td className="num-cell">{n.tugas ?? "—"}</td>
                  <td className="num-cell">{n.uts ?? "—"}</td>
                  <td className="num-cell">{n.uas ?? "—"}</td>
                  <td className="num-cell">
                    <strong>{a === null ? "—" : a.toFixed(1)}</strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="h2">Jadwal pelajaran sepekan</h2>
      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th>Hari</th>
              <th>Jam</th>
              <th>Mata pelajaran</th>
              <th>Guru</th>
            </tr>
          </thead>
          <tbody>
            {semuaJadwal.length === 0 && (
              <tr>
                <td colSpan={4} className="table__empty">
                  Jadwal belum tersedia.
                </td>
              </tr>
            )}
            {semuaJadwal.map((j, i) => (
              <tr key={j.id} className={j.hari === hariKe ? "is-today" : undefined}>
                <td>{i === 0 || semuaJadwal[i - 1].hari !== j.hari ? <strong>{HARI[j.hari]}</strong> : ""}</td>
                <td className="num-cell">
                  {j.jam_mulai.slice(0, 5)}–{j.jam_selesai.slice(0, 5)}
                </td>
                <td>{j.mapel?.nama}</td>
                <td>{j.guru?.nama ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
