import type ExcelJS from "exceljs";

export function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map((r) => r.text).join("").trim();
    if ("result" in o) return String(o.result ?? "").trim();
    if ("text" in o) return String(o.text ?? "").trim();
    return "";
  }
  return String(v).trim();
}

export function jamDariSel(v: ExcelJS.CellValue): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return `${String(v.getUTCHours()).padStart(2, "0")}:${String(v.getUTCMinutes()).padStart(2, "0")}`;
  if (typeof v === "number") {
    const menit = Math.round((v % 1) * 24 * 60);
    return `${String(Math.floor(menit / 60)).padStart(2, "0")}:${String(menit % 60).padStart(2, "0")}`;
  }
  const m = /^(\d{1,2})[:.](\d{2})/.exec(cellText(v));
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
}

export function tanggalDariSel(v: ExcelJS.CellValue): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const t = cellText(v);
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(t);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}
