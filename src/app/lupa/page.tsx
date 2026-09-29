"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Crest, StarPattern } from "@/components/crest";

export default function Lupa() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const email = String(new FormData(e.currentTarget).get("email"));
    try {
      // alur implicit: tautan di email membawa sesinya sendiri, jadi bisa dibuka di perangkat/browser mana pun
      // (alur PKCE bawaan @supabase/ssr hanya berhasil di browser yang meminta reset)
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
        { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
      );
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (!error) setSent(true);
      else if (error.code === "over_email_send_rate_limit")
        setError("Batas pengiriman email portal untuk saat ini sudah tercapai. Coba lagi sekitar satu jam lagi, atau minta admin mereset kata sandi Anda.");
      else if (error.status === 429)
        setError("Terlalu sering meminta. Tunggu sekitar satu menit, lalu coba lagi.");
      else setError("Permintaan gagal. Periksa alamat email, lalu coba lagi.");
    } catch {
      setError("Layanan belum dapat dihubungi. Coba lagi nanti.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <aside className="auth__panel">
        <StarPattern id="lupa-star" />
        <Link href="/" className="brand auth__brand">
          <Crest size={56} />
          <span>
            <span className="brand__name">MA Al-Riyadhul Janah</span>
            <span className="brand__sub">Portal madrasah</span>
          </span>
        </Link>
      </aside>
      <main id="konten" className="auth__main">
        <form className="form" onSubmit={onSubmit}>
          <h1>Lupa kata sandi</h1>
          {sent ? (
            <p role="status">
              Jika email terdaftar, tautan untuk membuat kata sandi baru sudah dikirim. Periksa kotak masuk dan folder spam.
            </p>
          ) : (
            <>
              <p className="muted">Untuk guru dan staf. Masukkan email akun Anda; kami kirim tautan untuk membuat kata sandi baru.</p>
              <p className="notice">Siswa yang masuk dengan NISN tidak bisa memakai halaman ini. Minta wali kelas atau admin madrasah mereset kata sandi.</p>
              <label>
                Email
                <input name="email" type="email" autoComplete="email" required />
              </label>
                      <p className="form__error" role="alert">
                {error}
              </p>
              <button className="btn" type="submit" disabled={loading}>
                {loading ? "Mengirim…" : "Kirim tautan"}
              </button>
            </>
          )}
          <Link href="/masuk" className="form__back">
            ← Kembali ke halaman masuk
          </Link>
        </form>
      </main>
    </div>
  );
}
