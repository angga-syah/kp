import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DOMAIN_SISWA_LAMA, emailDariLogin } from "@/lib/akun";
import { createAdminClient } from "@/lib/supabase/admin";
import { SubmitButton } from "@/components/submit-button";
import { pindahkanEmailSiswa } from "../../actions";
import { Notice, PageHead, one } from "@/components/ui";
import { SelectionScope } from "@/components/selection";
import { BarSubmit } from "@/components/bulk-bar";
import { AutoSelect } from "@/components/auto-select";
import { SelectMenu } from "@/components/select-menu";

export const metadata = { title: "Akun siswa" };

type S = {
  id: number;
  nama: string;
  nisn: string | null;
  nis: string | null;
  tanggal_lahir: string | null;
  profile_id: string | null;
  kelas: { nama: string } | null;
};

const TAB = ["buat", "reset", "nisn"] as const;
type Tab = (typeof TAB)[number];

function Tabel({ rows, defaultChecked, kolomInfo }: { rows: S[]; defaultChecked: boolean; kolomInfo: string }) {
  const bisa = (s: S) => !!(s.nisn || s.nis);
  const semua = defaultChecked && rows.length > 0 && rows.every(bisa);
  const grup = [...new Set(rows.map((s) => s.kelas?.nama).filter((x): x is string => !!x))];
  return (
    <>
    <div className="selrow">
      <SelectMenu groups={grup} />
      <span className="muted">Centang siswa, lalu tekan tombol di bilah bawah.</span>
    </div>
    <div className="tablewrap">
      <table className="table">
        <thead>
          <tr>
            <th className="table__check">
              <input type="checkbox" data-selectall defaultChecked={semua} aria-label="Pilih semua" />
            </th>
            <th>Nama</th>
            <th>{kolomInfo}</th>
            <th>Kelas</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="table__empty">
                Tidak ada siswa pada daftar ini.
              </td>
            </tr>
          )}
          {rows.map((s) => (
            <tr key={s.id}>
              <td className="table__check">
                <input
                  type="checkbox"
                  name="siswa"
                  value={s.id}
                  data-row
                  data-group={s.kelas?.nama}
                  defaultChecked={defaultChecked && bisa(s)}
                  disabled={!bisa(s)}
                  aria-label={`Pilih ${s.nama}`}
                />
              </td>
              <td>{s.nama}</td>
              <td className="num-cell">{s.nisn || s.nis || "—"}</td>
              <td>{s.kelas?.nama ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}

export default async function AkunMassal({ searchParams }: PageProps<"/dashboard/admin/akun-massal">) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const q = (one(sp.q) ?? "").trim().replace(/[,()%*\\]/g, " ").trim();
  const kelasId = one(sp.kelas) ?? "";
  const supabase = await createClient();

  const dasar = () => {
    let r = supabase
      .from("siswa")
      .select("id, nama, nisn, nis, tanggal_lahir, profile_id, kelas(nama)", { count: "exact" })
      .eq("status", "aktif")
      .order("nama")
      .limit(100);
    if (kelasId) r = r.eq("kelas_id", kelasId);
    if (q) r = r.ilike("nama", `%${q}%`);
    return r;
  };
  const [{ data: kelas }, belum, sudah, dgnNisn] = await Promise.all([
    supabase.from("kelas").select("id, nama").order("id"),
    dasar().is("profile_id", null),
    dasar().not("profile_id", "is", null),
    dasar().not("profile_id", "is", null).not("nisn", "is", null),
  ]);
  const daftarBelum = (belum.data ?? []) as unknown as S[];
  const daftarSudah = (sudah.data ?? []) as unknown as S[];
  const { data: pengguna } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailDari = new Map((pengguna?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  // hanya siswa yang username-nya belum NISN
  const daftarNisn = ((dgnNisn.data ?? []) as unknown as S[]).filter(
    (x) => x.nisn && x.profile_id && emailDari.get(x.profile_id) !== emailDariLogin(x.nisn),
  );
  const akunLama = (pengguna?.users ?? []).filter((u) => u.email?.endsWith(`@${DOMAIN_SISWA_LAMA}`)).length;
  const tanpaId = daftarBelum.filter((x) => !x.nisn && !x.nis).length;
  const tanpaLahir = daftarBelum.filter((x) => (x.nisn || x.nis) && !x.tanggal_lahir).length;
  const siapBuat = daftarBelum.filter((x) => x.nisn || x.nis).length;
  const terfilter = q !== "" || kelasId !== "";
  const aksi = "/dashboard/admin/akun-massal/proses";

  const tabIn = one(sp.tab) as Tab | undefined;
  const tab: Tab = tabIn && TAB.includes(tabIn) ? tabIn : (belum.count ?? 0) > 0 ? "buat" : "reset";
  const jumlah: Record<Tab, number> = { buat: belum.count ?? 0, reset: sudah.count ?? 0, nisn: daftarNisn.length };
  const LABEL: Record<Tab, string> = { buat: "Belum punya akun", reset: "Sudah punya akun", nisn: "Username belum NISN" };
  const href = (ubah: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (kelasId) u.set("kelas", kelasId);
    u.set("tab", tab);
    Object.entries(ubah).forEach(([k, v]) => (v ? u.set(k, v) : u.delete(k)));
    return `/dashboard/admin/akun-massal?${u}`;
  };

  return (
    <>
      <PageHead
        title="Akun siswa"
        note="Siswa masuk dengan NISN dan kata sandi dari tanggal lahir. Setiap proses mengunduh Excel berisi kata sandinya."
        actions={
          <Link className="btn btn--outline btn--sm" href="/dashboard/admin/pengguna?peran=siswa">
            Daftar akun siswa
          </Link>
        }
      />
      <Notice error={one(sp.error)} info={one(sp.info)} />
      {akunLama > 0 && (
        <form action={pindahkanEmailSiswa} className="notice">
          <p>
            {akunLama} akun siswa masih memakai email internal lama (<code>@{DOMAIN_SISWA_LAMA}</code>) yang tidak menerima surat. Pindahkan ke{" "}
            <code>{emailDariLogin("NISN")}</code>? Username dan kata sandi siswa tidak berubah.
          </p>
          <SubmitButton className="btn btn--sm" pendingText="Memindahkan…">
            Pindahkan email {akunLama} akun
          </SubmitButton>
        </form>
      )}

      <nav className="tabs" aria-label="Jenis proses">
        {TAB.filter((t) => t !== "nisn" || jumlah.nisn > 0 || tab === "nisn").map((t) => (
          <Link key={t} href={href({ tab: t })} className="tabs__tab" aria-current={tab === t ? "page" : undefined}>
            {LABEL[t]} <span className="tabs__n num-cell">{jumlah[t]}</span>
          </Link>
        ))}
      </nav>

      <form method="get" className="toolbar" role="search">
        <input type="hidden" name="tab" value={tab} />
        <label className="toolbar__search">
          <span className="sr">Cari nama siswa</span>
          <input name="q" type="search" defaultValue={q} placeholder="Cari nama siswa… lalu tekan Enter" />
        </label>
        <AutoSelect
          name="kelas"
          label="Kelas"
          value={kelasId}
          options={(kelas ?? []).map((k) => ({ value: String(k.id), label: k.nama }))}
        />
        {terfilter && (
          <Link className="btn btn--outline btn--sm" href={`/dashboard/admin/akun-massal?tab=${tab}`}>
            Hapus filter
          </Link>
        )}
      </form>

      {tab === "buat" && (
        <section className="section-block">
          <p className="muted">
            Siswa terpilih dibuatkan akun dengan kata sandi tanggal lahir (<code>ttbbtttt</code>) dan wajib menggantinya saat masuk pertama.
            {tanpaId > 0 && ` ${tanpaId} siswa tanpa NISN/NIS dilewati; lengkapi datanya dulu.`}
            {tanpaLahir > 0 && ` ${tanpaLahir} siswa tanpa tanggal lahir mendapat kata sandi acak.`}
          </p>
          <SelectionScope action={aksi} method="post" initial={siapBuat} bar={<BarSubmit label="Buat akun dan unduh kata sandi" />}>
            <input type="hidden" name="mode" value="buat" />
            <Tabel rows={daftarBelum} defaultChecked kolomInfo="NISN / NIS" />
          </SelectionScope>
          {(belum.count ?? 0) > 100 && <p className="muted">Menampilkan 100 pertama. Pilih kelas untuk melihat sisanya.</p>}
        </section>
      )}

      {tab === "reset" && (
        <section className="section-block">
          <p className="muted">Untuk siswa yang lupa kata sandi: dikembalikan ke tanggal lahir dan wajib diganti saat masuk berikutnya.</p>
          <SelectionScope action={aksi} method="post" bar={<BarSubmit label="Reset dan unduh kata sandi baru" />}>
            <input type="hidden" name="mode" value="reset" />
            <Tabel rows={daftarSudah} defaultChecked={false} kolomInfo="Username" />
          </SelectionScope>
          {(sudah.count ?? 0) > 100 && <p className="muted">Menampilkan 100 pertama. Pilih kelas atau cari nama untuk melihat sisanya.</p>}
        </section>
      )}

      {tab === "nisn" && (
        <section className="section-block">
          <p className="muted">Username berubah dari nomor sementara menjadi NISN; kata sandi tidak berubah.</p>
          <SelectionScope action={aksi} method="post" initial={daftarNisn.length} bar={<BarSubmit label="Ganti username dan unduh daftar" />}>
            <input type="hidden" name="mode" value="nisn" />
            <Tabel rows={daftarNisn} defaultChecked kolomInfo="NISN" />
          </SelectionScope>
        </section>
      )}
    </>
  );
}
