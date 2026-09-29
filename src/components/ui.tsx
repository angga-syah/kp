export function PageHead({ title, note, actions }: { title: string; note?: string; actions?: React.ReactNode }) {
  return (
    <header className="pagehead">
      <div className="pagehead__text">
        <h1>{title}</h1>
        {note && <p>{note}</p>}
      </div>
      {actions && <div className="pagehead__actions">{actions}</div>}
    </header>
  );
}

export function Notice({ error, ok, info }: { error?: string; ok?: boolean; info?: string }) {
  if (info) {
    return (
      <p className="notice" role="status">
        {info}
      </p>
    );
  }
  if (error) {
    return (
      <p className="notice notice--error" role="alert">
        {error}
      </p>
    );
  }
  if (ok) {
    return (
      <p className="notice" role="status">
        Tersimpan.
      </p>
    );
  }
  return null;
}

export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
