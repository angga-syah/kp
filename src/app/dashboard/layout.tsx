import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { navFor } from "@/lib/nav";
import { roleLabel } from "@/lib/roles";
import { Crest } from "@/components/crest";
import { SideNav, SubNav } from "./nav-links";
import { signOut } from "./actions";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const p = await getProfile();
  if (!p) redirect("/masuk");
  const menu = navFor(p.role);

  return (
    <div className="shell">
      <aside className="side">
        <Link href="/" className="brand side__brand">
          <Crest size={36} />
          <span>
            <span className="brand__name">MA Al-Riyadhul Janah</span>
            <span className="brand__sub">Portal madrasah</span>
          </span>
        </Link>
        <SideNav groups={menu}>
          <div className="side__me">
            <span className="side__name">{p.nama}</span>
            <span className="side__role">{roleLabel[p.role]}</span>
            <form action={signOut}>
              <button className="btn btn--sm btn--ghost" type="submit">
                Keluar
              </button>
            </form>
          </div>
        </SideNav>
      </aside>
      <main id="konten" className="main">
        <SubNav groups={menu} />
        {children}
      </main>
    </div>
  );
}
