"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cariAktif, type NavGroup } from "@/lib/nav";

export function SideNav({ groups, children }: { groups: NavGroup[]; children: React.ReactNode }) {
  const path = usePathname();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === path;
  const { group: aktif } = cariAktif(groups, path);

  return (
    <>
      <button
        type="button"
        className="btn btn--sm btn--ghost side__toggle"
        aria-expanded={open}
        aria-controls="side-panel"
        onClick={() => setOpenFor(open ? null : path)}
      >
        {open ? "Tutup" : "Menu"}
      </button>
      <div id="side-panel" className="side__panel" data-open={open}>
        <nav className="side__nav" aria-label="Menu utama">
          <ul>
            {groups.map((g) => (
              <li key={g.label}>
                <Link href={g.items[0].href} aria-current={aktif === g ? "page" : undefined} className="side__link">
                  {g.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {children}
      </div>
    </>
  );
}

/** Tab halaman-halaman di dalam bagian yang sedang dibuka (hanya bila bagian itu berisi lebih dari satu halaman). */
export function SubNav({ groups }: { groups: NavGroup[] }) {
  const path = usePathname();
  const { group, href } = cariAktif(groups, path);
  const ref = useRef<HTMLElement>(null);
  // di layar sempit tab bisa tergulir keluar; pastikan tab aktif terlihat
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [path]);
  if (!group || group.items.length < 2) return null;
  return (
    <nav ref={ref} className="tabs subnav" aria-label={group.label}>
      {group.items.map((it) => (
        <Link key={it.href} href={it.href} className="tabs__tab" aria-current={href === it.href ? "page" : undefined}>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
