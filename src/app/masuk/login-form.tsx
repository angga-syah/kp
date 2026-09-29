"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { emailDariLogin, emailLamaDariLogin } from "@/lib/akun";
import { PasswordInput } from "@/components/password-input";

const PESAN: Record<string, string> = {
  "belum-aktif": "Akun Anda belum diaktifkan. Hubungi admin madrasah.",
  gagal: "Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru dari halaman Lupa kata sandi.",
};

export function LoginForm({ pesan }: { pesan?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(pesan ? (PESAN[pesan] ?? null) : null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const data = new FormData(e.currentTarget);
    try {
      const login = String(data.get("email"));
      const password = String(data.get("password"));
      const auth = createClient().auth;
      let { error } = await auth.signInWithPassword({ email: emailDariLogin(login), password });
      // akun siswa lama yang emailnya belum dipindahkan
      const lama = emailLamaDariLogin(login);
      if (error && lama) ({ error } = await auth.signInWithPassword({ email: lama, password }));
      if (error) {
        setError("NISN/email atau kata sandi salah. Periksa lagi, termasuk huruf besar-kecil.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Layanan belum dapat dihubungi. Coba lagi nanti.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <h1>Masuk</h1>
      <label>
        NISN atau email
        <input name="email" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required />
        <span className="hint">Siswa: ketik NISN (10 angka). Guru dan staf: ketik email.</span>
      </label>
      <label>
        Kata sandi
        <PasswordInput name="password" autoComplete="current-password" />
      </label>
      <p className="form__error" role="alert">
        {error}
      </p>
      <button className="btn" type="submit" disabled={loading}>
        {loading ? "Memproses…" : "Masuk"}
      </button>
      <Link href="/lupa" className="form__back form__lupa">
        Lupa kata sandi?
      </Link>
      <p className="hint">Siswa: kata sandi awal dibagikan oleh wali kelas atau admin madrasah.</p>
      <Link href="/" className="form__back">
        ← Kembali ke beranda
      </Link>
    </form>
  );
}
