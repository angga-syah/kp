"use client";

import { startTransition, useActionState, useState } from "react";
import { resetSandiUser } from "@/app/dashboard/actions";
import type { ResetState } from "@/lib/types";

/**
 * Reset kata sandi satu akun: konfirmasi dua langkah, lalu kata sandi baru tampil sekali dengan tombol salin.
 * Sengaja tanpa <form>: komponen ini berada di dalam formulir tabel pengguna, dan form bersarang ditolak React/HTML.
 */
export function ResetSandi({ id, nama }: { id: string; nama: string }) {
  const [state, action, pending] = useActionState(resetSandiUser, {} as ResetState);
  const [tanya, setTanya] = useState(false);
  const [tersalin, setTersalin] = useState(false);

  if (state.password) {
    return (
      <span className="reveal" role="status">
        <span className="muted">Sandi baru {nama}:</span> <code>{state.password}</code>{" "}
        <button
          type="button"
          className="linkbtn linkbtn--edit"
          onClick={() => {
            navigator.clipboard?.writeText(state.password ?? "");
            setTersalin(true);
          }}
        >
          {tersalin ? "Tersalin" : "Salin"}
        </button>
      </span>
    );
  }

  if (!tanya) {
    return (
      <button type="button" className="linkbtn linkbtn--edit" onClick={() => setTanya(true)}>
        Reset sandi
      </button>
    );
  }

  return (
    <span className="confirm" role="group" aria-label={`Reset kata sandi ${nama}`}>
      <span className="confirm__msg">Reset sandi?</span>
      <button
        type="button"
        className="linkbtn linkbtn--danger"
        disabled={pending}
        onClick={() => {
          const fd = new FormData();
          fd.set("id", id);
          startTransition(() => action(fd));
        }}
      >
        {pending ? "Memproses…" : "Ya, reset"}
      </button>
      <button type="button" className="linkbtn linkbtn--edit" autoFocus onClick={() => setTanya(false)}>
        Batal
      </button>
      {state.error && <span className="form__error">{state.error}</span>}
    </span>
  );
}
