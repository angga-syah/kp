import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RIASEC, tipeInfo, type Tipe } from "@/lib/riasec";
import { Notice, PageHead, one } from "@/components/ui";
import { submitAsesmen } from "../../actions";
import { ProgresKuis } from "@/components/progres-kuis";

const SKALA = [
  [1, "Sangat tidak setuju"],
  [2, "Tidak setuju"],
  [3, "Netral"],
  [4, "Setuju"],
  [5, "Sangat setuju"],
] as const;

export const metadata = { title: "Asesmen minat" };

export default async function Asesmen({ searchParams }: PageProps<"/dashboard/siswa/asesmen">) {
  const p = await requireRole(["siswa"]);
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: siswa } = await supabase.from("siswa").select("id").eq("profile_id", p.id).maybeSingle();
  const { data: soal } = await supabase.from("asesmen_soal").select("id, pertanyaan").order("urutan");
  const { data: hasil } = siswa
    ? await supabase
        .from("asesmen_hasil")
        .select("skor, kategori_dominan, created_at")
        .eq("siswa_id", siswa.id)
        .order("created_at", { ascending: false })
        .limit(1)
    : { data: [] };
  const last = hasil?.[0];
  const dominan = last?.kategori_dominan as Tipe | undefined;

  const { data: info } = dominan
    ? await supabase.from("info_karier").select("id, jenis, judul, tautan").eq("kategori_riasec", dominan).limit(6)
    : { data: [] };

  return (
    <>
      <PageHead
        title="Asesmen minat"
        note="Nilai 12 pernyataan dari 1 sampai 5. Hasilnya menunjukkan tipe minat yang paling dominan; ini gambaran awal, bukan penentu jurusan."
      />
      <Notice error={one(sp.error)} />

      {last && dominan && (
        <section className="result">
          <h2 className="h2">Hasil terakhir: {tipeInfo[dominan].judul}</h2>
          <p>{tipeInfo[dominan].ringkas}</p>
          <p className="muted">Contoh bidang: {tipeInfo[dominan].contoh}</p>
          <ul className="bars">
            {RIASEC.map((k) => {
              const skor = (last.skor as Record<string, number>)[k] ?? 0;
              const max = Math.max(...Object.values(last.skor as Record<string, number>), 1);
              return (
                <li key={k}>
                  <span>{tipeInfo[k].judul}</span>
                  <span className="bars__track">
                    <span className="bars__fill" style={{ width: `${(skor / max) * 100}%` }} />
                  </span>
                  <span className="num-cell">{skor}</span>
                </li>
              );
            })}
          </ul>
          {(info ?? []).length > 0 && (
            <>
              <h3 className="h3">Info yang cocok</h3>
              <ul className="plain">
                {(info ?? []).map((i) => (
                  <li key={i.id}>
                    <span className="tag">{i.jenis}</span>{" "}
                    {i.tautan ? (
                      <a href={i.tautan} target="_blank" rel="noreferrer">
                        {i.judul}
                      </a>
                    ) : (
                      i.judul
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {(soal ?? []).length === 0 ? (
        <p className="muted">Soal belum tersedia. Hubungi guru BK.</p>
      ) : (
        <details className="quizwrap" open={!last}>
          <summary className="h2">{last ? "Ulangi asesmen" : "Mulai asesmen"}</summary>
          <p className="muted">Tidak ada jawaban benar atau salah. Pilih angka yang paling menggambarkan dirimu: 1 berarti sangat tidak setuju, 5 berarti sangat setuju.</p>
        <form action={submitAsesmen} className="quiz">
          {(soal ?? []).map((s, i) => (
            <fieldset key={s.id} className="quiz__q">
              <legend>
                <span className="num-cell">{i + 1}.</span> {s.pertanyaan}
              </legend>
              <div className="scale">
                <span className="scale__end scale__end--lo">{SKALA[0][1]}</span>
                <div className="scale__opts" role="radiogroup" aria-label={`Jawaban nomor ${i + 1}`}>
                  {SKALA.map(([v, l]) => (
                    <label key={v} className="scale__opt">
                      <input type="radio" name={`q_${s.id}`} value={v} required aria-label={`${v}, ${l}`} />
                      <span aria-hidden="true">{v}</span>
                    </label>
                  ))}
                </div>
                <span className="scale__end scale__end--hi">{SKALA[4][1]}</span>
              </div>
            </fieldset>
          ))}
          <ProgresKuis total={(soal ?? []).length} label="Lihat hasil" />
        </form>
        </details>
      )}
    </>
  );
}
