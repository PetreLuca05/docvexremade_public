// The site's main action button (Continue, Create account, Sign in, Save,
// Get started, Choose a plan…): square and gold, or outlined with
// `outline`; on hover it keeps its colours, only a touch deeper. A link with
// `href`, else a submit button unless `type` says otherwise; `small` for
// the header.
export default function ContinueButton({
  href,
  type = 'submit',
  onClick,
  disabled,
  outline = false,
  small = false,
  pressed,
  children,
}) {
  const className = [
    'btn',
    'continue-button',
    outline ? 'is-quiet' : 'is-gold',
    small && 'is-small',
  ]
    .filter(Boolean)
    .join(' ');
  return href ? (
    <a className={className} href={href} onClick={onClick}>
      {children}
    </a>
  ) : (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
    >
      {children}
    </button>
  );
}
