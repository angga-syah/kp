"use client";

import { useRef } from "react";

/** Menu pemilihan cepat di dalam <SelectionScope>: semua, kosongkan, balikkan, dan per kelompok (mis. per kelas). */
export function SelectMenu({ groups = [], groupTitle = "Pilih per kelas" }: { groups?: string[]; groupTitle?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);

  function terapkan(fn: (cb: HTMLInputElement) => boolean) {
    const f = ref.current?.closest("form");
    if (!f) return;
    f.querySelectorAll<HTMLInputElement>("input[data-row]:not(:disabled)").forEach((cb) => {
      cb.checked = fn(cb);
    });
    f.dispatchEvent(new Event("change", { bubbles: true }));
    if (ref.current) ref.current.open = false;
  }

  return (
    <details ref={ref} className="selmenu">
      <summary className="btn btn--outline btn--sm">Pilih ▾</summary>
      <div className="selmenu__list">
        <button type="button" onClick={() => terapkan(() => true)}>
          Semua di halaman ini
        </button>
        <button type="button" onClick={() => terapkan(() => false)}>
          Kosongkan pilihan
        </button>
        <button type="button" onClick={() => terapkan((cb) => !cb.checked)}>
          Balikkan pilihan
        </button>
        {groups.length > 0 && <p className="selmenu__title">{groupTitle}</p>}
        {groups.map((g) => (
          <button key={g} type="button" onClick={() => terapkan((cb) => cb.dataset.group === g)}>
            Hanya {g}
          </button>
        ))}
      </div>
    </details>
  );
}
