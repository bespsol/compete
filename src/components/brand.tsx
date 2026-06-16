import { Link } from '@tanstack/react-router'

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link to="/" className="brand no-underline" aria-label="COMPETE home">
      <span className="brand-mark" aria-hidden="true">
        <i className="brand-mark-red" />
        <i className="brand-mark-blue" />
      </span>
      <span className={inverse ? 'text-white' : 'text-ink'}>COMPETE</span>
    </Link>
  )
}
