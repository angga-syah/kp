"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Crest, StarPattern } from "@/components/crest";

const PESAN_GALAT: Record<string, string> = {
  otp_expired: "Tautan sudah kedaluwarsa atau sudah pernah dipakai. Setiap tautan hanya berlaku sekali dan sebentar.",
  kode: "Tautan ini harus dibuka di browser yang sama dengan tempat Anda meminta. Minta tautan baru.",
};

/** Menerima tautan dari email (reset kata sandi), menyimpan sesinya, lalu membuka halaman ganti kata sandi. */
export default function Pulih() {
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    // token jangan tertinggal di riwayat browser
    window.history.replaceState(null, "", window.location.pathname);

    const kode = hash.get("error_code") ?? query.get("gagal");
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");

    async function proses(): Promise<string | null> {
      if (kode) return PESAN_GALAT[kode] ?? hash.get("error_description") ?? "Tautan tidak valid.";
      if (!access_token || !refresh_token) return "Tautan tidak lengkap atau tidak valid. Minta tautan baru.";
      const sb = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
        { auth: { detectSessionInUrl: false } },
      );
      const { error } = await sb.auth.setSession({ access_token, refresh_token });
      if (error) return "Tautan sudah tidak berlaku. Minta tautan baru.";
      window.location.replace(hash.get("type") === "recovery" ? "/dashboard/akun?pesan=pulih" : "/dashboard");
      return null;
    }
    proses().then((g) => g && setGalat(g));
  }, []);

  return (
    <div className="auth">
      <aside className="auth__panel">
        <StarPattern id="pulih-star" />
        <Link href="/" className="brand auth__brand">
          <Crest size={56} />
          <span>
            <span className="brand__name">MA Al-Riyadhul Janah</span>
            <span className="brand__sub">Portal madrasah</span>
          </span>
        </Link>
      </aside>
      <main id="konten" className="auth__main">
        <div className="form">
          {galat ? (
            <>
              <h1>Tautan tidak dapat dipakai</h1>
              <p className="form__error" role="alert">
                {galat}
              </p>
              <Link href="/lupa" className="btn">
                Minta tautan baru
              </Link>
              <Link href="/masuk" className="form__back">
                ← Kembali ke halaman masuk
              </Link>
            </>
          ) : (
            <>
              <h1>Memeriksa tautan…</h1>
              <p className="muted" role="status">
                Sebentar, Anda akan diarahkan ke halaman ganti kata sandi.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
