export type Role = "admin" | "guru" | "bk" | "siswa" | "alumni";

export const ROLES: Role[] = ["admin", "guru", "bk", "siswa", "alumni"];

export const roleHome: Record<Role, string> = {
  admin: "/dashboard/admin",
  guru: "/dashboard/guru",
  bk: "/dashboard/bk",
  siswa: "/dashboard/siswa",
  alumni: "/dashboard/alumni",
};

export const roleLabel: Record<Role, string> = {
  admin: "Admin",
  guru: "Guru",
  bk: "Guru BK",
  siswa: "Siswa",
  alumni: "Alumni",
};

export const isRole = (v: unknown): v is Role => ROLES.includes(v as Role);

/** Semua pegawai madrasah yang boleh melihat data siswa. */
export const STAF: Role[] = ["admin", "guru", "bk"];
/** Yang mengisi presensi dan nilai (guru BK juga mengajar dan bisa menjadi wali kelas). */
export const PENGAJAR: Role[] = ["admin", "guru", "bk"];
/** Yang mengelola Bimbingan dan Konseling (BK): konseling, asesmen minat, dan info karier. */
export const PENGELOLA_BK: Role[] = ["admin", "bk"];

export const HARI = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// Bobot nilai akhir: asumsi awal, konfirmasi ke madrasah.
export const BOBOT = { tugas: 0.3, uts: 0.3, uas: 0.4 };

export function nilaiAkhir(n: {
  tugas: number | null;
  uts: number | null;
  uas: number | null;
}) {
  if (n.tugas == null || n.uts == null || n.uas == null) return null;
  return n.tugas * BOBOT.tugas + n.uts * BOBOT.uts + n.uas * BOBOT.uas;
}
