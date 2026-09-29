import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { labelKolom, resources } from "@/lib/resources";
import { loadOptions } from "@/lib/resource-data";
import { HARI } from "@/lib/roles";
import { hpRapi, ringkas } from "@/lib/format";
import { PER_OPTIONS, buatHref, parseListParams, terapkanFilter, terapkanUrut } from "@/lib/data-query";
import { Notice, PageHead, one } from "@/components/ui";
import { Pager } from "@/components/pager";
import { SelectionScope } from "@/components/selection";
import { BulkBar } from "@/components/bulk-bar";
import { AutoSelect } from "@/components/auto-select";
import { SelectMenu } from "@/components/select-menu";
import { bulkDelete, bulkUpdate } from "../../actions";

type Row = Record<string, unknown>;
const OK: Record<string, string> = {
  tambah: "Data ditambahkan.",
  ubah: "Perubahan disimpan.",
  hapus: "Data dihapus.",
  impor: "Impor selesai.",
};

export async function generateMetadata({ params }: PageProps<"/dashboard/data/[resource]">) {
  const { resource } = await params;
  return { title: resources[resource]?.title ?? "Data" };
}

export default async function DataPage({ params, searchParams }: PageProps<"/dashboard/data/[resource]">) {
  const { resource: key } = await params;
  const sp = await searchParams;
  const res = resources[key];
  if (!res) notFound();
  const me = await requireRole(res.read);
  const canWrite = res.write.includes(me.role);
  const supabase = await createClient();

  const p = parseListParams(res, sp);
  const base = `/dashboard/data/${key}`;
  const [optionsOf, { data, count }] = await Promise.all([
    loadOptions(supabase, res),
    terapkanUrut(terapkanFilter(supabase.from(res.table).select("*", { count: "exact" }), res, p), res, p).range(
      (p.page - 1) * p.per,
      p.page * p.per - 1,
    ),
  ]);
  const rows = (data ?? []) as Row[];
  const total = count ?? rows.length;
  const pages = Math.max(1, Math.ceil(total / p.per));
  const terfilter = p.q !== "" || p.filters.length > 0;
  const okKey = one(sp.ok);

  function show(name: string, v: unknown) {
    if (v === null || v === undefined || v === "") return "—";
    if (name === "hari") return HARI[Number(v)] ?? String(v);
    if (res.fields.find((f) => f.name === name)?.type === "time") return String(v).slice(0, 5);
    if (typeof v === "boolean") return v ? "Ya" : "Tidak";
    if (name === "no_hp") return hpRapi(String(v));
    if (res.fields.find((f) => f.name === name)?.type === "textarea") return ringkas(String(v));
    const opt = optionsOf(name).find((o) => o.value === String(v));
    return opt ? opt.label : String(v);
  }

  const cariAda = res.fields.some((f) => f.type === "text" || f.type === "textarea");
  const filterFields = (res.filters ?? []).flatMap((n) => {
    const f = res.fields.find((x) => x.name === n);
    return f ? [{ name: n, label: f.short ?? f.label, options: optionsOf(n) }] : [];
  });
  const [filterUtama, ...filterLain] = filterFields;
  const lainAktif = filterLain.some((f) => p.filters.some(([n]) => n === f.name)) || p.per !== 20;
  const bulkFields = (res.bulk ?? []).flatMap((n) => {
    const f = res.fields.find((x) => x.name === n);
    return f ? [{ name: n, label: f.short ?? f.label, options: optionsOf(n) }] : [];
  });
  const updateActions = Object.fromEntries(bulkFields.map((f) => [f.name, bulkUpdate.bind(null, key, f.name)]));
  const importHref = key === "siswa" ? "/dashboard/admin/impor" : `${base}/impor`;
  const arah = (col: string) => (p.sort === col ? (p.dir === "asc" ? "ascending" : "descending") : "none");
  const kolom = res.list;
  const groupBy = res.groupBy;
  const grupList = groupBy
    ? [...new Set(rows.map((r) => show(groupBy, r[groupBy])))].filter((g) => g !== "—").sort()
    : [];
  // mode pilih banyak (hapus/ubah massal) hanya tampil bila diminta, agar daftar biasa tetap sederhana
  const pilih = canWrite && one(sp.pilih) === "1";
  const hrefIni = buatHref(base, p);
  const denganPilih = (h: string, on: boolean) => {
    const u = new URL(h, "http://x");
    if (on) u.searchParams.set("pilih", "1");
    else u.searchParams.delete("pilih");
    return u.pathname + u.search;
  };
  const tautanBaris = (r: Row) =>
    key === "siswa" ? `/dashboard/profil-siswa/${r.id}` : canWrite ? `${base}/${r.id}` : null;

  const tabel = (
    <div className="tablewrap">
      <table className="table">
        <thead>
          <tr>
            {pilih && (
              <th className="table__check">
                <input type="checkbox" data-selectall aria-label="Pilih semua data di halaman ini" />
              </th>
            )}
            {kolom.map((c) => (
              <th key={c} aria-sort={arah(c)}>
                <Link
                  className="sortlink"
                  href={denganPilih(buatHref(base, p, { sort: c, dir: p.sort === c && p.dir === "asc" ? "desc" : "asc", page: undefined }), pilih)}
                >
                  {labelKolom(res, c)}
                  <span aria-hidden="true" className="sortlink__ind">
                    {p.sort === c ? (p.dir === "asc" ? "▲" : "▼") : ""}
                  </span>
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={kolom.length + (pilih ? 1 : 0)} className="table__empty">
                {terfilter ? (
                  <>
                    Tidak ada hasil yang cocok. <Link href={base}>Hapus pencarian dan filter</Link>
                  </>
                ) : canWrite ? (
                  <>
                    Belum ada data. <Link href={`${base}/baru`}>Tambah satu</Link>
                    {res.importable !== false && (
                      <>
                        {" "}atau <Link href={importHref}>impor dari Excel</Link>
                      </>
                    )}
                    .
                  </>
                ) : (
                  "Belum ada data."
                )}
              </td>
            </tr>
          )}
          {rows.map((r) => {
            const href = tautanBaris(r);
            return (
              <tr key={String(r.id)}>
                {pilih && (
                  <td className="table__check">
                    <input
                      type="checkbox"
                      name="ids"
                      value={String(r.id)}
                      data-row
                      data-group={groupBy ? show(groupBy, r[groupBy]) : undefined}
                      aria-label={`Pilih baris ${String(r[kolom[0]] ?? r.id)}`}
                    />
                  </td>
                )}
                {kolom.map((c, i) => (
                  <td key={c}>
                    {i === 0 && href && !pilih ? (
                      <Link className="rowlink" href={href}>
                        {show(c, r[c])}
                      </Link>
                    ) : (
                      show(c, r[c])
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <PageHead
        title={res.title}
        note={terfilter ? `${total} hasil dari pencarian atau filter` : `${total} data`}
        actions={
          <>
            {canWrite && (
              <Link className="btn btn--sm" href={`${base}/baru`}>
                + Tambah
              </Link>
            )}
            <details className="lainnya">
              <summary className="btn btn--outline btn--sm">Lainnya ▾</summary>
              <div className="lainnya__menu">
                <Link href={buatHref(`${base}/export`, p, { page: undefined })} prefetch={false}>
                  Unduh Excel
                </Link>
                {canWrite && res.importable !== false && <Link href={importHref}>Tambah banyak dari Excel</Link>}
                {canWrite && !pilih && <Link href={denganPilih(hrefIni, true)}>Pilih beberapa data (ubah/hapus sekaligus)</Link>}
              </div>
            </details>
          </>
        }
      />
      <Notice error={one(sp.error)} info={okKey ? (OK[okKey] ?? undefined) : undefined} />

      <form method="get" className="toolbar" role="search">
        <input type="hidden" name="sort" value={p.sort} />
        <input type="hidden" name="dir" value={p.dir} />
        {pilih && <input type="hidden" name="pilih" value="1" />}
        {cariAda && (
          <label className="toolbar__search">
            <span className="sr">Cari {res.title.toLowerCase()}</span>
            <input name="q" type="search" defaultValue={p.q} placeholder={`Cari ${res.title.toLowerCase()}… lalu tekan Enter`} />
          </label>
        )}
        {filterUtama && (
          <AutoSelect
            name={`f_${filterUtama.name}`}
            label={filterUtama.label}
            value={p.filters.find(([n]) => n === filterUtama.name)?.[1] ?? ""}
            options={filterUtama.options}
          />
        )}
        {(filterLain.length > 0 || rows.length >= 20) && (
          <details className="toolbar__more" open={lainAktif}>
            <summary>Filter lainnya</summary>
            <div className="toolbar__more-body">
              {filterLain.map((f) => (
                <AutoSelect key={f.name} name={`f_${f.name}`} label={f.label} value={p.filters.find(([n]) => n === f.name)?.[1] ?? ""} options={f.options} />
              ))}
              <AutoSelect
                name="per"
                label="Per halaman"
                value={String(p.per)}
                options={PER_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
                semua="20"
              />
            </div>
          </details>
        )}
        {terfilter && (
          <Link className="btn btn--outline btn--sm" href={denganPilih(base, pilih)}>
            Hapus filter
          </Link>
        )}
      </form>

      {pilih ? (
        <SelectionScope
          bar={
            <BulkBar
              fields={bulkFields}
              updateActions={updateActions}
              deleteAction={bulkDelete.bind(null, key)}
              total={total}
              kata={res.title.toLowerCase()}
            />
          }
        >
          <input type="hidden" name="_back" value={denganPilih(hrefIni, true)} />
          <div className="selrow">
            <SelectMenu groups={grupList} groupTitle={groupBy ? `Pilih per ${labelKolom(res, groupBy).toLowerCase()}` : undefined} />
            <span className="muted">Centang data, lalu pilih aksinya di bilah bawah. Tahan Shift untuk memilih rentang.</span>
            <Link className="btn btn--outline btn--sm" href={denganPilih(hrefIni, false)}>
              Selesai memilih
            </Link>
          </div>
          {tabel}
        </SelectionScope>
      ) : (
        <>
          {tabel}
          {rows.length > 0 && tautanBaris(rows[0]) && (
            <p className="muted">Klik {labelKolom(res, kolom[0]).toLowerCase()} untuk melihat atau mengubah datanya.</p>
          )}
        </>
      )}
      <Pager page={p.page} pages={pages} total={total} per={p.per} hrefFor={(n) => denganPilih(buatHref(base, p, { page: n }), pilih)} />
    </>
  );
}
