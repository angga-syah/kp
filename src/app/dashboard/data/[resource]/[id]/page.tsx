import Link from "next/link";
import { ConfirmButton, SubmitButton } from "@/components/submit-button";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { resources } from "@/lib/resources";
import { loadOptions } from "@/lib/resource-data";
import { Notice, PageHead, one } from "@/components/ui";
import { ResourceFields } from "@/components/resource-fields";
import { deleteRow, updateRow } from "../../../actions";

export const metadata = { title: "Ubah data" };

export default async function EditPage({ params, searchParams }: PageProps<"/dashboard/data/[resource]/[id]">) {
  const { resource: key, id } = await params;
  const sp = await searchParams;
  const res = resources[key];
  if (!res) notFound();
  await requireRole(res.write);
  const supabase = await createClient();
  const { data: row } = await supabase.from(res.table).select("*").eq("id", id).maybeSingle();
  if (!row) notFound();
  const optionsOf = await loadOptions(supabase, res);

  return (
    <>
      <PageHead title={`Ubah ${res.title.toLowerCase()}`} />
      <Notice error={one(sp.error)} />
      <form action={updateRow.bind(null, key, id)} className="formgrid formgrid--page">
        <ResourceFields res={res} optionsOf={optionsOf} values={row as Record<string, unknown>} />
        <div className="formgrid__actions">
          <SubmitButton className="btn">Simpan perubahan</SubmitButton>
          <Link href={`/dashboard/data/${key}`} className="btn btn--outline">
            Batal
          </Link>
        </div>
      </form>

      <form action={deleteRow.bind(null, key, id)} className="zona-hapus">
        <div>
          <strong>Hapus data ini</strong>
          <p className="muted">
            {["siswa", "guru", "alumni"].includes(key)
              ? "Data dan akun login yang tertaut ikut terhapus. Tidak bisa dibatalkan."
              : "Data akan dihapus permanen. Tidak bisa dibatalkan."}
          </p>
        </div>
        <ConfirmButton className="btn btn--outline btn--danger" message="Hapus data ini?" tanya="Yakin hapus?">
          Hapus
        </ConfirmButton>
      </form>
    </>
  );
}
