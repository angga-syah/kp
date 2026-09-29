import type { Resource } from "@/lib/resources";

export const PER_OPTIONS = [20, 50, 100];

export type ListParams = {
  q: string;
  page: number;
  per: number;
  sort: string;
  dir: "asc" | "desc";
  filters: [string, string][];
};

type Sp = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseListParams(res: Resource, sp: Sp): ListParams {
  const q = (one(sp.q) ?? "").trim().replace(/[,()%*\\]/g, " ").trim();
  const perIn = Number(one(sp.per));
  const per = PER_OPTIONS.includes(perIn) ? perIn : 20;
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const s = one(sp.sort);
  const sort = s && res.list.includes(s) ? s : res.order;
  const dir = one(sp.dir) === "desc" ? "desc" : "asc";
  const filters = (res.filters ?? []).flatMap((n) => {
    const v = one(sp["f_" + n]);
    return v ? [[n, v] as [string, string]] : [];
  });
  return { q, page, per, sort, dir, filters };
}

export function filterValue(res: Resource, name: string, v: string): string | number | boolean {
  const f = res.fields.find((x) => x.name === name);
  if (f?.cast === "int" || f?.type === "number") return Number(v);
  if (f?.cast === "bool") return v === "true";
  return v;
}

type Q = {
  eq(c: string, v: unknown): Q;
  or(f: string): Q;
  order(c: string, o?: { ascending: boolean }): Q;
};

export function terapkanFilter<T>(query: T, res: Resource, p: ListParams): T {
  let q = query as unknown as Q;
  p.filters.forEach(([n, v]) => {
    q = q.eq(n, filterValue(res, n, v));
  });
  const teks = res.fields.filter((f) => f.type === "text" || f.type === "textarea").map((f) => f.name);
  if (p.q && teks.length) q = q.or(teks.map((n) => `${n}.ilike.%${p.q}%`).join(","));
  return q as unknown as T;
}

export function terapkanUrut<T>(query: T, res: Resource, p: ListParams): T {
  let q = query as unknown as Q;
  q = q.order(p.sort, { ascending: p.dir === "asc" });
  if (p.sort === res.order && res.order2) q = q.order(res.order2);
  q = q.order("id");
  return q as unknown as T;
}

/** Bangun URL daftar dengan parameter saat ini, ditimpa `ubah` (nilai undefined menghapus parameter). */
export function buatHref(path: string, p: ListParams, ubah: Record<string, string | number | undefined> = {}) {
  const q = new URLSearchParams();
  if (p.q) q.set("q", p.q);
  if (p.per !== 20) q.set("per", String(p.per));
  if (p.sort) q.set("sort", p.sort);
  if (p.dir === "desc") q.set("dir", "desc");
  p.filters.forEach(([n, v]) => q.set("f_" + n, v));
  if (p.page > 1) q.set("page", String(p.page));
  Object.entries(ubah).forEach(([k, v]) => {
    if (v === undefined || v === "") q.delete(k);
    else q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}
