import Link from "next/link";

function jendela(page: number, pages: number): (number | "…")[] {
  const set = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const urut = [...set].sort((a, b) => a - b);
  const hasil: (number | "…")[] = [];
  urut.forEach((n, i) => {
    if (i > 0 && n - urut[i - 1] > 1) hasil.push("…");
    hasil.push(n);
  });
  return hasil;
}

export function Pager({
  page,
  pages,
  total,
  per,
  hrefFor,
}: {
  page: number;
  pages: number;
  total: number;
  per: number;
  hrefFor: (p: number) => string;
}) {
  if (total === 0) return null;
  const dari = (page - 1) * per + 1;
  const sampai = Math.min(page * per, total);
  return (
    <nav className="pager" aria-label="Halaman">
      <span className="muted num-cell">
        {dari}–{sampai} dari {total}
      </span>
      {pages > 1 && (
        <ul className="pager__list">
          <li>
            {page > 1 ? (
              <Link className="pager__btn" href={hrefFor(page - 1)} aria-label="Halaman sebelumnya">
                ‹
              </Link>
            ) : (
              <span className="pager__btn pager__btn--off" aria-hidden="true">
                ‹
              </span>
            )}
          </li>
          {jendela(page, pages).map((n, i) => (
            <li key={`${n}-${i}`}>
              {n === "…" ? (
                <span className="pager__gap">…</span>
              ) : (
                <Link
                  className={`pager__btn${n === page ? " pager__btn--on" : ""}`}
                  href={hrefFor(n)}
                  aria-current={n === page ? "page" : undefined}
                  aria-label={`Halaman ${n}`}
                >
                  {n}
                </Link>
              )}
            </li>
          ))}
          <li>
            {page < pages ? (
              <Link className="pager__btn" href={hrefFor(page + 1)} aria-label="Halaman berikutnya">
                ›
              </Link>
            ) : (
              <span className="pager__btn pager__btn--off" aria-hidden="true">
                ›
              </span>
            )}
          </li>
        </ul>
      )}
    </nav>
  );
}
