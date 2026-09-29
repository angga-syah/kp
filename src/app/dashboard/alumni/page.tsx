import { requireRole } from "@/lib/auth";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { Notice, PageHead, one } from "@/components/ui";
import { saveTracer } from "../actions";

const STATUS = [
  ["kuliah", "Kuliah"],
  ["bekerja", "Bekerja"],
  ["wirausaha", "Wirausaha"],
  ["mencari_kerja", "Mencari kerja"],
  ["lainnya", "Lainnya"],
];

const PENGHASILAN = ["< 1 juta", "1–3 juta", "3–5 juta", "5–10 juta", "> 10 juta"];
const RELEVANSI = [
  [1, "Tidak berguna"],
  [2, "Kurang berguna"],
  [3, "Cukup berguna"],
  [4, "Berguna"],
  [5, "Sangat berguna"],
] as const;

export const metadata = { title: "Tracer study" };

export default async function AlumniHome({ searchParams }: PageProps<"/dashboard/alumni">) {
  const p = await requireRole(["alumni"]);
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: alumni } = await supabase.from("alumni").select("id, nama").eq("profile_id", p.id).maybeSingle();
  const tahun = new Date().getFullYear();
  const { data: prev } = alumni
    ? await supabase
        .from("tracer_respons")
        .select("*")
        .eq("alumni_id", alumni.id)
        .eq("tahun_isi", tahun)
        .maybeSingle()
    : { data: null };

  if (!alumni) {
    return (
      <>
        <PageHead title={`Halo, ${p.nama}`} />
        <p className="notice notice--error">Akun Anda belum tertaut ke data alumni. Hubungi admin madrasah.</p>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Tracer study"
        note={`Ceritakan kegiatan Anda setelah lulus. Isian tahun ${tahun} dapat diperbarui kapan saja.`}
      />
      <Notice
        error={one(sp.error)}
        info={one(sp.ok) === "1" ? "Terima kasih, jawaban Anda tersimpan. Anda bisa memperbaruinya kapan saja tahun ini." : undefined}
      />
      {prev && one(sp.ok) !== "1" && <p className="muted">Anda sudah mengisi untuk tahun {tahun}. Ubah bila ada yang berubah, lalu simpan.</p>}

      <form action={saveTracer} className="formgrid formgrid--col tracer">
        <fieldset className="formgrid__field">
          <legend>Kegiatan saat ini</legend>
          <span className="seg seg--pilih">
            {STATUS.map(([v, l], i) => (
              <label key={v} className="seg__opt">
                <input type="radio" name="status" value={v} defaultChecked={prev?.status === v} required={i === 0} />
                <span>{l}</span>
              </label>
            ))}
          </span>
        </fieldset>
        <label>
          Nama kampus atau tempat kerja/usaha
          <input name="institusi" defaultValue={prev?.institusi ?? ""} placeholder="Mis. UIN Sultan Maulana Hasanuddin" />
        </label>
        <label>
          Program studi atau bidang pekerjaan
          <input name="bidang" defaultValue={prev?.bidang ?? ""} placeholder="Mis. Pendidikan Agama Islam, atau Perdagangan" />
        </label>
        <label className="tracer__kerja">
          Jabatan
          <input name="jabatan_prodi" defaultValue={prev?.jabatan_prodi ?? ""} placeholder="Mis. Staf administrasi" />
        </label>
        <label className="tracer__kerja">
          Kisaran penghasilan per bulan
          <select name="penghasilan_range" defaultValue={prev?.penghasilan_range ?? ""}>
            <option value="">Tidak ingin mengisi</option>
            {PENGHASILAN.map((r) => (
              <option key={r} value={r}>
                Rp {r}
              </option>
            ))}
          </select>
        </label>
        <label>
          Seberapa berguna bekal dari madrasah untuk kegiatan Anda sekarang?
          <select name="relevansi" defaultValue={prev?.relevansi ?? ""}>
            <option value="">Tidak ingin mengisi</option>
            {RELEVANSI.map(([n, l]) => (
              <option key={n} value={n}>
                {n} — {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Masukan untuk madrasah (opsional)
          <textarea name="masukan" rows={3} defaultValue={prev?.masukan ?? ""} placeholder="Apa yang perlu ditambah atau diperbaiki di madrasah?" />
        </label>
        <SubmitButton className="btn">{prev ? "Simpan perubahan" : "Kirim"}</SubmitButton>
      </form>
    </>
  );
}
