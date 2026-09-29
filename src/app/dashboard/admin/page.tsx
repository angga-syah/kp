import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HARI, nilaiAkhir } from "@/lib/roles";
import { hariIni, tanggalPanjang } from "@/lib/waktu";
import { PageHead } from "@/components/ui";

export const metadata = { title: "Beranda" };

type Tugas = { teks: string; href: string; aksi: string; selesai?: boolean };

export default async function AdminHome() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const hari = hariIni();
  const hariKe = new Date(`${hari}T00:00:00Z`).getUTCDay();
  const head = (t: string) => supabase.from(t).select("*", { count: "exact", head: true });

  const [{ data: kelas }, { data: siswa }, { data: presensi }, { data: jadwal }, { data: ta }, { data: profil }, konseling, info, alumni, tracer] =
    await Promise.all([
      supabase.from("kelas").select("id, nama").order("nama"),
      supabase.from("siswa").select("id, kelas_id").eq("status", "aktif"),
      supabase.from("presensi").select("siswa_id").eq("tanggal", hari),
      supabase.from("jadwal").select("kelas_id, mapel_id, hari"),
      supabase.from("tahun_ajaran").select("id, nama, semester").eq("aktif", true).limit(1).maybeSingle(),
      supabase.from("profiles").select("role, wajib_ganti_sandi").eq("aktif", true),
      supabase.from("konseling").select("*", { count: "exact", head: true }).eq("status", "diajukan"),
      head("info_karier"),
      head("alumni"),
      head("tracer_respons"),
    ]);
  const { data: nilai } = ta
    ? await supabase.from("nilai").select("siswa_id, mapel_id, tugas, uts, uas").eq("tahun_ajaran_id", ta.id)
    : { data: [] as { siswa_id: number; mapel_id: number; tugas: number | null; uts: number | null; uas: number | null }[] };

  const siswaKelas = new Map<number, number[]>();
  (siswa ?? []).forEach((s) => s.kelas_id && siswaKelas.set(s.kelas_id, [...(siswaKelas.get(s.kelas_id) ?? []), s.id]));
  const sudahHadir = new Set((presensi ?? []).map((r) => r.siswa_id));

  // presensi hari ini: kelas yang punya pelajaran hari ini
  const kelasHariIni = (kelas ?? []).filter((k) => (jadwal ?? []).some((j) => j.kelas_id === k.id && j.hari === hariKe));
  const presensiKelas = kelasHariIni.map((k) => {
    const anggota = siswaKelas.get(k.id) ?? [];
    const terisi = anggota.filter((id) => sudahHadir.has(id)).length;
    return { k, anggota: anggota.length, terisi };
  });
  const belumPresensi = presensiKelas.filter((x) => x.anggota > 0 && x.terisi < x.anggota);

  // nilai semester: berapa mapel (menurut jadwal) yang nilainya sudah lengkap untuk semua siswa kelas itu
  const lengkap = new Set((nilai ?? []).filter((n) => nilaiAkhir(n) !== null).map((n) => `${n.siswa_id}:${n.mapel_id}`));
  const nilaiKelas = (kelas ?? []).map((k) => {
    const mapel = [...new Set((jadwal ?? []).filter((j) => j.kelas_id === k.id).map((j) => j.mapel_id))];
    const anggota = siswaKelas.get(k.id) ?? [];
    const selesai = mapel.filter((m) => anggota.length > 0 && anggota.every((s) => lengkap.has(`${s}:${m}`))).length;
    return { k, total: mapel.length, selesai };
  });

  const belumLogin = (r: string) => (profil ?? []).filter((x) => x.role === r && x.wajib_ganti_sandi).length;
  const guruBelum = belumLogin("guru") + belumLogin("bk");
  const siswaBelum = belumLogin("siswa");

  const tindak: Tugas[] = [
    ...((konseling.count ?? 0) > 0
      ? [{ teks: `${konseling.count} pengajuan konseling menunggu jadwal`, href: "/dashboard/konseling", aksi: "Buka konseling" }]
      : []),
    ...(guruBelum > 0
      ? [{ teks: `${guruBelum} akun guru belum pernah dipakai (kata sandi awal belum diganti)`, href: "/dashboard/admin/pengguna?login=belum", aksi: "Lihat akun guru" }]
      : []),
    ...(siswaBelum > 0
      ? [{ teks: `${siswaBelum} akun siswa belum pernah dipakai`, href: "/dashboard/admin/akun-massal", aksi: "Lihat akun siswa" }]
      : []),
    ...((info.count ?? 0) === 0 ? [{ teks: "Info kampus, beasiswa, dan karier belum diisi", href: "/dashboard/data/info-karier/baru", aksi: "Tambah info" }] : []),
  ];

  return (
    <>
      <PageHead title="Beranda" note={`${tanggalPanjang(hari)}${ta ? ` · Tahun ajaran ${ta.nama}, semester ${ta.semester === 1 ? "ganjil" : "genap"}` : ""}`} />

      <section className="panel-tugas" aria-labelledby="h-presensi">
        <h2 id="h-presensi" className="h2">
          Presensi hari ini
        </h2>
        {hariKe === 0 ? (
          <p className="muted">Hari Minggu, tidak ada pelajaran.</p>
        ) : presensiKelas.length === 0 ? (
          <p className="muted">
            Tidak ada kelas yang berjadwal hari {HARI[hariKe]}. <Link href="/dashboard/jadwal">Lihat jadwal</Link>
          </p>
        ) : (
          <ul className="cek">
            {presensiKelas.map(({ k, anggota, terisi }) => {
              const beres = anggota > 0 && terisi >= anggota;
              return (
                <li key={k.id} data-done={beres}>
                  <span className="cek__tanda" aria-hidden="true">
                    {beres ? "✓" : ""}
                  </span>
                  <span>
                    <strong>{k.nama}</strong>{" "}
                    <span className="muted">{beres ? "sudah diisi" : terisi ? `${terisi} dari ${anggota} siswa terisi` : "belum diisi"}</span>
                  </span>
                  {!beres && (
                    <Link className="btn btn--outline btn--sm" href={`/dashboard/presensi?kelas=${k.id}`}>
                      Isi presensi
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {belumPresensi.length > 0 && <p className="hint">Presensi biasanya diisi guru atau wali kelas; admin juga bisa mengisinya.</p>}
      </section>

      {tindak.length > 0 && (
        <section className="panel-tugas" aria-labelledby="h-tindak">
          <h2 id="h-tindak" className="h2">
            Perlu ditindaklanjuti
          </h2>
          <ul className="cek">
            {tindak.map((t) => (
              <li key={t.teks}>
                <span className="cek__tanda cek__tanda--warn" aria-hidden="true">
                  !
                </span>
                <span>{t.teks}</span>
                <Link className="btn btn--outline btn--sm" href={t.href}>
                  {t.aksi}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel-tugas" aria-labelledby="h-nilai">
        <h2 id="h-nilai" className="h2">
          Nilai semester ini
        </h2>
        {!ta ? (
          <p className="notice notice--error">
            Belum ada tahun ajaran aktif. <Link href="/dashboard/data/tahun-ajaran">Tandai satu tahun ajaran sebagai aktif</Link>
          </p>
        ) : (
          <ul className="cek">
            {nilaiKelas.map(({ k, total, selesai }) => (
              <li key={k.id} data-done={total > 0 && selesai === total}>
                <span className="meter" aria-hidden="true">
                  <span style={{ width: `${total ? (selesai / total) * 100 : 0}%` }} />
                </span>
                <span>
                  <strong>{k.nama}</strong> <span className="muted">{total ? `${selesai} dari ${total} mapel lengkap` : "belum ada jadwal"}</span>
                </span>
                <Link className="btn btn--outline btn--sm" href={`/dashboard/nilai?kelas=${k.id}`}>
                  Lihat nilai
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ul className="stats stats--kecil">
        {[
          { n: siswa?.length ?? 0, l: "Siswa aktif", href: "/dashboard/data/siswa" },
          { n: kelas?.length ?? 0, l: "Kelas", href: "/dashboard/data/kelas" },
          { n: alumni.count ?? 0, l: "Alumni", href: "/dashboard/data/alumni" },
          { n: tracer.count ?? 0, l: "Isi tracer", href: "/dashboard/tracer" },
        ].map((s) => (
          <li key={s.l}>
            <Link href={s.href}>
              <span className="stats__n">{s.n}</span>
              <span className="stats__l">{s.l}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
