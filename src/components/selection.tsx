"use client";

import { createContext, useContext, useRef, useState } from "react";

type Stat = { n: number; rows: number };
const Ctx = createContext<Stat>({ n: 0, rows: 0 });
export const useSelected = () => useContext(Ctx);

const INTERAKTIF = "a,button,select,input,label,summary,textarea,details";

/**
 * Membungkus tabel dalam satu <form>. Kotak centang baris memakai `data-row` (opsional `data-group`),
 * kotak "pilih semua" memakai `data-selectall`.
 * - klik kotak atau baris: pilih/batal; Shift+klik: pilih rentang dari klik sebelumnya
 * - `bar` tampil hanya bila ada baris terpilih
 */
export function SelectionScope({
  children,
  bar,
  action,
  method,
  initial = 0,
}: {
  children: React.ReactNode;
  bar: React.ReactNode;
  action?: string | ((formData: FormData) => void | Promise<void>);
  method?: "get" | "post";
  initial?: number;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const terakhir = useRef<number | null>(null);
  const [stat, setStat] = useState<Stat>({ n: initial, rows: 0 });

  function sinkron() {
    const f = ref.current;
    if (!f) return;
    const rows = f.querySelectorAll<HTMLInputElement>("input[data-row]:not(:disabled)");
    const n = f.querySelectorAll<HTMLInputElement>("input[data-row]:checked").length;
    setStat({ n, rows: rows.length });
    const semua = f.querySelector<HTMLInputElement>("[data-selectall]");
    if (semua) {
      semua.checked = rows.length > 0 && n === rows.length;
      semua.indeterminate = n > 0 && n < rows.length;
    }
  }

  return (
    <form
      ref={ref}
      className="bulkform"
      action={action}
      method={method}
      onChange={(e) => {
        const f = ref.current;
        if (!f) return;
        const t = e.target as unknown as HTMLInputElement;
        if (t.matches?.("[data-selectall]")) {
          f.querySelectorAll<HTMLInputElement>("input[data-row]:not(:disabled)").forEach((c) => {
            c.checked = t.checked;
          });
        }
        sinkron();
      }}
      onMouseDown={(e) => {
        // cegah teks terblok saat Shift+klik pada baris
        if (e.shiftKey && (e.target as Element).closest("tbody tr")) e.preventDefault();
      }}
      onClick={(e) => {
        const f = ref.current;
        if (!f) return;
        const el = e.target as Element;
        let cb = el.closest?.("input[data-row]") as HTMLInputElement | null;
        if (!cb) {
          if (el.closest?.(INTERAKTIF)) return;
          const tr = el.closest?.("tbody tr");
          cb = (tr?.querySelector("input[data-row]:not(:disabled)") as HTMLInputElement | null) ?? null;
          if (!cb) return;
          cb.checked = !cb.checked;
        }
        const rows = [...f.querySelectorAll<HTMLInputElement>("input[data-row]:not(:disabled)")];
        const i = rows.indexOf(cb);
        if (e.shiftKey && terakhir.current !== null && terakhir.current !== i) {
          const [a, b] = [Math.min(terakhir.current, i), Math.max(terakhir.current, i)];
          rows.slice(a, b + 1).forEach((r) => {
            r.checked = cb!.checked;
          });
        }
        terakhir.current = i;
        sinkron();
      }}
    >
      <Ctx.Provider value={stat}>
        {children}
        {stat.n > 0 && bar}
      </Ctx.Provider>
    </form>
  );
}
