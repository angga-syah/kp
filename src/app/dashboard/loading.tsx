export default function Loading() {
  return (
    <div className="skeleton" role="status" aria-label="Memuat">
      <div className="skeleton__bar skeleton__bar--title" />
      <div className="skeleton__bar" />
      <div className="skeleton__bar" />
      <div className="skeleton__bar skeleton__bar--short" />
    </div>
  );
}
