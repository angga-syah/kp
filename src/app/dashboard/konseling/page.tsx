import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { PENGELOLA_BK } from "@/lib/roles";
import { isoKeWib, jamWib, ZONA } from "@/lib/waktu";
import { Notice, PageHead, one } from "@/components/ui";
import { ajukanKonseling, updateKonseling } from "../actions";

type K = {
  id: number;
  topik: string;
  status: string;
  jadwal: string | null;
  catatan: string | null;
  created_at: string;
  siswa: { id: number; nama: string; kelas: { nama: string } | null } | null;
  guru: { nama: string } | null;
};

const LABEL: Record<string, string> = {
  diajukan: "Menunggu jadwal",
  dijadwalkan: "Dijadwalkan",
  selesai: "Selesai",
  batal: "Dibatalkan",
};
const TAB = ["aktif", "selesai", "batal", "semua"] as const;
type Tab = (typeof TAB)[number];
const TAB_LABEL: Record<Tab, string> = {
  aktif: "Perlu ditangani",
  selesai: "Selesai",
  batal: "Dibatalkan",
  semua: "Semua",
};
const statusTab = (t: Tab) => (t === "aktif" ? ["diajukan", "dijadwalkan"] : t === "semua" ? null : [t]);

const tanggalAju = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: ZONA });

function StatusTag({ s }: { s: string }) {
  return <span className={`tag tag--${s}`}>{LABEL[s] ?? s}</span>;
}

export const metadata = { title: "Konseling BK" };

export default async function Konseling({ searchParams }: PageProps<"/dashboard/konseling">) {
  const p = await requireRole([...PENGELOLA_BK, "siswa"]);
  const sp = await searchParams;
  const supabase = await createClient();
  const staff = p.role !== "siswa";
  const ok = one(sp.ok);

  if (!staff) {
    const { data } = await supabase
      .from("konseling")
      .select("id, topik, status, jadwal, catatan, created_at, guru(nama)")
      .order("created_at", { ascending: false })
      .limit(50);
    const rows = (data ?? []) as unknown as K[];
    const menunggu = rows.some((k) => k.status === "diajukan");
    return (
      <>
        <PageHead title="Konseling BK" note="Ceritakan apa yang ingin kamu bicarakan; guru BK akan menentukan jadwal pertemuan." />
        <Notice error={one(sp.error)} info={ok === "ajukan" ? "Pengajuan terkirim. Pantau jadwalnya di halaman ini." : undefined} />
        <form action={ajukanKonseling} className="formgrid formgrid--col">
          <label>
            Apa yang ingin kamu konsultasikan?
            <textarea name="topik" rows={3} required maxLength={1000} placeholder="Mis. bingung memilih jurusan kuliah antara teknik dan kedokteran" />
            <span className="hint">Bisa soal karier, jurusan kuliah, belajar, atau pribadi. Isinya hanya dibaca guru BK.</span>
          </label>
          <SubmitButton className="btn" pendingText="Mengirim…">
            Ajukan konseling
          </SubmitButton>
        </form>
        {menunggu && <p className="muted">Pengajuanmu sedang menunggu jadwal dari guru BK.</p>}

        <h2 className="h2">Riwayat pengajuan</h2>
        {rows.length === 0 && <p className="empty-hint">Belum ada pengajuan.</p>}
        <ul className="cards">
          {rows.map((k) => (
            <li key={k.id} className="card">
              <div className="card__top">
                <span className="muted">Diajukan {tanggalAju(k.created_at)}</span>
                <StatusTag s={k.status} />
              </div>
              <p>{k.topik}</p>
              {k.jadwal && k.status !== "batal" && (
                <p>
                  <strong>Jadwal:</strong> {jamWib(k.jadwal)}
                  {k.guru ? ` bersama ${k.guru.nama}` : ""}
                </p>
              )}
              {k.catatan && <p className="muted">Catatan guru BK: {k.catatan}</p>}
            </li>
          ))}
        </ul>
      </>
    );
  }

  const tabIn = one(sp.status) as Tab | undefined;
  // tautan lama ?status=diajukan / dijadwalkan masuk ke tab "Perlu ditangani"
  const tab: Tab = tabIn && TAB.includes(tabIn) ? tabIn : "aktif";
  const hitung = (t: Tab) => {
    const st = statusTab(t);
    const q = supabase.from("konseling").select("*", { count: "exact", head: true });
    return st ? q.in("status", st) : q;
  };
  let lq = supabase
    .from("konseling")
    .select("id, topik, status, jadwal, catatan, created_at, siswa(id, nama, kelas(nama)), guru(nama)")
    .order("created_at", { ascending: tab === "aktif" })
    .limit(200);
  const st = statusTab(tab);
  if (st) lq = lq.in("status", st);
  const [counts, { data }] = await Promise.all([Promise.all(TAB.map(hitung)), lq]);
  const jumlah = Object.fromEntries(TAB.map((t, i) => [t, counts[i].count ?? 0])) as Record<Tab, number>;
  // yang belum dijadwalkan tampil paling atas, lalu yang sudah dijadwalkan menurut waktu pertemuan
  const rows = ((data ?? []) as unknown as K[]).sort((a, b) =>
    tab !== "aktif" ? 0 : a.status !== b.status ? (a.status === "diajukan" ? -1 : 1) : (a.jadwal ?? "").localeCompare(b.jadwal ?? ""),
  );
  const back = tab === "aktif" ? "/dashboard/konseling" : `/dashboard/konseling?status=${tab}`;

  return (
    <>
      <PageHead title="Konseling BK" note="Isi jadwal pertemuan, lalu tandai selesai setelah konseling." />
      <Notice error={one(sp.error)} info={ok === "1" ? "Perubahan konseling disimpan." : undefined} />

      <nav className="tabs" aria-label="Filter status">
        {TAB.map((t) => (
          <Link
            key={t}
            href={t === "aktif" ? "/dashboard/konseling" : `/dashboard/konseling?status=${t}`}
            className="tabs__tab"
            aria-current={tab === t ? "page" : undefined}
          >
            {TAB_LABEL[t]} <span className="tabs__n num-cell">{jumlah[t]}</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 && <p className="empty-hint">{tab === "aktif" ? "Tidak ada pengajuan yang perlu ditangani." : "Tidak ada data."}</p>}

      <ul className="cards">
        {rows.map((k) => (
          <li key={k.id} className="card">
            <div className="card__top">
              <span>
                {k.siswa ? (
                  <Link className="linkbtn linkbtn--edit" href={`/dashboard/profil-siswa/${k.siswa.id}`}>
                    <strong>{k.siswa.nama}</strong>
                  </Link>
                ) : (
                  <strong>—</strong>
                )}{" "}
                <span className="muted">
                  {k.siswa?.kelas?.nama ? `${k.siswa.kelas.nama} · ` : ""}diajukan {tanggalAju(k.created_at)}
                </span>
              </span>
              <StatusTag s={k.status} />
            </div>
            <p>{k.topik}</p>
            {k.guru && <p className="muted">Ditangani {k.guru.nama}</p>}
            <form action={updateKonseling.bind(null, k.id)} className="formgrid formgrid--tight">
              <input type="hidden" name="_back" value={back} />
              <label>
                Status
                <select name="status" defaultValue={k.status}>
                  {Object.entries(LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Jadwal (WIB)
                <input type="datetime-local" name="jadwal" defaultValue={isoKeWib(k.jadwal)} />
              </label>
              <label className="formgrid__wide">
                Catatan (terlihat oleh siswa)
                <textarea name="catatan" rows={2} maxLength={2000} defaultValue={k.catatan ?? ""} placeholder="Mis. tempat pertemuan, atau ringkasan hasil konseling" />
              </label>
              <SubmitButton className="btn btn--outline">Simpan</SubmitButton>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
