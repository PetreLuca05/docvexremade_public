// Every "back" on the site: an arrow and a label, no background, a faint
// border, and a light fill on hover. A link with `href`, else a button.
export default function BackButton({ href, onClick, disabled, children }) {
  const content = (
    <>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M10 3.5 5.5 8l4.5 4.5" />
      </svg>
      {children}
    </>
  );
  return href ? (
    <a className="btn back-button" href={href}>
      {content}
    </a>
  ) : (
    <button type="button" className="btn back-button" onClick={onClick} disabled={disabled}>
      {content}
    </button>
  );
}
