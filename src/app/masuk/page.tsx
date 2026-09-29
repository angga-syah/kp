import Link from "next/link";
import { Crest, StarPattern } from "@/components/crest";
import { LoginForm } from "./login-form";

export const metadata = { title: "Masuk" };

export default async function Masuk({ searchParams }: PageProps<"/masuk">) {
  const sp = await searchParams;
  const pesan = Array.isArray(sp.pesan) ? sp.pesan[0] : sp.pesan;

  return (
    <div className="auth">
      <aside className="auth__panel">
        <StarPattern id="auth-star" />
        <Link href="/" className="brand auth__brand">
          <Crest size={56} />
          <span>
            <span className="brand__name">MA Al-Riyadhul Janah</span>
            <span className="brand__sub">Portal madrasah</span>
          </span>
        </Link>
        <p className="auth__tag">Akademik, bimbingan karier, dan alumni dalam satu akun.</p>
      </aside>

      <main id="konten" className="auth__main">
        <LoginForm pesan={pesan} />
      </main>
    </div>
  );
}
