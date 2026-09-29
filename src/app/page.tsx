import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import { Crest, StarPattern } from "@/components/crest";

const layanan = [
  {
    nama: "Sistem Akademik",
    deskripsi:
      "Data siswa dan guru, kelas, jadwal pelajaran, presensi harian, dan nilai. Siswa melihat jadwal serta nilainya sendiri kapan saja.",
    fitur: ["Presensi harian per kelas", "Input nilai tugas, UTS, UAS", "Rapor siap cetak", "Jadwal pelajaran", "Impor data siswa dari EMIS"],
    pengguna: ["Admin", "Guru", "Siswa"],
    utama: true,
  },
  {
    nama: "Career Guidance",
    deskripsi:
      "Asesmen minat, rekomendasi bidang studi, info kampus dan beasiswa, serta jadwal konseling dengan guru BK.",
    pengguna: ["Siswa", "Guru BK"],
  },
  {
    nama: "Tracer Study Alumni",
    deskripsi: "Kuesioner kegiatan setelah lulus dan rekap untuk kebutuhan akreditasi madrasah.",
    pengguna: ["Alumni", "Admin", "Guru BK"],
  },
];

type Konten = { id: number; bagian: string; judul: string | null; isi: string; urutan: number };
type Prestasi = { id: number; tahun: number; judul: string; tingkat: string | null; keterangan: string | null };
type Berita = { id: number; judul: string; isi: string; created_at: string };
type Statistik = { siswa: number; guru: number; kelas: number; alumni: number };

export const revalidate = 60;

const ALAMAT = "Jl. Johar Atmaja, Kp. Kaburon, Desa Maja, Kec. Maja, Kab. Lebak, Banten";

async function ambilData() {
  try {
    const supabase = createPublicClient();
    const [k, p, n, s] = await Promise.all([
      supabase.from("konten_profil").select("id, bagian, judul, isi, urutan").order("urutan").order("id"),
      supabase.from("prestasi").select("id, tahun, judul, tingkat, keterangan").order("tahun", { ascending: false }).order("id").limit(12),
      supabase.from("pengumuman").select("id, judul, isi, created_at").order("created_at", { ascending: false }).limit(3),
      supabase.rpc("statistik_publik"),
    ]);
    return {
      konten: (k.data ?? []) as Konten[],
      prestasi: (p.data ?? []) as Prestasi[],
      pengumuman: (n.data ?? []) as Berita[],
      statistik: (s.data ?? null) as Statistik | null,
    };
  } catch {
    return { konten: [], prestasi: [], pengumuman: [], statistik: null };
  }
}

export default async function Home() {
  const { konten, prestasi, pengumuman, statistik } = await ambilData();
  const bagian = (b: string) => konten.filter((x) => x.bagian === b);
  const profil = bagian("profil");
  const sambutan = bagian("sambutan");
  const visi = bagian("visi");
  const misi = bagian("misi");
  const kontak = bagian("kontak");
  const kegiatan = [
    { judul: "Program unggulan", items: bagian("program") },
    { judul: "Fasilitas", items: bagian("fasilitas") },
    { judul: "Ekstrakurikuler", items: bagian("ekstrakurikuler") },
  ].filter((g) => g.items.length > 0);

  const angka = statistik
    ? [
        { n: statistik.siswa, l: "Siswa aktif" },
        { n: statistik.guru, l: "Guru dan pendidik" },
        { n: statistik.kelas, l: "Kelas" },
        ...(statistik.alumni > 0 ? [{ n: statistik.alumni, l: "Alumni terdata" }] : []),
      ].filter((a) => a.n > 0)
    : [];

  const tautan = [
    { href: "#profil", label: "Profil", ada: true },
    { href: "#program", label: "Program", ada: kegiatan.length > 0 || visi.length + misi.length > 0 },
    { href: "#prestasi", label: "Prestasi", ada: prestasi.length > 0 },
    { href: "#kontak", label: "Kontak", ada: true },
  ].filter((t) => t.ada);

  return (
    <>
      <header className="band">
        <div className="wrap band__in">
          <Link href="/" className="brand">
            <Crest size={44} />
            <span>
              <span className="brand__name">MA Al-Riyadhul Janah</span>
              <span className="brand__sub">Yayasan Al-Riyadhul Janah · Maja, Lebak</span>
            </span>
          </Link>
          <nav className="band__nav" aria-label="Bagian halaman">
            {tautan.map((t) => (
              <a key={t.href} href={t.href}>
                {t.label}
              </a>
            ))}
          </nav>
          <Link href="/masuk" className="btn btn--gold">
            Masuk
          </Link>
        </div>
      </header>

      <main id="konten">
        <section className="wrap hero">
          <div className="hero__text">
            <h1>Satu portal untuk siswa, guru, dan alumni.</h1>
            <p>
              Portal resmi Madrasah Aliyah Al-Riyadhul Janah untuk mengelola akademik,
              membimbing karier siswa, dan menjaga hubungan dengan alumni.
            </p>
            <Link href="/masuk" className="btn">
              Masuk ke portal
            </Link>
          </div>
          <div className="hero__panel">
            <StarPattern id="hero-star" />
            <Crest size={136} />
            <p className="hero__cap">
              <strong>Terakreditasi B</strong>
              <span className="nowrap">BAN-SM No. 1346/BAN-SM/SK/2021</span>
            </p>
          </div>
        </section>

        {angka.length > 0 && (
          <section className="wrap section" aria-label="Madrasah dalam angka">
            <ul className="stats">
              {angka.map((a) => (
                <li key={a.l}>
                  <span>
                    <span className="stats__n">{a.n}</span>
                    <span className="stats__l">{a.l}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section id="profil" className="tone-2">
          <div className="wrap section">
            <h2 className="section__title">Profil madrasah</h2>
            {profil.length > 0 ? (
              <div className="profile">
                <p className="profile__lead">{profil[0].isi}</p>
                <dl className="facts facts--stack">
                  {profil.slice(1).map((p) => (
                    <div key={p.id}>
                      <dt>{p.judul}</dt>
                      <dd>{p.isi}</dd>
                    </div>
                  ))}
                  <div>
                    <dt>Alamat</dt>
                    <dd>{ALAMAT}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <dl className="facts">
                <div>
                  <dt>Alamat</dt>
                  <dd>{ALAMAT}</dd>
                </div>
                <div>
                  <dt>Yayasan</dt>
                  <dd>Yayasan Pendidikan Islam Al-Riyadhul Janah</dd>
                </div>
                <div>
                  <dt>Akreditasi</dt>
                  <dd>
                    B
                    <span className="nowrap muted">BAN-SM Nomor 1346/BAN-SM/SK/2021</span>
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </section>

        {sambutan.length > 0 && (
          <section className="wrap section">
            <h2 className="section__title">Sambutan kepala madrasah</h2>
            {sambutan.map((s) => (
              <div key={s.id} className="letter">
                <p>{s.isi}</p>
                {s.judul && <p className="letter__from">{s.judul}</p>}
              </div>
            ))}
          </section>
        )}

        {(visi.length > 0 || misi.length > 0) && (
          <section id="program" className="wrap section">
            <div className="vm">
              {visi.length > 0 && (
                <div>
                  <h2 className="section__title">Visi</h2>
                  {visi.map((v) => (
                    <p key={v.id} className="vm__text">
                      {v.isi}
                    </p>
                  ))}
                </div>
              )}
              {misi.length > 0 && (
                <div>
                  <h2 className="section__title">Misi</h2>
                  <ol className="vm__list">
                    {misi.map((m) => (
                      <li key={m.id}>{m.isi}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </section>
        )}

        {kegiatan.length > 0 && (
          <section id={visi.length + misi.length > 0 ? undefined : "program"} className="tone-2">
            <div className="wrap section">
              {kegiatan.map((g) => (
                <div key={g.judul} className="group">
                  <h2 className="section__title">{g.judul}</h2>
                  <ul className="programs">
                    {g.items.map((i) => (
                      <li key={i.id}>
                        {i.judul && <h3>{i.judul}</h3>}
                        <p>{i.isi}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="wrap section">
          <h2 className="section__title">Tiga layanan, satu akun</h2>
          <div className="services">
            {layanan.map((l) => (
              <Link key={l.nama} href="/masuk" className={`service${l.utama ? " service--main" : ""}`}>
                <h3>{l.nama}</h3>
                <p>{l.deskripsi}</p>
                {"fitur" in l && l.fitur && (
                  <ul className="service__list">
                    {l.fitur.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                )}
                <ul className="service__who">
                  {l.pengguna.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>
        </section>

        {prestasi.length > 0 && (
          <section id="prestasi" className="tone-2">
            <div className="wrap section">
              <h2 className="section__title">Prestasi</h2>
              <ul className="achievements">
                {prestasi.map((p) => (
                  <li key={p.id}>
                    <span className="achievements__year num-cell">{p.tahun}</span>
                    <span>
                      <strong>{p.judul}</strong>
                      {p.keterangan && <span className="achievements__note">{p.keterangan}</span>}
                    </span>
                    {p.tingkat && <span className="tag">{p.tingkat}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {pengumuman.length > 0 && (
          <section className="wrap section">
            <h2 className="section__title">Pengumuman</h2>
            <ul className="news">
              {pengumuman.map((n) => (
                <li key={n.id}>
                  <h3>{n.judul}</h3>
                  <p className="num-cell">
                    {new Date(n.created_at).toLocaleDateString("id-ID", { dateStyle: "long" })}
                  </p>
                  <p>{n.isi}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section id="kontak" className="wrap section">
          <h2 className="section__title">Kontak dan lokasi</h2>
          <dl className="facts">
            <div>
              <dt>Alamat</dt>
              <dd>{ALAMAT}</dd>
            </div>
            {kontak.map((k) => (
              <div key={k.id}>
                <dt>{k.judul ?? "Kontak"}</dt>
                <dd>{k.isi}</dd>
              </div>
            ))}
            <div>
              <dt>Peta</dt>
              <dd>
                <a
                  className="btn btn--outline btn--sm"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("MA Al-Riyadhul Janah, " + ALAMAT)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buka di Google Maps ↗
                </a>
              </dd>
            </div>
          </dl>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap foot__in">
          <span>MA Al-Riyadhul Janah · Maja, Lebak, Banten</span>
          <span>Dikembangkan saat KP oleh Farriz Raehan dan Moh. Fachri Hasan</span>
        </div>
      </footer>
    </>
  );
}
