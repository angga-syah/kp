"use client";

import { useState } from "react";
import { useSelected } from "@/components/selection";
import { ConfirmButton } from "@/components/submit-button";

type Aksi = (formData: FormData) => void | Promise<void>;
type BulkField = { name: string; label: string; options: { value: string; label: string }[] };
type Kirim = { label: string; formAction: string | Aksi; method?: "post"; name?: string; value?: string };

/**
 * Bilah aksi massal yang menempel di bawah layar. Bila seluruh baris di halaman terpilih dan hasil filter
 * lebih banyak dari halaman ini, muncul tawaran "Pilih semua N data" (lintas halaman).
 */
export function BulkBar({
  fields = [],
  updateActions = {},
  deleteAction,
  submits = [],
  total,
  kata = "data",
}: {
  fields?: BulkField[];
  updateActions?: Record<string, Aksi>;
  deleteAction?: Aksi;
  submits?: Kirim[];
  total?: number;
  kata?: string;
}) {
  const { n, rows } = useSelected();
  const [semuaN, setSemuaN] = useState<number | null>(null);
  const bisaSemua = total !== undefined && n === rows && total > rows;
  const semua = bisaSemua && semuaN === n;
  const efektif = semua ? (total as number) : n;

  return (
    <div className="bulkbar" role="region" aria-label="Aksi untuk data terpilih">
      <strong className="bulkbar__count">
        {efektif} dipilih{semua ? " (semua halaman)" : ""}
      </strong>
      {bisaSemua && !semua && (
        <button type="button" className="linkbtn linkbtn--light" onClick={() => setSemuaN(n)}>
          Pilih semua {total} data hasil filter
        </button>
      )}
      {semua && (
        <>
          <input type="hidden" name="_semua" value="1" />
          <button type="button" className="linkbtn linkbtn--light" onClick={() => setSemuaN(null)}>
            Hanya halaman ini
          </button>
        </>
      )}
      {fields.map((f) => (
        <span key={f.name} className="bulkbar__group">
          <label className="sr" htmlFor={`bulk_${f.name}`}>
            {f.label}
          </label>
          <select id={`bulk_${f.name}`} name={`bulk_${f.name}`} defaultValue="">
            <option value="" disabled>
              {f.label}…
            </option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button type="submit" formAction={updateActions[f.name]} className="btn btn--outline btn--sm">
            Terapkan
          </button>
        </span>
      ))}
      {submits.map((s) => (
        <button
          key={s.label}
          type="submit"
          formAction={s.formAction}
          formMethod={s.method}
          name={s.name}
          value={s.value}
          className="btn btn--outline btn--sm"
        >
          {s.label}
        </button>
      ))}
      {deleteAction && (
        <ConfirmButton
          className="linkbtn linkbtn--danger"
          message={`Hapus ${efektif} ${kata} terpilih?`}
          formAction={deleteAction}
          tanya={`Hapus ${efektif} ${kata}?`}
        >
          Hapus terpilih
        </ConfirmButton>
      )}
    </div>
  );
}

/** Tombol kirim tunggal untuk formulir massal sederhana (akun siswa, kelulusan). */
export function BarSubmit({ label, pendingLabel, className = "btn" }: { label: string; pendingLabel?: string; className?: string }) {
  const { n } = useSelected();
  return (
    <div className="bulkbar" role="region" aria-label="Aksi untuk data terpilih">
      <strong className="bulkbar__count">{n} dipilih</strong>
      <button type="submit" className={className} title={pendingLabel}>
        {label}
      </button>
    </div>
  );
}
