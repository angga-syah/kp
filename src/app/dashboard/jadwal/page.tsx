import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HARI, STAF } from "@/lib/roles";
import { hariIni } from "@/lib/waktu";
import { PageHead, one } from "@/components/ui";
import { AutoForm } from "@/components/auto-form";
import { PrintButton } from "@/components/print-button";
import { namaRapi } from "@/lib/format";

export const metadata = { title: "Jadwal pelajaran" };

type J = {
  id: number;
  hari: number;
  jam_mulai: string;
  jam_selesai: string;
  kelas_id: number;
  mapel_id: number;
  guru_id: number | null;
  kelas: { nama: string } | null;
  mapel: { nama: string } | null;
  guru: { nama: string } | null;
};
type Blok = { mulai: string; selesai: string; mapel: string; sub: string; kelasId: number; hari: number };

const rapikan = namaRapi;

export default async function Jadwal({ searchParams }: PageProps<"/dashboard/jadwal">) {
  const p = await requireRole(STAF);
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: kelas }, { data: guru }, { data: saya }] = await Promise.all([
    supabase.from("kelas").select("id, nama").order("nama"),
    supabase.from("guru").select("id, nama").order("nama"),
    supabase.from("guru").select("id").eq("profile_id", p.id).maybeSingle(),
  ]);

  // guru langsung melihat jadwal mengajarnya sendiri; admin melihat kelas pertama
  let kelasId = one(sp.kelas) ?? "";
  let guruId = one(sp.guru) ?? "";
  if (!kelasId && !guruId) {
    if (saya && p.role !== "admin") guruId = String(saya.id);
    else kelasId = String(kelas?.[0]?.id ?? "");
  }
  const modeGuru = !!guruId && !kelasId;

  let q = supabase
    .from("jadwal")
    .select("id, hari, jam_mulai, jam_selesai, kelas_id, mapel_id, guru_id, kelas(nama), mapel(nama), guru(nama)")
    .order("hari")
    .order("jam_mulai");
  q = modeGuru ? q.eq("guru_id", guruId) : q.eq("kelas_id", kelasId || -1);
  const { data } = await q;
  const rows = (data ?? []) as unknown as J[];

  // jam pelajaran berurutan dengan mapel, guru, dan kelas yang sama digabung menjadi satu blok
  const perHari = new Map<number, Blok[]>();
  let sebelum: J | null = null;
  for (const r of rows) {
    const list = perHari.get(r.hari) ?? [];
    const akhir = list[list.length - 1];
    const sambung =
      sebelum &&
      akhir &&
      sebelum.hari === r.hari &&
      sebelum.mapel_id === r.mapel_id &&
      sebelum.guru_id === r.guru_id &&
      sebelum.kelas_id === r.kelas_id &&
      sebelum.jam_selesai === r.jam_mulai;
    if (sambung) akhir.selesai = r.jam_selesai.slice(0, 5);
    else
      list.push({
        mulai: r.jam_mulai.slice(0, 5),
        selesai: r.jam_selesai.slice(0, 5),
        mapel: r.mapel?.nama ?? "—",
        sub: modeGuru ? `Kelas ${r.kelas?.nama ?? "—"}` : r.guru ? rapikan(r.guru.nama) : "Guru belum ditentukan",
        kelasId: r.kelas_id,
        hari: r.hari,
      });
    perHari.set(r.hari, list);
    sebelum = r;
  }
  const hariAda = [1, 2, 3, 4, 5, 6].filter((h) => h <= 5 || perHari.has(h));
  const hariKe = new Date(`${hariIni()}T00:00:00Z`).getUTCDay();
  const admin = p.role === "admin";
  const namaKelas = kelas?.find((k) => String(k.id) === kelasId)?.nama;
  const namaGuru = guru?.find((g) => String(g.id) === guruId)?.nama;
  const jumlahJam = rows.length;

  return (
    <>
      <PageHead
        title="Jadwal pelajaran"
        note={
          modeGuru
            ? `Jadwal mengajar ${rapikan(namaGuru)}: ${jumlahJam} jam pelajaran sepekan.`
            : namaKelas
              ? `Kelas ${namaKelas}: ${jumlahJam} jam pelajaran sepekan.`
              : undefined
        }
        actions={
          <>
            {admin && kelasId && (
              <Link className="btn btn--sm" href={`/dashboard/data/jadwal/baru?kelas_id=${kelasId}`}>
                + Tambah jam pelajaran
              </Link>
            )}
            <PrintButton label="Cetak jadwal" className="btn btn--outline btn--sm" />
          </>
        }
      />

      <div className="filterbar noprint">
        <AutoForm className="filterbar filterbar--inline">
          <label>
            Lihat jadwal kelas
            <select name="kelas" defaultValue={modeGuru ? "" : kelasId}>
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
        </AutoForm>
        <span className="muted">atau</span>
        <AutoForm className="filterbar filterbar--inline">
          <label>
            Jadwal mengajar guru
            <select name="guru" defaultValue={modeGuru ? guruId : ""}>
              <option value="" disabled>
                Pilih guru…
              </option>
              {(guru ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {rapikan(g.nama)}
                </option>
              ))}
            </select>
          </label>
        </AutoForm>
      </div>

      {rows.length === 0 ? (
        <p className="empty-hint">
          Belum ada jadwal untuk pilihan ini.
          {admin && kelasId && (
            <>
              {" "}
              <Link href={`/dashboard/data/jadwal/baru?kelas_id=${kelasId}`}>Tambah jam pelajaran pertama</Link>
            </>
          )}
        </p>
      ) : (
        <div className="pekan">
          {hariAda.map((h) => (
            <section key={h} className={`pekan__hari${h === hariKe ? " is-today" : ""}`} aria-label={HARI[h]}>
              <header className="pekan__judul">
                <h2>{HARI[h]}</h2>
                {h === hariKe && <span className="tag">Hari ini</span>}
              </header>
              {(perHari.get(h) ?? []).length === 0 ? (
                <p className="muted">Tidak ada pelajaran.</p>
              ) : (
                <ol className="pekan__list">
                  {(perHari.get(h) ?? []).map((b, i) => (
                    <li key={i}>
                      <span className="pekan__jam num-cell">
                        {b.mulai}–{b.selesai}
                      </span>
                      <strong>{b.mapel}</strong>
                      <span className="muted">{b.sub}</span>
                    </li>
                  ))}
                </ol>
              )}
              {admin && !modeGuru && (
                <Link className="linkbtn linkbtn--edit noprint" href={`/dashboard/data/jadwal?f_kelas_id=${kelasId}&f_hari=${h}&sort=jam_mulai`}>
                  Ubah jadwal {HARI[h]}
                </Link>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
