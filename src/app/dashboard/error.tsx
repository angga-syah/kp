"use client";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="result" role="alert">
      <h1 className="h2">Halaman tidak dapat dimuat</h1>
      <p className="muted">Terjadi gangguan saat mengambil data. Coba lagi; jika berulang, hubungi admin madrasah.</p>
      <p>
        <button className="btn" onClick={reset}>
          Coba lagi
        </button>
      </p>
    </div>
  );
}
