"use client";

import { useId, useState } from "react";

/** Kolom kata sandi dengan tombol lihat/sembunyikan dan peringatan Caps Lock. */
export function PasswordInput({
  name,
  autoComplete,
  minLength,
  required = true,
}: {
  name: string;
  autoComplete: string;
  minLength?: number;
  required?: boolean;
}) {
  const [lihat, setLihat] = useState(false);
  const [caps, setCaps] = useState(false);
  const id = useId();
  const cek = (e: React.KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState?.("CapsLock") ?? false);

  return (
    <span className="pw">
      <span className="pw__row">
        <input
          name={name}
          type={lihat ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby={caps ? `${id}-caps` : undefined}
          onKeyDown={cek}
          onKeyUp={cek}
          onBlur={() => setCaps(false)}
        />
        <button
          type="button"
          className="pw__toggle"
          aria-pressed={lihat}
          aria-label={lihat ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          onClick={() => setLihat((v) => !v)}
        >
          {lihat ? "Sembunyikan" : "Lihat"}
        </button>
      </span>
      {caps && (
        <span id={`${id}-caps`} className="pw__caps" role="status">
          Caps Lock menyala
        </span>
      )}
    </span>
  );
}
