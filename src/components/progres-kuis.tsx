"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/** Penghitung "x dari n dijawab" untuk kuis; diletakkan di dalam <form>. Tombol kirim aktif penuh saat semua terjawab. */
export function ProgresKuis({ total, label }: { total: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(0);
  const { pending } = useFormStatus();

  useEffect(() => {
    const f = ref.current?.closest("form");
    if (!f) return;
    const hitung = () => setN(new Set([...f.querySelectorAll<HTMLInputElement>("input[type=radio]:checked")].map((r) => r.name)).size);
    hitung();
    f.addEventListener("change", hitung);
    return () => f.removeEventListener("change", hitung);
  }, []);

  function keBelum() {
    const f = ref.current?.closest("form");
    const kosong = [...(f?.querySelectorAll<HTMLFieldSetElement>("fieldset") ?? [])].find((fs) => !fs.querySelector("input:checked"));
    kosong?.scrollIntoView({ behavior: "smooth", block: "center" });
    kosong?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
  }

  const lengkap = n >= total;
  return (
    <div ref={ref} className="savebar">
      <button type="submit" className="btn" disabled={!lengkap || pending} aria-busy={pending}>
        {pending ? "Menghitung…" : label}
      </button>
      <span className="savebar__count num-cell" aria-live="polite">
        {n} dari {total} dijawab
      </span>
      {!lengkap && n > 0 && (
        <button type="button" className="linkbtn linkbtn--edit" onClick={keBelum}>
          Ke soal yang belum
        </button>
      )}
    </div>
  );
}
