import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { requireRole } from "@/lib/auth";
import { Notice, PageHead, one } from "@/components/ui";
import { importSiswa, imporNisn } from "../../actions";

export const metadata = { title: "Impor siswa" };

export default async function Impor({ searchParams }: PageProps<"/dashboard/admin/impor">) {
  await requireRole(["admin"]);
  const sp = await searchParams;

  return (
    <>
      <PageHead
        title="Impor data siswa"
        note="Unggah file Excel data siswa (boleh langsung dari EMIS). Siswa yang sudah ada diperbarui, yang baru ditambahkan."
      />
      <Notice error={one(sp.error)} info={one(sp.info)} />

      <section className="result">
        <h2 className="h2">Format kolom</h2>
        <p className="muted">
          File ekspor EMIS/Dapodik bisa langsung diunggah apa adanya, termasuk yang berisi beberapa lembar (satu per rombel). Kolom yang
          dikenali: Nama Lengkap, NISN, NIS, Jenis Kelamin, Tempat Lahir, Tanggal Lahir, Alamat, No Telepon, Nama Ayah/Ibu Kandung, Nama Wali,
          Tingkat - Rombel (atau kelas), dan Status. Kolom lain seperti NIK diabaikan.
        </p>
        <p className="muted">
          Kelas yang belum ada dibuat otomatis di tahun ajaran aktif (nama diawali X, XI, atau XII). Sel kosong tidak menghapus data yang
          sudah ada. Bila ada satu saja baris bermasalah, tidak ada data yang disimpan.
        </p>
        <p>
          <Link href="/dashboard/admin/impor/template" className="btn btn--outline" prefetch={false}>
            Unduh template
          </Link>
        </p>
      </section>

      <form action={importSiswa} className="formgrid formgrid--col">
        <label>
          File Excel
          <input type="file" name="file" accept=".xlsx" required />
        </label>
        <SubmitButton className="btn">Impor</SubmitButton>
      </form>

      <h2 className="h2">Perbarui NISN siswa yang sudah ada</h2>
      <p className="muted">
        Unggah Excel dengan kolom <strong>nama</strong> dan <strong>nisn</strong> (10 digit). Nama harus cocok dengan data
        siswa. Setelah itu ganti username akun ke NISN di menu Akun siswa.
      </p>
      <form action={imporNisn} className="formgrid formgrid--col">
        <label>
          File Excel NISN
          <input type="file" name="file" accept=".xlsx" required />
        </label>
        <SubmitButton className="btn" pendingText="Memperbarui…">
          Perbarui NISN
        </SubmitButton>
      </form>
    </>
  );
}
