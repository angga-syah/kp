// Server Vercel berjalan dalam UTC; madrasah memakai WIB. Semua tanggal/jam untuk pengguna dihitung di zona ini.
export const ZONA = "Asia/Jakarta";
const OFFSET = "+07:00";

/** Tanggal hari ini (WIB) dalam format YYYY-MM-DD. */
export function hariIni(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());
}

export function geserHari(tanggal: string, n: number): string {
  const d = new Date(`${tanggal}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const tanggalValid = (v: string | undefined): v is string =>
  !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

/** "Senin, 28 September 2026" */
export function tanggalPanjang(tanggal: string): string {
  return new Date(`${tanggal}T12:00:00${OFFSET}`).toLocaleDateString("id-ID", { dateStyle: "full", timeZone: ZONA });
}

/** Nilai input datetime-local (dianggap WIB) → ISO UTC. */
export function wibKeIso(lokal: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(lokal)) return null;
  return new Date(`${lokal}:00${OFFSET}`).toISOString();
}

/** ISO → nilai input datetime-local dalam WIB. */
export function isoKeWib(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000);
  return d.toISOString().slice(0, 16);
}

export function jamWib(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short", timeZone: ZONA }) + " WIB";
}
