import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { resources } from "@/lib/resources";
import { Notice, PageHead, one } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { imporResource } from "../../../actions";

export async function generateMetadata({ params }: PageProps<"/dashboard/data/[resource]/impor">) {
  const { resource } = await params;
  return { title: `Impor ${resources[resource]?.title.toLowerCase() ?? "data"}` };
}

export default async function Impor({ params, searchParams }: PageProps<"/dashboard/data/[resource]/impor">) {
  const { resource: key } = await params;
  const sp = await searchParams;
  const res = resources[key];
  if (!res) notFound();
  await requireRole(res.write);
  if (res.importable === false) redirect(`/dashboard/data/${key}`);

  return (
    <>
      <PageHead
        title={`Impor ${res.title.toLowerCase()} dari Excel`}
        note="Unduh template, isi, lalu unggah. Bila ada baris yang salah, tidak ada yang tersimpan dan barisnya ditunjukkan."
        actions={
          <Link className="btn btn--outline btn--sm" href={`/dashboard/data/${key}`}>
            Kembali ke daftar
          </Link>
        }
      />
      <Notice error={one(sp.error)} info={one(sp.info)} />

      <section className="steps-box">
        <ol className="stepslist">
          <li>
            <strong>Unduh template.</strong> Kolom bertanda * wajib diisi. Kolom pilihan (misalnya kelas atau hari) sudah punya
            daftar dropdown.
            <p>
              <Link className="btn btn--outline btn--sm" href={`/dashboard/data/${key}/impor/template`} prefetch={false}>
                Unduh template
              </Link>
            </p>
          </li>
          <li>
            <strong>Isi data</strong> mulai dari baris kedua, satu data per baris.
          </li>
          <li>
            <strong>Unggah file</strong> di bawah ini.
          </li>
        </ol>
        <dl className="colspec">
          {res.fields.map((f) => (
            <div key={f.name}>
              <dt>
                {f.short ?? f.label}
                {f.required ? " *" : ""}
              </dt>
              <dd>
                {f.type === "select"
                  ? "Pilih dari daftar"
                  : f.type === "number"
                    ? "Angka"
                    : f.type === "date"
                      ? "Tanggal (2026-09-30 atau 30-09-2026)"
                      : f.type === "time"
                        ? "Jam (07:30)"
                        : "Teks"}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <form action={imporResource.bind(null, key)} className="formgrid formgrid--col">
        <label>
          File Excel (.xlsx)
          <input type="file" name="file" accept=".xlsx" required />
        </label>
        <SubmitButton pendingText="Memproses…">Impor data</SubmitButton>
      </form>
    </>
  );
}
