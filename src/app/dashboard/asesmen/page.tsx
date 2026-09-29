import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RIASEC, tipeInfo, type Tipe } from "@/lib/riasec";
import { PageHead } from "@/components/ui";
import { STAF } from "@/lib/roles";

type R = {
  siswa_id: number;
  kategori_dominan: Tipe;
  created_at: string;
  siswa: { nama: string; kelas: { nama: string } | null } | null;
};

export const metadata = { title: "Hasil asesmen" };

export default async function HasilAsesmen() {
  await requireRole(STAF);
  const supabase = await createClient();
  const [{ data }, { count: aktif }] = await Promise.all([
    supabase
      .from("asesmen_hasil")
      .select("siswa_id, kategori_dominan, created_at, siswa(nama, kelas(nama))")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("siswa").select("*", { count: "exact", head: true }).eq("status", "aktif"),
  ]);

  const terbaru = new Map<number, R>();
  ((data ?? []) as unknown as R[]).forEach((r) => {
    if (!terbaru.has(r.siswa_id)) terbaru.set(r.siswa_id, r);
  });
  const rows = [...terbaru.values()];
  const dist = RIASEC.map((k) => ({ k, n: rows.filter((r) => r.kategori_dominan === k).length }));

  return (
    <>
      <PageHead
        title="Hasil asesmen minat"
        note={`${rows.length} dari ${aktif ?? 0} siswa aktif sudah mengisi (hasil terbaru per siswa).`}
      />

      <h2 className="h2">Sebaran tipe dominan</h2>
      <ul className="bars">
        {dist.map((d) => (
          <li key={d.k}>
            <span>{tipeInfo[d.k].judul}</span>
            <span className="bars__track">
              <span className="bars__fill" style={{ width: `${rows.length ? (d.n / rows.length) * 100 : 0}%` }} />
            </span>
            <span className="num-cell">{d.n}</span>
          </li>
        ))}
      </ul>

      <h2 className="h2">Per siswa</h2>
      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th>Siswa</th>
              <th>Kelas</th>
              <th>Tipe dominan</th>
              <th>Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="table__empty">
                  Belum ada siswa yang mengisi asesmen.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.siswa_id}>
                <td>
                  <Link className="linkbtn linkbtn--edit" href={`/dashboard/profil-siswa/${r.siswa_id}`}>
                    {r.siswa?.nama}
                  </Link>
                </td>
                <td>{r.siswa?.kelas?.nama ?? "—"}</td>
                <td>
                  <span className="tag">{tipeInfo[r.kategori_dominan]?.judul ?? r.kategori_dominan}</span>
                </td>
                <td className="num-cell">{new Date(r.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
