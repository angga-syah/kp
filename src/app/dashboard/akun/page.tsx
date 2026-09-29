import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { SubmitButton } from "@/components/submit-button";
import { PasswordInput } from "@/components/password-input";
import { ROLES, roleHome, roleLabel } from "@/lib/roles";
import { usernameDariEmail } from "@/lib/akun";
import { Notice, PageHead, one } from "@/components/ui";
import { changePassword } from "../actions";

export const metadata = { title: "Akun saya" };

export default async function Akun({ searchParams }: PageProps<"/dashboard/akun">) {
  const p = await requireRole(ROLES);
  const sp = await searchParams;
  const berhasil = one(sp.ok) === "1";

  return (
    <>
      <PageHead title="Akun saya" note={`${p.nama} · ${roleLabel[p.role]}`} />
      <dl className="detail">
        <div>
          <dt>{p.role === "siswa" ? "Username (NISN)" : "Email login"}</dt>
          <dd className="num-cell">{usernameDariEmail(p.email) || "—"}</dd>
        </div>
      </dl>

      {one(sp.pesan) === "ganti" && (
        <p className="notice notice--error" role="alert">
          Ini login pertama Anda. Buat kata sandi baru dulu sebelum memakai portal.
        </p>
      )}
      {one(sp.pesan) === "pulih" && (
        <p className="notice" role="status">
          Tautan berhasil dibuka. Buat kata sandi baru di bawah ini.
        </p>
      )}
      <Notice error={one(sp.error)} />
      {berhasil && (
        <p className="notice" role="status">
          Kata sandi berhasil diganti. Gunakan kata sandi baru saat masuk berikutnya.{" "}
          <Link href={roleHome[p.role]}>Lanjut ke beranda →</Link>
        </p>
      )}

      <h2 className="h2">Ganti kata sandi</h2>
      <form action={changePassword} className="formgrid formgrid--col">
        <label>
          Kata sandi baru
          <PasswordInput name="password" autoComplete="new-password" minLength={8} />
        </label>
        <label>
          Ketik ulang kata sandi baru
          <PasswordInput name="confirm" autoComplete="new-password" minLength={8} />
        </label>
        <ul className="hint tips">
          <li>Minimal 8 karakter.</li>
          <li>Jangan pakai tanggal lahir, NISN, atau nama sendiri.</li>
          <li>Mudah diingat: gabungkan beberapa kata, mis. <em>kopi-pagi-maja</em>.</li>
        </ul>
        <SubmitButton className="btn">Simpan kata sandi baru</SubmitButton>
      </form>
    </>
  );
}
