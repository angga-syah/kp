"use client";

/** Dropdown filter yang langsung mengirim formulir pencarian saat nilainya diubah. */
export function AutoSelect({
  name,
  label,
  value,
  options,
  semua = "Semua",
}: {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  semua?: string;
}) {
  return (
    <label className="toolbar__filter">
      <span>{label}</span>
      <select name={name} defaultValue={value} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
        <option value="">{semua}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
