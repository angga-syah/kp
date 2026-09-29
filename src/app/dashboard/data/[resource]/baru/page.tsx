import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { resources } from "@/lib/resources";
import { loadOptions } from "@/lib/resource-data";
import { Notice, PageHead, one } from "@/components/ui";
import { ResourceFields } from "@/components/resource-fields";
import { SubmitButton } from "@/components/submit-button";
import { createRow } from "../../../actions";

export async function generateMetadata({ params }: PageProps<"/dashboard/data/[resource]/baru">) {
  const { resource } = await params;
  return { title: `Tambah ${resources[resource]?.title.toLowerCase() ?? "data"}` };
}

export default async function Baru({ params, searchParams }: PageProps<"/dashboard/data/[resource]/baru">) {
  const { resource: key } = await params;
  const sp = await searchParams;
  const res = resources[key];
  if (!res) notFound();
  await requireRole(res.write);
  const supabase = await createClient();
  const optionsOf = await loadOptions(supabase, res);
  // isian awal dari alamat (mis. dari jadwal mingguan atau "Simpan dan tambah lagi")
  const awal = Object.fromEntries(res.fields.map((f) => [f.name, one(sp[f.name])]).filter(([, v]) => v));

  return (
    <>
      <PageHead title={`Tambah ${res.title.toLowerCase()}`} />
      <Notice error={one(sp.error)} info={one(sp.ok) === "tambah" ? "Data ditambahkan. Silakan isi data berikutnya." : undefined} />
      <form action={createRow.bind(null, key)} className="formgrid formgrid--page">
        <ResourceFields res={res} optionsOf={optionsOf} awal={awal} />
        <div className="formgrid__actions">
          <SubmitButton pendingText="Menyimpan…">Simpan</SubmitButton>
          <SubmitButton className="btn btn--outline" name="_lagi" value="1" pendingText="Menyimpan…">
            Simpan dan tambah lagi
          </SubmitButton>
          <Link className="btn btn--outline" href={`/dashboard/data/${key}`}>
            Batal
          </Link>
        </div>
      </form>
    </>
  );
}
