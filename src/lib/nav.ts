import type { Role } from "@/lib/roles";

type Item = { href: string; label: string; /** alamat lain yang juga termasuk halaman ini */ juga?: string[] };
/** Satu bagian di menu samping. Bila berisi lebih dari satu halaman, halaman-halamannya tampil sebagai tab di atas konten. */
export type NavGroup = { label: string; items: Item[] };

const data = (key: string, label: string): Item => ({ href: `/dashboard/data/${key}`, label });
const g = (label: string, ...items: Item[]): NavGroup => ({ label, items });
const jadwal: Item = { href: "/dashboard/jadwal", label: "Jadwal", juga: ["/dashboard/data/jadwal"] };
const akun = g("Akun saya", { href: "/dashboard/akun", label: "Akun saya" });

export function navFor(role: Role): NavGroup[] {
  switch (role) {
    case "admin":
      return [
        g("Beranda", { href: "/dashboard/admin", label: "Beranda" }),
        g(
          "Siswa",
          data("siswa", "Data siswa"),
          { href: "/dashboard/admin/impor", label: "Impor siswa" },
          { href: "/dashboard/admin/akun-massal", label: "Akun siswa" },
          { href: "/dashboard/admin/kelulusan", label: "Kelulusan" },
        ),
        g("Guru & akun", { href: "/dashboard/admin/pengguna", label: "Akun login" }, data("guru", "Data guru")),
        g(
          "Akademik",
          { href: "/dashboard/presensi", label: "Presensi" },
          { href: "/dashboard/nilai", label: "Nilai" },
          { href: "/dashboard/rapor", label: "Rapor" },
          { href: "/dashboard/rekap-presensi", label: "Rekap presensi" },
        ),
        g("Data sekolah", data("kelas", "Kelas"), jadwal, data("mapel", "Mata pelajaran"), data("tahun-ajaran", "Tahun ajaran")),
        g(
          "Bimbingan konseling",
          { href: "/dashboard/konseling", label: "Konseling" },
          { href: "/dashboard/asesmen", label: "Hasil asesmen" },
          data("info-karier", "Info karier"),
          data("soal-asesmen", "Soal asesmen"),
        ),
        g("Alumni", { href: "/dashboard/tracer", label: "Rekap tracer" }, data("alumni", "Data alumni")),
        g("Website madrasah", data("pengumuman", "Pengumuman"), data("konten-profil", "Profil madrasah"), data("prestasi", "Prestasi")),
        akun,
      ];
    case "guru":
      return [
        g("Beranda", { href: "/dashboard/guru", label: "Ringkasan" }),
        g("Presensi", { href: "/dashboard/presensi", label: "Isi presensi" }, { href: "/dashboard/rekap-presensi", label: "Rekap bulanan" }),
        g("Nilai & rapor", { href: "/dashboard/nilai", label: "Isi nilai" }, { href: "/dashboard/rapor", label: "Rapor" }),
        g("Siswa & jadwal", data("siswa", "Data siswa"), jadwal),
        g("Karier & alumni", { href: "/dashboard/asesmen", label: "Hasil asesmen" }, data("info-karier", "Info karier"), { href: "/dashboard/tracer", label: "Rekap tracer" }),
        g("Pengumuman", data("pengumuman", "Pengumuman")),
        akun,
      ];
    case "bk":
      return [
        g("Beranda", { href: "/dashboard/bk", label: "Ringkasan" }),
        g("Konseling", { href: "/dashboard/konseling", label: "Konseling" }),
        g(
          "Mengajar",
          { href: "/dashboard/presensi", label: "Presensi" },
          { href: "/dashboard/nilai", label: "Nilai" },
          { href: "/dashboard/rapor", label: "Rapor" },
          { href: "/dashboard/rekap-presensi", label: "Rekap presensi" },
          jadwal,
        ),
        g("Asesmen minat", { href: "/dashboard/asesmen", label: "Hasil asesmen" }, data("soal-asesmen", "Soal asesmen")),
        g("Info karier", data("info-karier", "Info karier")),
        g("Siswa", data("siswa", "Data siswa")),
        g("Alumni", { href: "/dashboard/tracer", label: "Rekap tracer" }, data("alumni", "Data alumni")),
        g("Pengumuman", data("pengumuman", "Pengumuman")),
        akun,
      ];
    case "siswa":
      return [
        g("Beranda", { href: "/dashboard/siswa", label: "Beranda" }),
        g("Rapor", { href: "/dashboard/rapor", label: "Rapor" }),
        g("Asesmen minat", { href: "/dashboard/siswa/asesmen", label: "Asesmen minat" }),
        g("Konseling BK", { href: "/dashboard/konseling", label: "Konseling BK" }),
        g("Info karier", { href: "/dashboard/karier", label: "Info karier" }),
        akun,
      ];
    case "alumni":
      return [
        g("Tracer study", { href: "/dashboard/alumni", label: "Isi tracer study" }),
        g("Info karier", { href: "/dashboard/karier", label: "Info karier" }),
        akun,
      ];
  }
}

/** Halaman aktif = tautan terpanjang yang menjadi awalan alamat, agar sub-halaman (tambah/ubah data) tetap menyorot menunya. */
export function cariAktif(groups: NavGroup[], path: string): { group?: NavGroup; href?: string } {
  let hasil: { group?: NavGroup; href?: string; len?: number } = {};
  for (const grp of groups)
    for (const it of grp.items)
      for (const h of [it.href, ...(it.juga ?? [])])
        if ((path === h || path.startsWith(`${h}/`)) && h.length > (hasil.len ?? 0)) hasil = { group: grp, href: it.href, len: h.length };
  return hasil;
}
