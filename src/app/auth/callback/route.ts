import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profil } = user
        ? await supabase.from("profiles").select("aktif").eq("id", user.id).single()
        : { data: null };
      if (!profil?.aktif) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/masuk?pesan=belum-aktif`);
      }
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }
  // Tanpa ?code: tautan reset kata sandi (alur implicit) membawa sesi di fragmen #access_token yang tidak terlihat server.
  // Browser membawa fragmen itu ikut pengalihan, lalu halaman /auth/pulih yang membacanya.
  return NextResponse.redirect(code ? `${origin}/auth/pulih?gagal=kode` : `${origin}/auth/pulih`);
}
