export const RIASEC = [
  "realistik",
  "investigatif",
  "artistik",
  "sosial",
  "enterprising",
  "konvensional",
] as const;

export type Tipe = (typeof RIASEC)[number];

export const tipeInfo: Record<Tipe, { judul: string; ringkas: string; contoh: string }> = {
  realistik: {
    judul: "Realistik",
    ringkas: "Suka bekerja langsung dengan alat, mesin, alam, atau hal yang konkret.",
    contoh: "Teknik, pertanian, kelautan, olahraga, teknisi.",
  },
  investigatif: {
    judul: "Investigatif",
    ringkas: "Suka menganalisis, meneliti, dan memecahkan masalah.",
    contoh: "Sains, kedokteran, teknologi informasi, matematika, peneliti.",
  },
  artistik: {
    judul: "Artistik",
    ringkas: "Suka berkarya, berekspresi, dan bekerja dengan ide orisinal.",
    contoh: "Desain, seni, sastra, jurnalistik, media kreatif.",
  },
  sosial: {
    judul: "Sosial",
    ringkas: "Suka membantu, mengajar, dan bekerja bersama orang.",
    contoh: "Pendidikan, keperawatan, psikologi, dakwah, pekerjaan sosial.",
  },
  enterprising: {
    judul: "Enterprising",
    ringkas: "Suka memimpin, meyakinkan orang, dan mengambil inisiatif usaha.",
    contoh: "Manajemen, bisnis, hukum, pemasaran, kewirausahaan.",
  },
  konvensional: {
    judul: "Konvensional",
    ringkas: "Suka pekerjaan teratur, teliti, dan berbasis data atau prosedur.",
    contoh: "Akuntansi, administrasi, perbankan, perpajakan, kearsipan.",
  },
};
