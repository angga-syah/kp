import ExcelJS from "exceljs";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { resources } from "@/lib/resources";
import { loadOptions } from "@/lib/resource-data";
import { HARI } from "@/lib/roles";
import { parseListParams, terapkanFilter, terapkanUrut } from "@/lib/data-query";

type Row = Record<string, unknown>;

export async function GET(request: Request, ctx: { params: Promise<{ resource: string }> }) {
  const { resource: key } = await ctx.params;
  const res = resources[key];
  const p = await getProfile();
  if (!res || !p || !res.read.includes(p.role)) return new Response("Tidak diizinkan", { status: 403 });

  const sp = Object.fromEntries(new URL(request.url).searchParams.entries());
  const lp = parseListParams(res, sp);
  const supabase = await createClient();
  const [optionsOf, { data }] = await Promise.all([
    loadOptions(supabase, res),
    terapkanUrut(terapkanFilter(supabase.from(res.table).select("*"), res, lp), res, lp).limit(10000),
  ]);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(res.title.slice(0, 30));
  ws.columns = res.fields.map((f) => ({ header: f.short ?? f.label.replace(/\s*\(.*?\)\s*/g, ""), key: f.name, width: f.type === "textarea" ? 44 : 22 }));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  for (const r of (data ?? []) as Row[]) {
    const baris: Record<string, unknown> = {};
    for (const f of res.fields) {
      const v = r[f.name];
      if (v === null || v === undefined) baris[f.name] = "";
      else if (f.name === "hari") baris[f.name] = HARI[Number(v)] ?? v;
      else if (typeof v === "boolean") baris[f.name] = v ? "Ya" : "Tidak";
      else {
        const opt = optionsOf(f.name).find((o) => o.value === String(v));
        baris[f.name] = opt ? opt.label : v;
      }
    }
    ws.addRow(baris);
  }
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${key}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
