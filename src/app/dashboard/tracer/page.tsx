import Link from "next/link";
import { AutoForm } from "@/components/auto-form";
import { requireRole } from "@/lib/auth";
import { STAF } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHead, one } from "@/components/ui";

const LABEL: Record<string, string> = {
  kuliah: "Kuliah",
  bekerja: "Bekerja",
  wirausaha: "Wirausaha",
  mencari_kerja: "Mencari kerja",
  lainnya: "Lainnya",
};

type R = {
  id: number;
  tahun_isi: number;
  status: string;
  institusi: string | null;
  bidang: string | null;
  relevansi: number | null;
  alumni: { nama: string; tahun_lulus: number } | null;
};

export const metadata = { title: "Rekap tracer study" };

export default async function Rekap({ searchParams }: PageProps<"/dashboard/tracer">) {
  await requireRole(STAF);
  const sp = await searchParams;
  const lulus = one(sp.lulus) ?? "";
  const supabase = await createClient();
  const [{ data }, { count: totalAlumni }] = await Promise.all([
    supabase
      .from("tracer_respons")
      .select("id, tahun_isi, status, institusi, bidang, relevansi, alumni(nama, tahun_lulus)")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("alumni").select("*", { count: "exact", head: true }),
  ]);
  const semua = (data ?? []) as unknown as R[];
  const tahunList = [...new Set(semua.map((r) => r.alumni?.tahun_lulus).filter((t): t is number => !!t))].sort((a, b) => b - a);
  const rows = lulus ? semua.filter((r) => String(r.alumni?.tahun_lulus) === lulus) : semua;
  const byStatus = Object.keys(LABEL).map((k) => ({
    k,
    n: rows.filter((r) => r.status === k).length,
  }));
  const rel = rows.map((r) => r.relevansi).filter((n): n is number => n !== null);
  const avg = rel.length ? rel.reduce((a, b) => a + b, 0) / rel.length : null;

  return (
    <>
      <PageHead
        title="Rekap tracer study"
        note={`${rows.length} respons dari ${totalAlumni ?? 0} alumni terdata.`}
        actions={
          <Link href={`/dashboard/tracer/export${lulus ? `?lulus=${lulus}` : ""}`} className="btn btn--outline btn--sm" prefetch={false}>
            Unduh Excel
          </Link>
        }
      />
      {tahunList.length > 1 && (
        <AutoForm>
          <label>
            Tahun lulus
            <select name="lulus" defaultValue={lulus}>
              <option value="">Semua angkatan</option>
              {tahunList.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </AutoForm>
      )}

      <h2 className="h2">Kegiatan setelah lulus</h2>
      <ul className="bars">
        {byStatus.map((s) => (
          <li key={s.k}>
            <span>{LABEL[s.k]}</span>
            <span className="bars__track">
              <span className="bars__fill" style={{ width: `${rows.length ? (s.n / rows.length) * 100 : 0}%` }} />
            </span>
            <span className="num-cell">{s.n}</span>
          </li>
        ))}
      </ul>
      <p className="muted">
        Rata-rata kesesuaian bekal madrasah: {avg === null ? "—" : `${avg.toFixed(2)} dari 5`}
      </p>

      <h2 className="h2">Respons</h2>
      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th>Alumni</th>
              <th>Lulus</th>
              <th>Kegiatan</th>
              <th>Tempat</th>
              <th>Bidang</th>
              <th>Kesesuaian</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="table__empty">Belum ada alumni yang mengisi tracer study.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.alumni?.nama}</td>
                <td className="num-cell">{r.alumni?.tahun_lulus}</td>
                <td>{LABEL[r.status]}</td>
                <td>{r.institusi ?? "—"}</td>
                <td>{r.bidang ?? "—"}</td>
                <td className="num-cell">{r.relevansi ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
