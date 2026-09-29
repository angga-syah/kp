import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isRole, roleHome, type Role } from "@/lib/roles";

export type Profile = { id: string; nama: string; role: Role; email?: string };

/**
 * Mengembalikan null bila belum login atau akun belum diaktifkan admin.
 * Untuk rute /dashboard, proxy sudah memverifikasi sesi dan profil lalu meneruskannya lewat header
 * x-profil (header masuk dari klien selalu dibuang proxy), sehingga tidak perlu kueri ulang.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const raw = (await headers()).get("x-profil");
  if (raw) {
    try {
      const p = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
      if (p?.id && typeof p.nama === "string" && isRole(p.role)) return p as Profile;
    } catch {
      // jatuh ke pencarian database di bawah
    }
  }

  const supabase = await createClient();
  const {
    data: claims,
  } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return null;
  const { data } = await supabase.from("profiles").select("id, nama, role, aktif").eq("id", uid).single();
  if (!data || !data.aktif) return null;
  return { id: data.id, nama: data.nama, role: data.role } as Profile;
});

export async function requireRole(roles: Role[]): Promise<Profile> {
  const p = await getProfile();
  if (!p) redirect("/masuk");
  if (!roles.includes(p.role)) redirect(roleHome[p.role]);
  return p;
}
