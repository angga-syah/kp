import ExcelJS from "exceljs";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { resources } from "@/lib/resources";
import { loadOptions } from "@/lib/resource-data";

export async function GET(_req: Request, ctx: { params: Promise<{ resource: string }> }) {
  const { resource: key } = await ctx.params;
  const res = resources[key];
  const p = await getProfile();
  if (!res || res.importable === false || !p || !res.write.includes(p.role)) {
    return new Response("Tidak diizinkan", { status: 403 });
  }
  const supabase = await createClient();
  const optionsOf = await loadOptions(supabase, res);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Data");
  const pilihan = wb.addWorksheet("Pilihan");
  ws.columns = res.fields.map((f) => ({
    header: (f.short ?? f.label.replace(/\s*\(.*?\)\s*/g, "")) + (f.required ? " *" : ""),
    key: f.name,
    width: f.type === "textarea" ? 40 : 22,
  }));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  let kolomPilihan = 0;
  res.fields.forEach((f, i) => {
    if (f.type !== "select") return;
    const opts = optionsOf(f.name);
    if (opts.length === 0) return;
    kolomPilihan += 1;
    const col = pilihan.getColumn(kolomPilihan);
    col.width = 26;
    pilihan.getCell(1, kolomPilihan).value = f.short ?? f.label;
    pilihan.getCell(1, kolomPilihan).font = { bold: true };
    opts.forEach((o, r) => (pilihan.getCell(r + 2, kolomPilihan).value = o.label));
    const huruf = pilihan.getColumn(kolomPilihan).letter;
    const kolomData = ws.getColumn(i + 1).letter;
    for (let r = 2; r <= 500; r++) {
      ws.getCell(`${kolomData}${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`Pilihan!$${huruf}$2:$${huruf}$${opts.length + 1}`],
      };
    }
  });
  if (kolomPilihan === 0) wb.removeWorksheet(pilihan.id);

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="template-${key}.xlsx"`,
    },
  });
}
