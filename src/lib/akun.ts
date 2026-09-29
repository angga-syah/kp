/** Semua akun (termasuk siswa) memakai satu kotak masuk Gmail; tiap akun dibedakan dengan alamat "+alias". */
export const EMAIL_DASAR = "farrizraehan@gmail.com";

// Siswa masuk dengan NISN; Supabase tetap butuh email, jadi NISN dipetakan ke alias Gmail di atas.
const ALIAS_SISWA = "siswa-";
/** Domain internal lama (tidak menerima surat); akun lama tetap bisa masuk sampai dipindahkan. */
export const DOMAIN_SISWA_LAMA = "siswa.masalriyadhuljanah.sch.id";

export function emailDariLogin(v: string): string {
  const t = v.trim().toLowerCase();
  if (t.includes("@")) return t;
  const [user, domain] = EMAIL_DASAR.split("@");
  return `${user}+${ALIAS_SISWA}${t}@${domain}`;
}

export function emailLamaDariLogin(v: string): string | null {
  const t = v.trim().toLowerCase();
  return t.includes("@") ? null : `${t}@${DOMAIN_SISWA_LAMA}`;
}

export function usernameDariEmail(email?: string | null): string {
  if (!email) return "";
  if (email.endsWith(`@${DOMAIN_SISWA_LAMA}`)) return email.split("@")[0].toUpperCase();
  const [user, domain] = EMAIL_DASAR.split("@");
  const m = new RegExp(`^${user}\\+${ALIAS_SISWA}(.+)@${domain.replace(/\./g, "\\.")}$`, "i").exec(email);
  return m ? m[1].toUpperCase() : email;
}

export function emailAlias(label: string, urut = 0): string {
  const [user, domain] = EMAIL_DASAR.split("@");
  const slug =
    label
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "")
      .slice(0, 40) || "akun";
  return `${user}+${slug}${urut ? urut + 1 : ""}@${domain}`;
}

export function randomPassword(len = 8): string {
  const alfabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, (x) => alfabet[x % alfabet.length]).join("");
}

/** Kata sandi bawaan siswa: tanggal lahir ttbbtttt (DDMMYYYY). null bila tanggal lahir belum diisi. */
export function passwordDefault(tanggalLahir?: string | null): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(tanggalLahir ?? "");
  return m ? `${m[3]}${m[2]}${m[1]}` : null;
}
