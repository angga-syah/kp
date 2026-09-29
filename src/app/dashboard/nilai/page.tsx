import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { kelasBolehIsi, mapelBolehIsi } from "@/lib/akses";
import { BOBOT, PENGAJAR, nilaiAkhir } from "@/lib/roles";
import { Notice, PageHead, one } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { GridNav } from "@/components/grid-nav";
import { AutoForm, JagaPerubahan } from "@/components/auto-form";
import { saveNilai } from "../actions";

export const metadata = { title: "Nilai" };

type NilaiRow = { tugas: number | null; uts: number | null; uas: number | null };

export default async function Nilai({ searchParams }: PageProps<"/dashboard/nilai">) {
  const p = await requireRole(PENGAJAR);
  const sp = await searchParams;
  const supabase = await createClient();
  const boleh = await kelasBolehIsi(supabase, p);

  let kq = supabase.from("kelas").select("id, nama").order("nama");
  if (boleh) kq = kq.in("id", boleh.length ? boleh : [-1]);
  const [{ data: kelas }, { data: semuaMapel }, { data: ta }] = await Promise.all([
    kq,
    supabase.from("mapel").select("id, nama").order("nama"),
    supabase.from("tahun_ajaran").select("id, nama, semester").eq("aktif", true).limit(1),
  ]);
  const aktif = ta?.[0];
  const kelasId = one(sp.kelas) ?? (kelas?.length === 1 ? String(kelas[0].id) : "");
  const diizinkan = !!kelas?.some((k) => String(k.id) === kelasId);
  const namaKelas = kelas?.find((k) => String(k.id) === kelasId)?.nama;

  const mapelBoleh = diizinkan ? await mapelBolehIsi(supabase, p, Number(kelasId)) : [];
  const mapel = (semuaMapel ?? []).filter((m) => !mapelBoleh || mapelBoleh.includes(m.id));
  const mapelIn = one(sp.mapel);
  const mapelId = mapelIn && mapel.some((m) => String(m.id) === mapelIn) ? mapelIn : mapel.length === 1 ? String(mapel[0].id) : "";
  const mapelOk = mapel.some((m) => String(m.id) === mapelId);
  const namaMapel = mapel.find((m) => String(m.id) === mapelId)?.nama;

  let siswa: { id: number; nama: string }[] = [];
  const existing = new Map<number, NilaiRow>();
  if (mapelOk && aktif && diizinkan) {
    const { data } = await supabase
      .from("siswa")
      .select("id, nama")
      .eq("kelas_id", kelasId)
      .eq("status", "aktif")
      .order("nama");
    siswa = data ?? [];
    if (siswa.length) {
      const { data: nl } = await supabase
        .from("nilai")
        .select("siswa_id, tugas, uts, uas")
        .eq("mapel_id", mapelId)
        .eq("tahun_ajaran_id", aktif.id)
        .in("siswa_id", siswa.map((s) => s.id));
      (nl ?? []).forEach((n) => existing.set(n.siswa_id, n));
    }
  }
  const lengkap = siswa.filter((s) => nilaiAkhir(existing.get(s.id) ?? { tugas: null, uts: null, uas: null }) !== null).length;

  return (
    <>
      <PageHead
        title="Nilai"
        note={
          aktif
            ? `${aktif.nama}, semester ${aktif.semester === 1 ? "ganjil" : "genap"}. Nilai akhir: tugas ${BOBOT.tugas * 100}%, UTS ${BOBOT.uts * 100}%, UAS ${BOBOT.uas * 100}%.`
            : undefined
        }
      />
      <Notice error={one(sp.error)} info={one(sp.ok) === "1" ? `Nilai ${namaMapel ?? ""} kelas ${namaKelas ?? ""} tersimpan.` : undefined} />
      {!aktif && (
        <p className="notice notice--error">
          Belum ada tahun ajaran aktif. {p.role === "admin" ? <Link href="/dashboard/data/tahun-ajaran">Tandai satu tahun ajaran sebagai aktif.</Link> : "Minta admin menandai satu tahun ajaran sebagai aktif."}
        </p>
      )}
      {boleh && boleh.length === 0 && (
        <p className="notice notice--error">
          Belum ada kelas yang ditugaskan kepada Anda. Minta admin menautkan Anda pada menu Jadwal atau sebagai wali kelas.
        </p>
      )}

      <AutoForm>
        <label>
          Kelas
          <select name="kelas" defaultValue={kelasId} required>
            <option value="" disabled>
              Pilih kelas…
            </option>
            {(kelas ?? []).map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>
        </label>
        {/* key memaksa pilihan mapel direset saat kelas berganti */}
        <label key={kelasId}>
          Mata pelajaran
          <select name="mapel" defaultValue={mapelOk ? mapelId : ""} disabled={!diizinkan}>
            <option value="" disabled>
              {diizinkan ? "Pilih mata pelajaran…" : "Pilih kelas dulu"}
            </option>
            {mapel.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nama}
              </option>
            ))}
          </select>
        </label>
        <noscript>
          <button className="btn btn--outline" type="submit">
            Tampilkan
          </button>
        </noscript>
      </AutoForm>

      {!kelasId && <p className="empty-hint">Pilih kelas, lalu mata pelajaran, untuk mulai mengisi nilai.</p>}
      {kelasId && !diizinkan && <p className="notice notice--error">Anda tidak memiliki akses ke kelas ini.</p>}
      {diizinkan && mapel.length === 0 && (
        <p className="notice notice--error">Anda belum punya jadwal mengajar di kelas ini. Minta admin menambahkannya di menu Jadwal.</p>
      )}
      {diizinkan && mapel.length > 0 && !mapelOk && (
        <p className="empty-hint">Pilih mata pelajaran untuk kelas {namaKelas}.</p>
      )}

      {aktif && mapelOk && diizinkan && (
        <form action={saveNilai} className="sheet">
          <input type="hidden" name="kelas" value={kelasId} />
          <input type="hidden" name="mapel" value={mapelId} />
          <div className="sheet__head">
            <h2 className="h2">
              {namaMapel} · {namaKelas}
            </h2>
            {siswa.length > 0 && (
              <span className={`tag${lengkap < siswa.length ? " tag--warn" : ""}`}>
                {lengkap} dari {siswa.length} siswa lengkap
              </span>
            )}
          </div>
          {siswa.length > 0 && (
            <details className="tips-lipat">
              <summary>Tips mengisi lebih cepat</summary>
              <ul className="tips">
                <li>Nilai 0–100, boleh desimal. Kosongkan bila belum ada.</li>
                <li>Tekan Enter atau panah atas/bawah untuk pindah baris.</li>
                <li>Bisa tempel satu atau beberapa kolom langsung dari Excel.</li>
              </ul>
            </details>
          )}
          <GridNav bobot={BOBOT}>
            <div className="tablewrap">
              <table className="table table--nilai">
                <thead>
                  <tr>
                    <th className="num-cell">No</th>
                    <th>Siswa</th>
                    <th>Tugas</th>
                    <th>UTS</th>
                    <th>UAS</th>
                    <th>Akhir</th>
                  </tr>
                </thead>
                <tbody>
                  {siswa.length === 0 && (
                    <tr>
                      <td colSpan={6} className="table__empty">
                        Belum ada siswa aktif di kelas ini.
                      </td>
                    </tr>
                  )}
                  {siswa.map((s, ri) => {
                    const n = existing.get(s.id) ?? { tugas: null, uts: null, uas: null };
                    const akhir = nilaiAkhir(n);
                    return (
                      <tr key={s.id}>
                        <td className="num-cell muted">{ri + 1}</td>
                        <td>{s.nama}</td>
                        {(["tugas", "uts", "uas"] as const).map((k) => (
                          <td key={k}>
                            <input
                              className="num"
                              type="number"
                              inputMode="decimal"
                              min={0}
                              max={100}
                              step="0.01"
                              name={`${k}_${s.id}`}
                              data-col={k}
                              data-r={ri}
                              defaultValue={n[k] ?? ""}
                              aria-label={`${k.toUpperCase()} ${s.nama}`}
                            />
                          </td>
                        ))}
                        <td className="num-cell akhir" data-akhir={ri}>
                          {akhir === null ? "—" : akhir.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GridNav>
          {siswa.length > 0 && (
            <div className="savebar">
              <SubmitButton>Simpan nilai</SubmitButton>
              <JagaPerubahan />
            </div>
          )}
        </form>
      )}
    </>
  );
}
