import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Brand } from '../components/brand'
import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'COMPETE | Combat sports operations' },
      {
        name: 'description',
        content:
          'Run combat sports events, rosters, matchmaking, fight cards, weigh-ins, waivers and records in one secure platform.',
      },
      { property: 'og:title', content: 'COMPETE | One platform. Every corner.' },
      {
        property: 'og:description',
        content: 'The operations platform for promoters, gyms, coaches and fighters.',
      },
      { property: 'og:type', content: 'website' },
    ],
    links: [
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function PublicNav() {
  const [open, setOpen] = useState(false)
  return (
    <header className="public-nav">
      <div className="site-width flex h-20 items-center justify-between">
        <Brand inverse />
        <nav className="hidden items-center gap-8 lg:flex">
          <a href="/#platform" className="nav-link">Platform</a>
          <a href="/#workflow" className="nav-link">How it works</a>
          <a href="/#roles" className="nav-link">For your team</a>
          <Link to="/login" className="nav-link">Log in</Link>
          <Link to="/register" className="button button-light">Create account</Link>
        </nav>
        <button
          className="rounded-lg p-2 text-white lg:hidden"
          aria-label="Toggle navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav className="site-width flex flex-col gap-4 border-t border-white/10 py-5 lg:hidden">
          <a href="/#platform" className="nav-link" onClick={() => setOpen(false)}>Platform</a>
          <a href="/#workflow" className="nav-link" onClick={() => setOpen(false)}>How it works</a>
          <a href="/#roles" className="nav-link" onClick={() => setOpen(false)}>For your team</a>
          <Link to="/login" className="nav-link" onClick={() => setOpen(false)}>Log in</Link>
          <Link to="/register" className="button button-light text-center" onClick={() => setOpen(false)}>
            Create account
          </Link>
        </nav>
      )}
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-line bg-paper py-12">
      <div className="site-width grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Brand />
          <p className="mt-5 max-w-sm text-sm leading-6 text-muted">
            Clearer events. Better matches. Safer fighters. COMPETE connects every
            corner of combat sports operations.
          </p>
        </div>
        <div>
          <p className="eyebrow text-ink">Platform</p>
          <div className="mt-4 grid gap-2 text-sm text-muted">
            <span>Events and invitations</span>
            <span>Rosters and matchmaking</span>
            <span>Weigh-ins and waivers</span>
          </div>
        </div>
        <div>
          <p className="eyebrow text-ink">Access</p>
          <div className="mt-4 grid gap-2 text-sm text-muted">
            <Link to="/login">Log in</Link>
            <Link to="/register">Create account</Link>
            <span>Built for Netlify and Azure SQL</span>
          </div>
        </div>
      </div>
      <div className="site-width mt-10 border-t border-line pt-6 text-xs text-muted">
        © {new Date().getFullYear()} COMPETE. Combat sports operations, organised.
      </div>
    </footer>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname })
  const appShell = path.startsWith('/app')

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {!appShell && <PublicNav />}
        <main className={appShell ? 'min-h-screen' : undefined}>{children}</main>
        {!appShell && <Footer />}
        <Scripts />
      </body>
    </html>
  )
}
