import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isRole, roleHome } from "@/lib/roles";
import { ambilProfil, simpanProfil } from "@/lib/redis";

type CookieSet = { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] };

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const path = request.nextUrl.pathname;

  if (!url || !key) {
    return path.startsWith("/dashboard")
      ? NextResponse.redirect(new URL("/masuk", request.url))
      : NextResponse.next();
  }

  const pending: CookieSet[] = [];
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) =>
        list.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          pending.push({ name, value, options });
        }),
    },
  });

  // getClaims memverifikasi JWT secara lokal (tanpa panggilan jaringan) bila proyek memakai kunci asimetris.
  const {
    data: claimsData,
  } = await supabase.auth.getClaims();
  const uid = claimsData?.claims?.sub;

  const alihkan = (to: string) => {
    const r = NextResponse.redirect(new URL(to, request.url));
    pending.forEach((c) => r.cookies.set(c.name, c.value, c.options));
    return r;
  };
  // Header x-profil selalu dibuang dari permintaan masuk; hanya proxy yang boleh mengisinya.
  const lanjut = (profil?: object) => {
    const h = new Headers(request.headers);
    h.delete("x-profil");
    if (profil) h.set("x-profil", Buffer.from(JSON.stringify(profil), "utf8").toString("base64"));
    const r = NextResponse.next({ request: { headers: h } });
    pending.forEach((c) => r.cookies.set(c.name, c.value, c.options));
    return r;
  };

  let profil: { id: string; nama: string; role: string; email?: string } | null = null;
  let aktif = false;
  let wajibGanti = false;
  if (uid) {
    let p = await ambilProfil(uid);
    if (!p) {
      const { data } = await supabase
        .from("profiles")
        .select("nama, role, aktif, wajib_ganti_sandi")
        .eq("id", uid)
        .single();
      if (data) {
        p = { nama: data.nama, role: data.role, aktif: !!data.aktif, wajib: !!data.wajib_ganti_sandi };
        await simpanProfil(uid, p);
      }
    }
    if (p) {
      profil = { id: uid, nama: p.nama, role: p.role, email: claimsData?.claims?.email as string | undefined };
      aktif = p.aktif;
      wajibGanti = p.wajib;
    }
  }

  if (uid && !aktif) {
    // Akun belum didaftarkan/diaktifkan admin: keluarkan sesi dan tampilkan pesan di halaman masuk.
    await supabase.auth.signOut();
    return path.startsWith("/dashboard") ? alihkan("/masuk?pesan=belum-aktif") : lanjut();
  }

  if (path.startsWith("/dashboard")) {
    if (!profil || !isRole(profil.role)) return alihkan("/masuk");
    if (wajibGanti && !path.startsWith("/dashboard/akun")) return alihkan("/dashboard/akun?pesan=ganti");
    const seg = path.split("/")[2];
    if (isRole(seg) && seg !== profil.role) return alihkan(roleHome[profil.role]);
    return lanjut(profil);
  }

  if (path === "/masuk" && uid) return alihkan("/dashboard");

  return lanjut();
}

export const config = { matcher: ["/dashboard/:path*", "/masuk"] };
