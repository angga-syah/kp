"use client";

import { useEffect, useRef, useState } from "react";

const STATUS = [
  ["hadir", "Hadir"],
  ["izin", "Izin"],
  ["sakit", "Sakit"],
  ["alpa", "Alpa"],
] as const;

type Hitung = Record<(typeof STATUS)[number][0], number>;

/** Tombol "tandai semua" dan ringkasan langsung untuk formulir presensi. */
export function PresensiQuick({ initial }: { initial: Hitung }) {
  const ref = useRef<HTMLDivElement>(null);
  const [c, setC] = useState<Hitung>(initial);

  useEffect(() => {
    const f = ref.current?.closest("form");
    if (!f) return;
    const hitung = () => {
      const h: Hitung = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
      f.querySelectorAll<HTMLInputElement>("input[type=radio]:checked").forEach((r) => {
        if (r.value in h) h[r.value as keyof Hitung] += 1;
      });
      setC(h);
    };
    f.addEventListener("change", hitung);
    return () => f.removeEventListener("change", hitung);
  }, []);

  function semua(v: string) {
    const f = ref.current?.closest("form");
    if (!f) return;
    f.querySelectorAll<HTMLInputElement>(`input[type=radio][value="${v}"]`).forEach((r) => {
      r.checked = true;
    });
    f.dispatchEvent(new Event("change"));
  }

  return (
    <div ref={ref} className="quickbar">
      <div className="quickbar__set">
        <span className="muted">Tandai semua:</span>
        {STATUS.map(([v, l]) => (
          <button key={v} type="button" className="btn btn--outline btn--sm" onClick={() => semua(v)}>
            {l}
          </button>
        ))}
      </div>
      <p className="quickbar__sum num-cell" aria-live="polite">
        Hadir {c.hadir} · Izin {c.izin} · Sakit {c.sakit} · Alpa {c.alpa}
      </p>
    </div>
  );
}
