import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Notice, PageHead, one } from "@/components/ui";
import { SelectionScope } from "@/components/selection";
import { BarSubmit } from "@/components/bulk-bar";
import { SelectMenu } from "@/components/select-menu";
import { promoteAlumni } from "../../actions";

export const metadata = { title: "Kelulusan" };

type S = { id: number; nama: string; nisn: string | null; nis: string | null; kelas: { nama: string } | null };

export default async function Kelulusan({ searchParams }: PageProps<"/dashboard/admin/kelulusan">) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const ok = one(sp.ok);
  const supabase = await createClient();
  const { data } = await supabase
    .from("siswa")
    .select("id, nama, nisn, nis, kelas!inner(nama, tingkat)")
    .eq("status", "aktif")
    .eq("kelas.tingkat", 12)
    .order("nama");
  const rows = (data ?? []) as unknown as S[];

  return (
    <>
      <PageHead
        title="Kelulusan"
        note="Siswa yang diluluskan otomatis menjadi alumni, begitu juga akunnya."
      />
      <Notice error={one(sp.error)} info={ok ? `${ok} siswa diluluskan dan tercatat sebagai alumni.` : undefined} />

      {rows.length === 0 ? (
        <p className="empty-hint">Tidak ada siswa aktif di kelas XII.</p>
      ) : (
        <SelectionScope
          action={promoteAlumni}
          initial={rows.length}
          bar={<BarSubmit label="Luluskan siswa terpilih" />}
        >
          <div className="filterbar">
            <label>
              Tahun lulus
              <input type="number" name="tahun_lulus" min={1990} max={2100} defaultValue={new Date().getFullYear()} required />
            </label>
            <p className="muted">Hapus centang siswa yang belum lulus, lalu tekan tombol di bawah layar.</p>
          </div>
          <div className="selrow">
            <SelectMenu />
            <span className="muted">Klik baris untuk memilih, tahan Shift untuk memilih rentang.</span>
          </div>
          <div className="tablewrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="table__check">
                    <input type="checkbox" data-selectall defaultChecked aria-label="Pilih semua siswa" />
                  </th>
                  <th>Nama</th>
                  <th>NISN / NIS</th>
                  <th>Kelas</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td className="table__check">
                      <input type="checkbox" name="siswa" value={s.id} data-row defaultChecked aria-label={`Luluskan ${s.nama}`} />
                    </td>
                    <td>{s.nama}</td>
                    <td className="num-cell">{s.nisn || s.nis || "—"}</td>
                    <td>{s.kelas?.nama}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SelectionScope>
      )}
    </>
  );
}
