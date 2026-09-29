import type ExcelJS from "exceljs";
import { cellText, tanggalDariSel } from "@/lib/excel";
import { alamatRapi, namaRapi } from "@/lib/format";

// Nama kolom yang dikenali (template portal maupun ekspor EMIS/Dapodik), dibandingkan tanpa spasi/tanda baca.
const KOLOM_SISWA: Record<string, string[]> = {
  nama: ["nama", "nama lengkap", "nama siswa", "nama peserta didik"],
  nisn: ["nisn"],
  nis: ["nis", "nipd", "no induk", "nomor induk"],
  jenis_kelamin: ["jenis kelamin", "jenis_kelamin", "jk", "l/p"],
  tempat_lahir: ["tempat lahir", "tempat_lahir"],
  tanggal_lahir: ["tanggal lahir", "tanggal_lahir", "tgl lahir"],
  alamat: ["alamat"],
  no_hp: ["no telepon", "no hp", "no_hp", "nomor hp", "telepon", "hp"],
  nama_ayah: ["nama ayah kandung", "nama ayah", "nama_ayah"],
  nama_ibu: ["nama ibu kandung", "nama ibu", "nama_ibu"],
  nama_wali: ["nama wali", "nama_wali"],
  kelas: ["kelas", "rombel", "tingkat - rombel", "rombongan belajar"],
  status: ["status"],
};
export const rata = (t: string) => t.toLowerCase().replace(/[^a-z0-9/]/g, "");
export const namaKunci = (t: string) => t.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** "Kelas 10 - KELAS X MIA" → "X MIA"; "X-A" tetap; "Kelas 11" (tanpa rombel) → null. */
/** Jarak edit Levenshtein, untuk mencocokkan ejaan nama yang sedikit berbeda (mis. ARDIASYAH vs ARDIANSYAH). */
export function jarakEja(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

export function namaKelasImpor(v: string): string | null {
  const t = v.split(" - ").pop()!.replace(/^kelas\s+/i, "").trim();
  return !t || /^\d+$/.test(t) ? null : t;
}
export function tingkatDariNama(nama: string): number | null {
  const m = /^(XII|XI|X|12|11|10)(?![A-Z0-9])/i.exec(nama.trim());
  return m ? ({ x: 10, xi: 11, xii: 12 } as Record<string, number>)[m[1].toLowerCase()] ?? Number(m[1]) : null;
}

export type BarisSiswa = Record<string, string | null> & { _lokasi: string };

/** Membaca semua lembar kerja berisi data siswa. Tidak menyentuh basis data. */
export function bacaSiswa(wb: ExcelJS.Workbook): { baris: BarisSiswa[]; masalah: string[]; adaLembar: boolean } {
  const baris: BarisSiswa[] = [];
  const masalah: string[] = [];
  let adaLembar = false;
  // semua lembar dibaca (mis. satu lembar per rombel); baris judul dicari di 5 baris pertama
  for (const ws of wb.worksheets) {
    let barisJudul = 0;
    const kolom: Record<string, number> = {};
    for (let r = 1; r <= Math.min(5, ws.rowCount) && !barisJudul; r++) {
      ws.getRow(r).eachCell((c, i) => {
        const h = rata(cellText(c.value));
        for (const [k, alias] of Object.entries(KOLOM_SISWA)) if (!kolom[k] && alias.some((a) => rata(a) === h)) kolom[k] = i;
      });
      if (kolom.nama) barisJudul = r;
      else Object.keys(kolom).forEach((k) => delete kolom[k]);
    }
    if (!barisJudul) continue;
    adaLembar = true;
    ws.eachRow((row, n) => {
      if (n <= barisJudul) return;
      const sel = (k: string) => (kolom[k] ? row.getCell(kolom[k]).value : null);
      const teks = (k: string) => (kolom[k] ? cellText(sel(k)) : "") || null;
      const nama = teks("nama");
      if (!nama) return;
      const lokasi = `${ws.name} baris ${n}`;
      let nisn = teks("nisn")?.replace(/\D/g, "") || null;
      if (nisn && typeof sel("nisn") === "number") nisn = nisn.padStart(10, "0"); // Excel membuang angka 0 di depan
      if (nisn && !/^\d{10}$/.test(nisn)) masalah.push(`${lokasi}: NISN ${nisn} bukan 10 digit.`);
      const jk = (teks("jenis_kelamin") ?? "").toUpperCase().slice(0, 1);
      const st = rata(teks("status") ?? "aktif");
      const hp = teks("no_hp")?.replace(/[^\d+]/g, "") || null;
      const tglMentah = sel("tanggal_lahir");
      const tgl = tglMentah ? tanggalDariSel(tglMentah) : null;
      if (tglMentah && !tgl) masalah.push(`${lokasi}: tanggal lahir "${cellText(tglMentah)}" tidak dikenali (pakai YYYY-MM-DD atau DD/MM/YYYY).`);
      baris.push({
        _lokasi: lokasi,
        nama: namaRapi(nama),
        nisn,
        nis: teks("nis"),
        jenis_kelamin: jk === "L" || jk === "P" ? jk : null,
        tempat_lahir: namaRapi(teks("tempat_lahir")) || null,
        tanggal_lahir: tgl,
        alamat: alamatRapi(teks("alamat")) || null,
        no_hp: hp?.startsWith("62") ? `0${hp.slice(2)}` : hp,
        nama_ayah: namaRapi(teks("nama_ayah")) || null,
        nama_ibu: namaRapi(teks("nama_ibu")) || null,
        nama_wali: namaRapi(teks("nama_wali")) || null,
        kelas: teks("kelas") ? namaKelasImpor(teks("kelas")!) : null,
        status: st === "aktif" ? "aktif" : st.includes("lulus") ? "lulus" : st.includes("pindah") || st.includes("mutasi") ? "pindah" : "keluar",
      });
    });
  }
  const dobel = new Map<string, string>();
  baris.forEach((b) => {
    if (!b.nisn) return;
    if (dobel.has(b.nisn)) masalah.push(`NISN ${b.nisn} muncul dua kali (${dobel.get(b.nisn)} dan ${b._lokasi}).`);
    dobel.set(b.nisn, b._lokasi);
  });
  return { baris, masalah, adaLembar };
}
