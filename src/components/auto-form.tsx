"use client";

import { useEffect, useRef } from "react";

/** Formulir filter (GET) yang langsung menampilkan hasil saat pilihan diubah; tombol kirim tetap ada sebagai cadangan. */
export function AutoForm({ children, className = "filterbar" }: { children: React.ReactNode; className?: string }) {
  return (
    <form
      method="get"
      className={className}
      onChange={(e) => {
        const f = e.currentTarget;
        const t = e.target as unknown as HTMLInputElement;
        // saat mengetik tahun, input tanggal memicu change berkali-kali ("0002", "0020", …)
        if ((t.type === "date" || t.type === "month") && Number(t.value.slice(0, 4)) < 2000) return;
        if (f.checkValidity()) f.requestSubmit();
      }}
    >
      {children}
    </form>
  );
}

/**
 * Memperingatkan sebelum meninggalkan halaman bila isian formulir di sekitarnya sudah diubah tetapi belum disimpan.
 * Diletakkan di dalam <form>.
 */
export function JagaPerubahan({ pesan = "Ada perubahan yang belum disimpan." }: { pesan?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const kotor = useRef(false);

  useEffect(() => {
    const f = ref.current?.closest("form");
    if (!f) return;
    const tandai = () => {
      kotor.current = true;
      ref.current?.removeAttribute("hidden");
    };
    const bersih = () => {
      kotor.current = false;
    };
    const tahan = (e: BeforeUnloadEvent) => {
      if (kotor.current) e.preventDefault();
    };
    const klik = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.("a[href]");
      if (!a || !kotor.current || a.closest("form") === f) return;
      if (!window.confirm(`${pesan} Tinggalkan halaman ini?`)) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        kotor.current = false;
      }
    };
    f.addEventListener("input", tandai);
    f.addEventListener("change", tandai);
    f.addEventListener("submit", bersih);
    window.addEventListener("beforeunload", tahan);
    document.addEventListener("click", klik, true);
    return () => {
      f.removeEventListener("input", tandai);
      f.removeEventListener("change", tandai);
      f.removeEventListener("submit", bersih);
      window.removeEventListener("beforeunload", tahan);
      document.removeEventListener("click", klik, true);
    };
  }, [pesan]);

  return (
    <span ref={ref} className="savebar__dirty" role="status" hidden>
      Belum disimpan
    </span>
  );
}
