"use client";

export function PrintButton({ label = "Cetak rapor", className = "btn btn--outline" }: { label?: string; className?: string }) {
  return (
    <button type="button" className={`${className} noprint`} onClick={() => window.print()}>
      {label}
    </button>
  );
}
