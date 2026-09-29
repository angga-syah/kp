"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

type Aksi = (formData: FormData) => void | Promise<void>;

export function SubmitButton({
  children,
  className = "btn",
  pendingText = "Menyimpan…",
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending} name={name} value={value}>
      {pending ? pendingText : children}
    </button>
  );
}

/** Konfirmasi dua langkah di tempat (tanpa dialog bawaan browser). Mendukung formAction untuk formulir massal. */
export function ConfirmButton({
  children,
  message,
  className,
  formAction,
  name,
  value,
  tanya = "Yakin?",
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  formAction?: Aksi;
  name?: string;
  value?: string;
  tanya?: string;
}) {
  const [aktif, setAktif] = useState(false);
  if (!aktif) {
    return (
      <button type="button" className={className} onClick={() => setAktif(true)}>
        {children}
      </button>
    );
  }
  return (
    <span className="confirm" role="group" aria-label={message}>
      <span className="confirm__msg">{tanya}</span>
      <button type="submit" className="linkbtn linkbtn--danger" formAction={formAction} name={name} value={value}>
        Ya, hapus
      </button>
      <button type="button" className="linkbtn linkbtn--edit" autoFocus onClick={() => setAktif(false)}>
        Batal
      </button>
    </span>
  );
}
