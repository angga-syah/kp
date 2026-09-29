import Image from "next/image";

export function Crest({ size = 40 }: { size?: number }) {
  return (
    <Image
      className="crest"
      src="/logo.png"
      alt="Logo Yayasan Pendidikan Islam Al-Riyadhul Janah"
      width={Math.round(size * 0.963)}
      height={size}
      priority
    />
  );
}

export function StarPattern({ id }: { id: string }) {
  return (
    <svg className="pattern" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} width="48" height="48" patternUnits="userSpaceOnUse">
          <rect x="10" y="10" width="28" height="28" />
          <rect x="10" y="10" width="28" height="28" transform="rotate(45 24 24)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
