"use client";

const KOLOM = ["tugas", "uts", "uas"] as const;
type Bobot = Record<(typeof KOLOM)[number], number>;

/**
 * Membuat kisi input nilai lebih cepat: Enter atau panah bawah/atas pindah antar baris pada kolom yang sama,
 * tempel (paste) beberapa sel dari Excel langsung mengisi kolom-kolom berikutnya, dan kolom nilai akhir
 * (sel ber-atribut data-akhir) dihitung ulang saat mengetik. Input memakai atribut data-col dan data-r (nomor baris).
 */
export function GridNav({ children, bobot }: { children: React.ReactNode; bobot: Bobot }) {
  function hitung(root: HTMLElement, r: string) {
    const nilai = KOLOM.map((c) => root.querySelector<HTMLInputElement>(`input[data-col="${c}"][data-r="${r}"]`));
    const sel = root.querySelector<HTMLElement>(`[data-akhir="${r}"]`);
    if (!sel) return;
    const angka = nilai.map((i) => (i && i.value.trim() !== "" && i.validity.valid ? Number(i.value) : null));
    sel.textContent = angka.some((a) => a === null)
      ? "—"
      : KOLOM.reduce((t, c, i) => t + (angka[i] as number) * bobot[c], 0).toFixed(1);
    nilai.forEach((i) => i?.closest("td")?.toggleAttribute("data-salah", !!i && !i.validity.valid));
  }

  return (
    <div
      onInput={(e) => {
        const t = e.target as HTMLInputElement;
        if (t.dataset?.r !== undefined) hitung(e.currentTarget, t.dataset.r);
      }}
      onKeyDown={(e) => {
        const t = e.target as HTMLInputElement;
        if (!t.dataset?.col) return;
        const geser = e.key === "Enter" || e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
        if (!geser) return;
        const sel = e.currentTarget.querySelector(`input[data-col="${t.dataset.col}"][data-r="${Number(t.dataset.r) + geser}"]`) as HTMLInputElement | null;
        e.preventDefault();
        sel?.focus();
        sel?.select();
      }}
      onPaste={(e) => {
        const t = e.target as HTMLInputElement;
        if (!t.dataset?.col) return;
        const teks = e.clipboardData.getData("text");
        if (!/[\n\t]/.test(teks.trim())) return;
        e.preventDefault();
        const root = e.currentTarget;
        const baris = teks.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
        const r0 = Number(t.dataset.r);
        const c0 = KOLOM.indexOf(t.dataset.col as (typeof KOLOM)[number]);
        baris.forEach((l, dr) => {
          l.split("\t").forEach((v, dc) => {
            const col = KOLOM[c0 + dc];
            if (!col) return;
            const inp = root.querySelector(`input[data-col="${col}"][data-r="${r0 + dr}"]`) as HTMLInputElement | null;
            if (inp) inp.value = v.trim().replace(",", ".");
          });
          hitung(root, String(r0 + dr));
        });
        // tandai formulir berubah (untuk peringatan "belum disimpan")
        t.dispatchEvent(new Event("change", { bubbles: true }));
      }}
    >
      {children}
    </div>
  );
}
