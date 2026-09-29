import { requireRole } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui";
import { geserHari, hariIni } from "@/lib/waktu";

const JENIS = [
  ["kampus", "Kampus"],
  ["beasiswa", "Beasiswa"],
  ["karier", "Karier"],
] as const;

export const metadata = { title: "Info karier" };

export default async function Karier() {
  await requireRole(ROLES);
  const supabase = await createClient();
  const { data } = await supabase
    .from("info_karier")
    .select("id, jenis, judul, deskripsi, tautan, batas_waktu")
    .order("created_at", { ascending: false });

  const hari = hariIni();
  const segera = geserHari(hari, 14);
  const ada = JENIS.filter(([k]) => (data ?? []).some((d) => d.jenis === k));

  return (
    <>
      <PageHead title="Info karier" note="Kampus, beasiswa, dan peluang karier yang dikurasi guru BK. Klik judul untuk membuka situs resminya." />
      {(data ?? []).length === 0 && <p className="empty-hint">Belum ada informasi. Guru BK akan menambahkannya di sini.</p>}
      {ada.length > 1 && (
        <nav className="tabs" aria-label="Lompat ke jenis info">
          {ada.map(([k, label]) => (
            <a key={k} href={`#${k}`} className="tabs__tab">
              {label} <span className="tabs__n num-cell">{(data ?? []).filter((d) => d.jenis === k).length}</span>
            </a>
          ))}
        </nav>
      )}
      {JENIS.map(([k, label]) => {
        // yang batas waktunya belum lewat tampil dulu, yang terdekat paling atas
        const items = (data ?? [])
          .filter((d) => d.jenis === k)
          .sort((a, b) => {
            const lewatA = !!a.batas_waktu && a.batas_waktu < hari;
            const lewatB = !!b.batas_waktu && b.batas_waktu < hari;
            if (lewatA !== lewatB) return lewatA ? 1 : -1;
            return (a.batas_waktu ?? "9999").localeCompare(b.batas_waktu ?? "9999");
          });
        if (!items.length) return null;
        return (
          <section key={k} id={k}>
            <h2 className="h2">{label}</h2>
            <ul className="index index--plain">
              {items.map((i) => (
                <li key={i.id} className="entry">
                  <strong>
                    {i.tautan ? (
                      <a href={i.tautan} target="_blank" rel="noreferrer">
                        {i.judul} ↗
                      </a>
                    ) : (
                      i.judul
                    )}
                  </strong>
                  {i.deskripsi && <p className="muted">{i.deskripsi}</p>}
                  {i.batas_waktu && (
                    <p className="muted num-cell">
                      Batas: {new Date(`${i.batas_waktu}T12:00:00`).toLocaleDateString("id-ID", { dateStyle: "long" })}{" "}
                      {i.batas_waktu < hari ? (
                        <span className="tag tag--batal">Sudah lewat</span>
                      ) : i.batas_waktu <= segera ? (
                        <span className="tag tag--diajukan">Segera berakhir</span>
                      ) : null}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
