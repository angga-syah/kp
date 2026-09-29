import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleLabel, type Role } from "@/lib/roles";
import { EMAIL_DASAR, usernameDariEmail } from "@/lib/akun";
import { Notice, PageHead, one } from "@/components/ui";
import { ConfirmButton, SubmitButton } from "@/components/submit-button";
import { Pager } from "@/components/pager";
import { ResetSandi } from "@/components/reset-sandi";
import { SelectionScope } from "@/components/selection";
import { SelectMenu } from "@/components/select-menu";
import { BulkBar } from "@/components/bulk-bar";
import { AutoSelect } from "@/components/auto-select";
import { aktifkanUser, bulkDeleteUser, createUser, deleteUser, deleteUserById } from "../../actions";

export const metadata = { title: "Akun login" };

const OK: Record<string, string> = { dibuat: "Akun dibuat.", aktif: "Akun diaktifkan.", hapus: "Akun dihapus." };
const TAB = ["staf", "siswa", "alumni", "menunggu"] as const;
type Tab = (typeof TAB)[number];
const LABEL: Record<Tab, string> = { staf: "Guru & staf", siswa: "Siswa", alumni: "Alumni", menunggu: "Menunggu aktivasi" };
const PERAN_STAF: Role[] = ["admin", "guru", "bk"];

type P = { id: string; nama: string; role: Role; aktif: boolean; wajib_ganti_sandi: boolean };

export default async function Pengguna({ searchParams }: PageProps<"/dashboard/admin/pengguna">) {
  const me = await requireRole(["admin"]);
  const sp = await searchParams;
  const peranIn = one(sp.peran) ?? "";
  // tautan lama ?peran=guru / admin / bk tetap membuka tab Guru & staf
  const tab: Tab = (TAB as readonly string[]).includes(peranIn) ? (peranIn as Tab) : "staf";
  const belum = one(sp.login) === "belum";
  const q = (one(sp.q) ?? "").trim().replace(/[,()%*\\]/g, " ").trim();
  const per = [25, 50, 100].includes(Number(one(sp.per))) ? Number(one(sp.per)) : 25;
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const pilih = one(sp.pilih) === "1";
  const supabase = await createClient();

  // tab → syarat: aktif atau belum, dan daftar peran
  const syarat = (t: Tab): [boolean, Role[] | null] =>
    t === "menunggu" ? [false, null] : t === "staf" ? [true, PERAN_STAF] : [true, [t]];
  const hitung = (t: Tab) => {
    const [aktif, peran] = syarat(t);
    const r = supabase.from("profiles").select("*", { count: "exact", head: true }).eq("aktif", aktif);
    return peran ? r.in("role", peran) : r;
  };
  const [aktif, peran] = syarat(tab);
  let lq = supabase
    .from("profiles")
    .select("id, nama, role, aktif, wajib_ganti_sandi", { count: "exact" })
    .eq("aktif", aktif)
    .order("nama")
    .range((page - 1) * per, page * per - 1);
  if (peran) lq = lq.in("role", peran);
  if (q) lq = lq.ilike("nama", `%${q}%`);
  if (belum && tab !== "menunggu") lq = lq.eq("wajib_ganti_sandi", true);

  const [counts, { data, count }] = await Promise.all([Promise.all(TAB.map(hitung)), lq]);
  const rows = (data ?? []) as P[];
  const total = count ?? rows.length;
  const jumlah = Object.fromEntries(TAB.map((t, i) => [t, counts[i].count ?? 0])) as Record<Tab, number>;

  const email = new Map<string, string>();
  if (rows.length > 0) {
    const { data: u } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 });
    u?.users?.forEach((x) => x.email && email.set(x.id, x.email));
  }

  const href = (ubah: Record<string, string | number | undefined>) => {
    const s = new URLSearchParams();
    if (tab !== "staf") s.set("peran", tab);
    if (q) s.set("q", q);
    if (belum) s.set("login", "belum");
    if (per !== 25) s.set("per", String(per));
    if (pilih) s.set("pilih", "1");
    Object.entries(ubah).forEach(([k, v]) => (v === undefined || v === "" ? s.delete(k) : s.set(k, String(v))));
    const t = s.toString();
    return t ? `/dashboard/admin/pengguna?${t}` : "/dashboard/admin/pengguna";
  };
  const okKey = one(sp.ok);
  const peranOptions = (
    <>
      {(Object.keys(roleLabel) as Role[]).map((r) => (
        <option key={r} value={r}>
          {roleLabel[r]}
        </option>
      ))}
    </>
  );
  const grup = [...new Set(rows.map((u) => roleLabel[u.role]))];
  const kolomPeran = tab === "staf";
  const nKolom = (pilih ? 1 : 0) + (kolomPeran ? 4 : 3);

  const tabel = (
    <div className="tablewrap">
      <table className="table table--akun">
        <thead>
          <tr>
            {pilih && (
              <th className="table__check">
                <input type="checkbox" data-selectall aria-label="Pilih semua di halaman ini" />
              </th>
            )}
            <th>Nama dan username</th>
            {kolomPeran && <th>Peran</th>}
            <th>Status</th>
            <th className="table__act">
              <span className="sr">Aksi</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={nKolom} className="table__empty">
                {q || belum ? "Tidak ada akun yang cocok." : "Belum ada akun."}
              </td>
            </tr>
          )}
          {rows.map((u) => (
            <tr key={u.id}>
              {pilih && (
                <td className="table__check">
                  <input
                    type="checkbox"
                    name="ids"
                    value={u.id}
                    data-row
                    data-group={roleLabel[u.role]}
                    disabled={u.id === me.id}
                    aria-label={`Pilih ${u.nama}`}
                  />
                </td>
              )}
              <td>
                <strong className="akun__nama">{u.nama}</strong>
                <span className="sub akun__user">{usernameDariEmail(email.get(u.id)) || "—"}</span>
              </td>
              {kolomPeran && (
                <td>
                  <span className="tag">{roleLabel[u.role]}</span>
                </td>
              )}
              <td>
                {u.wajib_ganti_sandi ? (
                  <span className="tag tag--warn">Belum pernah masuk</span>
                ) : (
                  <span className="muted">Aktif dipakai</span>
                )}
              </td>
              <td className="table__act">
                {u.id === me.id ? (
                  <span className="muted">Akun Anda</span>
                ) : (
                  <span className="table__acts">
                    <ResetSandi id={u.id} nama={u.nama} />
                    {!pilih && (
                      <ConfirmButton className="linkbtn" message={`Hapus akun ${u.nama}?`} formAction={deleteUserById.bind(null, u.id)}>
                        Hapus
                      </ConfirmButton>
                    )}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <PageHead
        title="Akun login"
        note={tab === "siswa" ? "Akun siswa dibuat dan direset massal di menu Akun siswa." : "Kelola akun guru, guru BK, admin, dan alumni."}
        actions={
          <>
            {tab === "siswa" && (
              <Link className="btn btn--outline btn--sm" href="/dashboard/admin/akun-massal">
                Buat / reset akun siswa
              </Link>
            )}
          </>
        }
      />
      <Notice
        error={one(sp.error)}
        info={okKey === "dibuat" && one(sp.email) ? `Akun dibuat. Email login: ${one(sp.email)}` : okKey ? OK[okKey] : undefined}
      />

      <details className="panel" id="daftar-baru" open={one(sp.baru) === "1" || !!one(sp.error)}>
        <summary>+ Daftarkan akun baru</summary>
        <form action={createUser} className="formgrid formgrid--flat">
          <label>
            Nama
            <input name="nama" required />
          </label>
          <label>
            Peran
            <select name="role" defaultValue="guru">
              {peranOptions}
            </select>
          </label>
          <label>
            Kata sandi sementara
            <input name="password" type="password" minLength={8} autoComplete="new-password" required />
            <span className="hint">Minimal 8 karakter. Berikan ke pemilik akun; wajib diganti saat masuk pertama.</span>
          </label>
          <label>
            Email (boleh kosong)
            <input name="email" type="email" placeholder={EMAIL_DASAR.replace("@", "+peran.nama@")} />
            <span className="hint">Kosongkan: dibuat otomatis.</span>
          </label>
          <label>
            Tahun lulus (khusus alumni)
            <input name="tahun_lulus" type="number" min={1990} max={2100} />
          </label>
          <div className="formgrid__actions">
            <SubmitButton pendingText="Membuat…">Daftarkan</SubmitButton>
          </div>
        </form>
      </details>

      <nav className="tabs" aria-label="Jenis akun">
        {TAB.filter((t) => t !== "menunggu" || jumlah.menunggu > 0).map((t) => (
          <Link
            key={t}
            href={href({ peran: t === "staf" ? undefined : t, page: undefined, login: undefined, pilih: undefined })}
            className="tabs__tab"
            aria-current={tab === t ? "page" : undefined}
          >
            {LABEL[t]} <span className="tabs__n num-cell">{jumlah[t]}</span>
          </Link>
        ))}
      </nav>

      {tab !== "menunggu" && (
        <form method="get" className="toolbar" role="search">
          {tab !== "staf" && <input type="hidden" name="peran" value={tab} />}
          {pilih && <input type="hidden" name="pilih" value="1" />}
          <label className="toolbar__search">
            <span className="sr">Cari nama</span>
            <input name="q" type="search" defaultValue={q} placeholder="Cari nama… lalu tekan Enter" />
          </label>
          <AutoSelect
            name="login"
            label="Status"
            value={belum ? "belum" : ""}
            options={[{ value: "belum", label: "Belum pernah masuk" }]}
          />
          {total > 25 && (
            <AutoSelect
              name="per"
              label="Per halaman"
              value={String(per)}
              options={[50, 100].map((n) => ({ value: String(n), label: String(n) }))}
              semua="25"
            />
          )}
          {(q || belum) && (
            <Link className="btn btn--outline btn--sm" href={href({ q: undefined, login: undefined, page: undefined })}>
              Hapus filter
            </Link>
          )}
          {!pilih && rows.length > 1 && (
            <Link className="btn btn--outline btn--sm toolbar__end" href={href({ pilih: "1" })}>
              Pilih beberapa
            </Link>
          )}
        </form>
      )}

      {tab === "menunggu" ? (
        <ul className="cards">
          {rows.length === 0 && <li className="muted">Tidak ada akun yang menunggu.</li>}
          {rows.map((u) => (
            <li key={u.id} className="card">
              <strong>{u.nama}</strong> <span className="muted">{email.get(u.id)}</span>
              <form action={aktifkanUser} className="formgrid formgrid--tight">
                <input type="hidden" name="id" value={u.id} />
                <label>
                  Peran
                  <select name="role" defaultValue="siswa">
                    {peranOptions}
                  </select>
                </label>
                <label>
                  Tahun lulus (alumni)
                  <input name="tahun_lulus" type="number" min={1990} max={2100} />
                </label>
                <SubmitButton className="btn btn--outline" pendingText="Mengaktifkan…">
                  Aktifkan
                </SubmitButton>
              </form>
              <form action={deleteUser}>
                <input type="hidden" name="id" value={u.id} />
                <ConfirmButton className="linkbtn" message="Hapus akun ini?">
                  Hapus
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      ) : pilih ? (
        <SelectionScope
          bar={
            <BulkBar
              kata="akun"
              deleteAction={bulkDeleteUser}
              submits={[{ label: "Reset kata sandi", formAction: "/dashboard/admin/pengguna/massal", method: "post", name: "mode", value: "reset" }]}
            />
          }
        >
          <input type="hidden" name="_back" value={href({})} />
          <div className="selrow">
            <SelectMenu groups={kolomPeran ? grup : []} groupTitle="Pilih per peran" />
            <span className="muted">Centang akun, lalu pilih aksinya di bilah bawah.</span>
            <Link className="btn btn--outline btn--sm" href={href({ pilih: undefined })}>
              Selesai memilih
            </Link>
          </div>
          {tabel}
        </SelectionScope>
      ) : (
        // formulir pembungkus untuk tombol Hapus per baris (formAction)
        <form className="tabelform">{tabel}</form>
      )}
      <Pager page={page} pages={Math.max(1, Math.ceil(total / per))} total={total} per={per} hrefFor={(n) => href({ page: n })} />
    </>
  );
}
