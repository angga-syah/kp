import type { Metadata } from "next";
import { Fraunces, Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "MA Al-Riyadhul Janah — Portal Madrasah", template: "%s — MA Al-Riyadhul Janah" },
  description:
    "Portal akademik, bimbingan karier, dan tracer study alumni Madrasah Aliyah Al-Riyadhul Janah, Maja, Lebak.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a className="skip" href="#konten">
          Lewati ke konten
        </a>
        {children}
      </body>
    </html>
  );
}
