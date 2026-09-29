import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { kelasBolehIsi } from "@/lib/akses";
import { PENGAJAR } from "@/lib/roles";
import { geserHari, hariIni, tanggalPanjang, tanggalValid } from "@/lib/waktu";
import { Notice, PageHead, one } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { PresensiQuick } from "@/components/presensi-quick";
import { AutoForm, JagaPerubahan } from "@/components/auto-form";
import { savePresensi } from "../actions";

const STATUS = [
  ["hadir", "Hadir"],
  ["izin", "Izin"],
  ["sakit", "Sakit"],
  ["alpa", "Alpa"],
] as const;

export const metadata = { title: "Presensi" };

export default async function Presensi({ searchParams }: PageProps<"/dashboard/presensi">) {
  const p = await requireRole(PENGAJAR);
  const sp = await searchParams;
  const supabase = await createClient();
  const boleh = await kelasBolehIsi(supabase, p);

  let kq = supabase.from("kelas").select("id, nama").order("nama");
  if (boleh) kq = kq.in("id", boleh.length ? boleh : [-1]);
  const { data: kelas } = await kq;

  const hari = hariIni();
  const tIn = one(sp.tanggal);
  const tanggal = tanggalValid(tIn) && tIn <= hari ? tIn : hari;
  // guru dengan satu kelas langsung diarahkan ke kelasnya
  const kelasId = one(sp.kelas) ?? (kelas?.length === 1 ? String(kelas[0].id) : "");
  const diizinkan = !!kelas?.some((k) => String(k.id) === kelasId);
  const namaKelas = kelas?.find((k) => String(k.id) === kelasId)?.nama;

  let siswa: { id: number; nama: string; nisn: string | null }[] = [];
  const existing = new Map<number, { status: string; keterangan: string | null }>();
  if (kelasId && diizinkan) {
    const { data } = await supabase
      .from("siswa")
      .select("id, nama, nisn")
      .eq("kelas_id", kelasId)
      .eq("status", "aktif")
      .order("nama");
    siswa = data ?? [];
    if (siswa.length) {
      const { data: pr } = await supabase
        .from("presensi")
        .select("siswa_id, status, keterangan")
        .eq("tanggal", tanggal)
        .in("siswa_id", siswa.map((s) => s.id));
      (pr ?? []).forEach((r) => existing.set(r.siswa_id, { status: r.status, keterangan: r.keterangan }));
    }
  }
  const sudahDiisi = existing.size > 0;
  const awal = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
  siswa.forEach((s) => {
    const st = (existing.get(s.id)?.status ?? "hadir") as keyof typeof awal;
    if (st in awal) awal[st] += 1;
  });
  const minggu = new Date(`${tanggal}T00:00:00Z`).getUTCDay() === 0;
  const hrefTgl = (t: string) => `/dashboard/presensi?${new URLSearchParams({ ...(kelasId ? { kelas: kelasId } : {}), tanggal: t })}`;
  const besok = geserHari(tanggal, 1);

  return (
    <>
      <PageHead
        title="Presensi"
        note="Semua siswa awalnya hadir. Ubah yang izin, sakit, atau alpa, lalu simpan."
        actions={
          <Link className="btn btn--outline btn--sm" href={`/dashboard/rekap-presensi${kelasId ? `?kelas=${kelasId}` : ""}`}>
            Rekap bulanan
          </Link>
        }
      />
      <Notice error={one(sp.error)} info={one(sp.ok) === "1" ? `Presensi ${namaKelas ?? ""} tanggal ${tanggalPanjang(tanggal)} tersimpan.` : undefined} />
      {boleh && boleh.length === 0 && (
        <p className="notice notice--error">
          Belum ada kelas yang ditugaskan kepada Anda. Minta admin menautkan Anda pada menu Jadwal atau sebagai wali kelas.
        </p>
      )}

      <AutoForm>
        <label>
          Kelas
          <select name="kelas" defaultValue={kelasId} required>
            <option value="" disabled>
              Pilih kelas…
            </option>
            {(kelas ?? []).map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tanggal
          <input type="date" name="tanggal" defaultValue={tanggal} max={hari} required />
        </label>
        <noscript>
          <button className="btn btn--outline" type="submit">
            Tampilkan
          </button>
        </noscript>
        <nav className="daynav" aria-label="Pindah tanggal">
          <Link className="btn btn--outline btn--sm" href={hrefTgl(geserHari(tanggal, -1))} aria-label="Hari sebelumnya">
            ‹ Sebelumnya
          </Link>
          {tanggal !== hari && (
            <Link className="btn btn--outline btn--sm" href={hrefTgl(hari)}>
              Hari ini
            </Link>
          )}
          {besok <= hari && (
            <Link className="btn btn--outline btn--sm" href={hrefTgl(besok)} aria-label="Hari berikutnya">
              Berikutnya ›
            </Link>
          )}
        </nav>
      </AutoForm>

      {!kelasId && <p className="empty-hint">Pilih kelas untuk mulai mengisi kehadiran.</p>}
      {kelasId && !diizinkan && <p className="notice notice--error">Anda tidak memiliki akses ke kelas ini.</p>}

      {kelasId && diizinkan && (
        <form action={savePresensi} className="sheet">
          <input type="hidden" name="kelas" value={kelasId} />
          <input type="hidden" name="tanggal" value={tanggal} />
          <div className="sheet__head">
            <h2 className="h2">
              Kelas {namaKelas} <span className="sheet__tgl">{tanggalPanjang(tanggal)}</span>
            </h2>
            {sudahDiisi ? (
              <span className="tag">Sudah diisi</span>
            ) : (
              <span className="tag tag--warn">Belum diisi</span>
            )}
          </div>
          {minggu && <p className="notice notice--error">Tanggal ini hari Minggu. Pastikan tanggalnya benar.</p>}
          {siswa.length > 0 && <PresensiQuick initial={awal} />}
          <div className="tablewrap">
            <table className="table table--presensi">
              <thead>
                <tr>
                  <th className="num-cell">No</th>
                  <th>Siswa</th>
                  <th>Status</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {siswa.length === 0 && (
                  <tr>
                    <td colSpan={4} className="table__empty">
                      Belum ada siswa aktif di kelas ini.
                    </td>
                  </tr>
                )}
                {siswa.map((s, i) => {
                  const ada = existing.get(s.id);
                  return (
                    <tr key={s.id}>
                      <td className="num-cell muted">{i + 1}</td>
                      <td>
                        {s.nama}
                        {s.nisn && <span className="sub num-cell">{s.nisn}</span>}
                      </td>
                      <td>
                        <fieldset className="seg">
                          <legend className="sr">Status {s.nama}</legend>
                          {STATUS.map(([v, l]) => (
                            <label key={v} className={`seg__opt seg__opt--${v}`}>
                              <input type="radio" name={`status_${s.id}`} value={v} defaultChecked={(ada?.status ?? "hadir") === v} />
                              <span>{l}</span>
                            </label>
                          ))}
                        </fieldset>
                      </td>
                      <td className="ket">
                        <input
                          name={`ket_${s.id}`}
                          defaultValue={ada?.keterangan ?? ""}
                          maxLength={200}
                          placeholder="mis. surat dokter"
                          aria-label={`Keterangan ${s.nama}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {siswa.length > 0 && (
            <div className="savebar">
              <SubmitButton>Simpan presensi</SubmitButton>
              <JagaPerubahan />
            </div>
          )}
        </form>
      )}
    </>
  );
}
