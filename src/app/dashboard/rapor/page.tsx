import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { AutoForm } from "@/components/auto-form";
import { createClient } from "@/lib/supabase/server";
import { nilaiAkhir } from "@/lib/roles";
import { Crest } from "@/components/crest";
import { PageHead, one } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

type N = { id: number; tugas: number | null; uts: number | null; uas: number | null; mapel: { nama: string } | null };

export const metadata = { title: "Rapor" };

export default async function Rapor({ searchParams }: PageProps<"/dashboard/rapor">) {
  const p = await requireRole(["admin", "guru", "bk", "siswa"]);
  const sp = await searchParams;
  const supabase = await createClient();

  let siswaId: string | undefined;
  const kelasId = one(sp.kelas) ?? "";
  if (p.role === "siswa") {
    const { data } = await supabase.from("siswa").select("id").eq("profile_id", p.id).maybeSingle();
    siswaId = data ? String(data.id) : undefined;
  } else {
    siswaId = one(sp.siswa);
  }
  const [daftarKelas, daftarSemua] =
    p.role !== "siswa"
      ? await Promise.all([
          supabase.from("kelas").select("id, nama").order("nama"),
          supabase.from("siswa").select("id, nama, kelas_id").eq("status", "aktif").order("nama").limit(1000),
        ]).then(([k, s]) => [k.data ?? [], s.data ?? []] as const)
      : ([[], []] as const);
  const daftar = kelasId ? daftarSemua.filter((x) => String(x.kelas_id) === kelasId) : daftarSemua;
  // ganti kelas: siswa yang tidak ada di kelas itu tidak ditampilkan
  if (p.role !== "siswa" && kelasId && siswaId && !daftar.some((x) => String(x.id) === siswaId)) siswaId = undefined;
  const urut = daftar.findIndex((x) => String(x.id) === siswaId);
  const hrefSiswa = (id: number) => `/dashboard/rapor?${new URLSearchParams({ ...(kelasId ? { kelas: kelasId } : {}), siswa: String(id) })}`;
  const sebelum = urut > 0 ? daftar[urut - 1] : null;
  const sesudah = urut >= 0 && urut < daftar.length - 1 ? daftar[urut + 1] : null;

  const picker = p.role !== "siswa" && (
    <AutoForm className="filterbar noprint">
      <label>
        Kelas
        <select name="kelas" defaultValue={kelasId}>
          <option value="">Semua kelas</option>
          {daftarKelas.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </select>
      </label>
      <label>
        Siswa
        <select name="siswa" defaultValue={siswaId ?? ""}>
          <option value="" disabled>
            Pilih siswa…
          </option>
          {daftar.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nama}
            </option>
          ))}
        </select>
      </label>
      {(sebelum || sesudah) && (
        <nav className="daynav" aria-label="Pindah siswa">
          {sebelum && (
            <Link className="btn btn--outline btn--sm" href={hrefSiswa(sebelum.id)} title={sebelum.nama}>
              ‹ Sebelumnya
            </Link>
          )}
          {sesudah && (
            <Link className="btn btn--outline btn--sm" href={hrefSiswa(sesudah.id)} title={sesudah.nama}>
              Berikutnya ›
            </Link>
          )}
        </nav>
      )}
    </AutoForm>
  );

  if (!siswaId) {
    return (
      <>
        <PageHead title="Rapor" note={p.role === "siswa" ? "Akun Anda belum tertaut ke data siswa." : "Pilih kelas lalu siswa untuk melihat rapor."} />
        {picker}
      </>
    );
  }

  const { data: s } = await supabase
    .from("siswa")
    .select("id, nama, nisn, nis, kelas(nama, tingkat, jurusan)")
    .eq("id", siswaId)
    .maybeSingle();
  if (!s) {
    return (
      <>
        <PageHead title="Rapor" note="Data siswa tidak ditemukan." />
        {picker}
      </>
    );
  }
  const kelas = s.kelas as unknown as { nama: string; tingkat: number; jurusan: string | null } | null;

  const { data: ta } = await supabase.from("tahun_ajaran").select("id, nama, semester").eq("aktif", true).limit(1);
  const aktif = ta?.[0];
  let q = supabase.from("nilai").select("id, tugas, uts, uas, mapel(nama)").eq("siswa_id", s.id);
  if (aktif) q = q.eq("tahun_ajaran_id", aktif.id);
  const [{ data: nilai }, { data: presensi }] = await Promise.all([
    q,
    supabase.from("presensi").select("status").eq("siswa_id", s.id),
  ]);

  const rows = ((nilai ?? []) as unknown as N[]).map((n) => ({ ...n, akhir: nilaiAkhir(n) }));
  const akhirs = rows.map((r) => r.akhir).filter((a): a is number => a !== null);
  const rata = akhirs.length ? akhirs.reduce((a, b) => a + b, 0) / akhirs.length : null;
  const rekap = { hadir: 0, izin: 0, sakit: 0, alpa: 0 } as Record<string, number>;
  (presensi ?? []).forEach((r) => (rekap[r.status] += 1));

  return (
    <>
      <div className="noprint">
        <PageHead title="Rapor" actions={<PrintButton label="Cetak rapor" className="btn btn--sm" />} />
      </div>
      {picker}

      <article className="rapor">
        <header className="kop">
          <Crest size={72} />
          <div>
            <p className="kop__yay">Yayasan Pendidikan Islam Al-Riyadhul Janah</p>
            <p className="kop__nama">Madrasah Aliyah Al-Riyadhul Janah</p>
            <p className="kop__alamat">Jl. Johar Atmaja, Kp. Kaburon, Desa Maja, Kec. Maja, Kab. Lebak, Banten</p>
          </div>
        </header>

        <h2 className="rapor__judul">Laporan hasil belajar</h2>
        <dl className="rapor__id">
          <div><dt>Nama</dt><dd>{s.nama}</dd></div>
          <div><dt>NISN</dt><dd>{s.nisn ?? "—"}</dd></div>
          <div><dt>Kelas</dt><dd>{kelas?.nama ?? "—"}</dd></div>
          <div>
            <dt>Tahun ajaran</dt>
            <dd>{aktif ? `${aktif.nama}, semester ${aktif.semester === 1 ? "ganjil" : "genap"}` : "—"}</dd>
          </div>
        </dl>

        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Mata pelajaran</th>
                <th>Tugas</th>
                <th>UTS</th>
                <th>UAS</th>
                <th>Nilai akhir</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="table__empty">Belum ada nilai.</td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.mapel?.nama}</td>
                  <td className="num-cell">{r.tugas ?? "—"}</td>
                  <td className="num-cell">{r.uts ?? "—"}</td>
                  <td className="num-cell">{r.uas ?? "—"}</td>
                  <td className="num-cell">{r.akhir === null ? "—" : r.akhir.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="rapor__rata">Rata-rata nilai akhir: <strong>{rata === null ? "—" : rata.toFixed(1)}</strong></p>

        <p className="rapor__rekap">
          Kehadiran — Hadir {rekap.hadir} · Izin {rekap.izin} · Sakit {rekap.sakit} · Alpa {rekap.alpa}
        </p>

        <div className="rapor__ttd">
          <div><p>Wali kelas</p></div>
          <div><p>Kepala madrasah</p></div>
        </div>
      </article>
    </>
  );
}
