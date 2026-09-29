import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/auth";

/** null = boleh semua kelas (admin); array = hanya kelas yang diampu/diwalikan guru. */
export async function kelasBolehIsi(supabase: SupabaseClient, p: Profile): Promise<number[] | null> {
  if (p.role === "admin") return null;
  const { data: g } = await supabase.from("guru").select("id").eq("profile_id", p.id).maybeSingle();
  if (!g) return [];
  const [{ data: j }, { data: k }] = await Promise.all([
    supabase.from("jadwal").select("kelas_id").eq("guru_id", g.id),
    supabase.from("kelas").select("id").eq("wali_guru_id", g.id),
  ]);
  const ids = [...(j ?? []).map((x) => x.kelas_id as number), ...(k ?? []).map((x) => x.id as number)];
  return [...new Set(ids)];
}

/** null = semua mapel (admin atau wali kelas); array = mapel yang diajar guru di kelas tersebut menurut jadwal. */
export async function mapelBolehIsi(supabase: SupabaseClient, p: Profile, kelasId: number): Promise<number[] | null> {
  if (p.role === "admin") return null;
  const { data: g } = await supabase.from("guru").select("id").eq("profile_id", p.id).maybeSingle();
  if (!g) return [];
  const [{ data: wali }, { data: j }] = await Promise.all([
    supabase.from("kelas").select("id").eq("id", kelasId).eq("wali_guru_id", g.id).maybeSingle(),
    supabase.from("jadwal").select("mapel_id").eq("guru_id", g.id).eq("kelas_id", kelasId),
  ]);
  if (wali) return null;
  return [...new Set((j ?? []).map((x) => x.mapel_id as number))];
}

type Hitung ={ hadir: number; izin: number; sakit: number; alpa: number };

export async function rekapPresensi(supabase: SupabaseClient, kelasId: number, bulan: string) {
  const [y, m] = bulan.split("-").map(Number);
  const awal = `${bulan}-01`;
  const akhir = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const { data: siswa } = await supabase
    .from("siswa")
    .select("id, nama, nisn")
    .eq("kelas_id", kelasId)
    .eq("status", "aktif")
    .order("nama");
  const ids = (siswa ?? []).map((s) => s.id as number);
  const { data: pr } = ids.length
    ? await supabase.from("presensi").select("siswa_id, status").in("siswa_id", ids).gte("tanggal", awal).lte("tanggal", akhir)
    : { data: [] };
  const hitung = new Map<number, Hitung>();
  (pr ?? []).forEach((r) => {
    const c: Hitung = hitung.get(r.siswa_id) ?? { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
    c[r.status as keyof Hitung] += 1;
    hitung.set(r.siswa_id, c);
  });
  return (siswa ?? []).map((s) => {
    const c: Hitung = hitung.get(s.id) ?? { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
    const total = c.hadir + c.izin + c.sakit + c.alpa;
    return { id: s.id as number, nama: s.nama as string, nisn: (s.nisn as string | null) ?? "", ...c, total, persen: total ? (c.hadir / total) * 100 : null };
  });
}
