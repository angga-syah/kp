import Link from "next/link";

export const metadata = { title: "Halaman tidak ditemukan" };

export default function NotFound() {
  return (
    <main id="konten" className="wrap section">
      <h1 className="section__title">Halaman tidak ditemukan</h1>
      <p className="muted">Alamat yang Anda buka tidak ada atau sudah dipindahkan.</p>
      <p>
        <Link className="btn" href="/">
          Kembali ke beranda
        </Link>
      </p>
    </main>
  );
}
