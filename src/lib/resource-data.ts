import type { SupabaseClient } from "@supabase/supabase-js";
import type { Resource } from "@/lib/resources";

type Row = Record<string, unknown>;
export type Option = { value: string; label: string };

export async function loadOptions(supabase: SupabaseClient, res: Resource) {
  const maps: Record<string, Option[]> = {};
  await Promise.all(
    res.fields
      .filter((f) => f.ref)
      .map(async (f) => {
        const { data } = await supabase.from(f.ref!.table).select(`id, ${f.ref!.label}`).order("id");
        maps[f.name] = ((data ?? []) as unknown as Row[]).map((r) => ({
          value: String(r.id),
          label: String(r[f.ref!.label]),
        }));
      }),
  );
  return (name: string): Option[] => res.fields.find((f) => f.name === name)?.options ?? maps[name] ?? [];
}
