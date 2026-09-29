/**
 * Merapikan penulisan nama dari data EMIS yang sering HURUF BESAR semua: "ADHA NUR ROHIM" → "Adha Nur Rohim".
 * Hanya kata yang seluruhnya huruf besar yang diubah; gelar bertitik (S.Pd, M.Pd.I) dan kata yang sudah campuran dibiarkan.
 */
export function namaRapi(nama: string | null | undefined): string {
  if (!nama) return "";
  return nama
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((kata) => {
      if (kata.includes(".")) return kata;
      const huruf = kata.replace(/[^\p{L}]/gu, "");
      if (huruf.length < 2 || huruf !== huruf.toUpperCase()) return kata;
      return kata.toLowerCase().replace(/(^|[-(])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
    })
    .join(" ");
}

/** Alamat EMIS: kata huruf besar dirapikan dan kode pos yang tertulis dua kali ("42382, 42382") dibuang. */
export function alamatRapi(alamat: string | null | undefined): string {
  if (!alamat) return "";
  return namaRapi(alamat.replace(/,\s*(\d{5})\s*,\s*\1\s*$/, ", $1")).replace(/\bJL\./g, "Jl.");
}

/** Nomor HP ditampilkan gaya lokal: 6281234… → 0812-34…, dengan tanda hubung tak-terputus agar tidak pecah baris. */
export function hpRapi(no: string | null | undefined): string {
  if (!no) return "";
  let d = String(no).replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (d.startsWith("62")) d = `0${d.slice(2)}`;
  if (!/^0\d{8,13}$/.test(d)) return String(no);
  return d.replace(/^(\d{4})(\d{4})(\d+)$/, "$1\u2011$2\u2011$3");
}

/** Potong teks panjang untuk sel tabel. */
export function ringkas(teks: string | null | undefined, max = 90): string {
  if (!teks) return "";
  const t = teks.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}
