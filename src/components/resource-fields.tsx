import type { Field, Resource } from "@/lib/resources";
import type { Option } from "@/lib/resource-data";

function Kolom({ f, val, options }: { f: Field; val: string; options: Option[] }) {
  return (
    <label className={f.type === "textarea" || f.wide ? "formgrid__wide" : undefined}>
      <span>
        {f.label}
        {f.required && (
          <span className="wajib" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </span>
      {f.type === "select" ? (
        <select name={f.name} required={f.required} defaultValue={val}>
          {f.required ? (
            <option value="" disabled>
              Pilih…
            </option>
          ) : (
            <option value="">—</option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : f.type === "textarea" ? (
        <textarea name={f.name} rows={3} required={f.required} defaultValue={val} placeholder={f.placeholder} />
      ) : (
        <input name={f.name} type={f.type} required={f.required} defaultValue={val} placeholder={f.placeholder} />
      )}
      {f.hint && <span className="hint">{f.hint}</span>}
    </label>
  );
}

/**
 * Kolom-kolom formulir sebuah data. Kolom dengan `grup` ditampilkan per kelompok berjudul.
 * `values` = data yang diubah; `awal` = isian awal formulir tambah (nilai bawaan atau yang diingat).
 */
export function ResourceFields({
  res,
  optionsOf,
  values,
  awal,
}: {
  res: Resource;
  optionsOf: (name: string) => Option[];
  values?: Record<string, unknown>;
  awal?: Record<string, string | undefined>;
}) {
  const val = (f: Field) => {
    if (values) {
      const v = values[f.name];
      return v === null || v === undefined ? "" : f.type === "time" ? String(v).slice(0, 5) : String(v);
    }
    return awal?.[f.name] ?? f.bawaan ?? "";
  };
  // keterangan tanda * cukup bila kolom wajibnya lebih dari satu
  const adaWajib = res.fields.filter((f) => f.required).length > 1;
  const grup = [...new Set(res.fields.map((f) => f.grup ?? ""))];

  return (
    <>
      {adaWajib && (
        <p className="hint formgrid__wide">
          Kolom bertanda <span className="wajib">*</span> wajib diisi.
        </p>
      )}
      {grup.length > 1
        ? grup.map((g) => (
            <fieldset key={g} className="formgrid__set">
              {g && <legend>{g}</legend>}
              {res.fields
                .filter((f) => (f.grup ?? "") === g)
                .map((f) => (
                  <Kolom key={f.name} f={f} val={val(f)} options={optionsOf(f.name)} />
                ))}
            </fieldset>
          ))
        : res.fields.map((f) => <Kolom key={f.name} f={f} val={val(f)} options={optionsOf(f.name)} />)}
    </>
  );
}
