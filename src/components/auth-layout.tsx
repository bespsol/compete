import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Brand } from './brand'

export function AuthLayout({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string
  title: string
  intro: string
  children: React.ReactNode
}) {
  return (
    <div className="auth-page">
      <div className="auth-image">
        <img src="/assets/compete-hero.png" alt="" />
        <div className="absolute bottom-12 left-12 z-10 max-w-md text-white">
          <p className="eyebrow text-gold">Built for the whole team</p>
          <p className="heading mt-3 text-4xl leading-[.95]">
            EVERY FIGHT STARTS WITH BETTER INFORMATION.
          </p>
        </div>
      </div>
      <div className="auth-panel">
        <div className="absolute right-8 top-7">
          <Brand inverse />
        </div>
        <div className="auth-card">
          <Link to="/" className="mb-10 inline-flex items-center gap-2 text-xs font-semibold text-white/50 hover:text-white">
            <ArrowLeft size={15} /> Back to the site
          </Link>
          <p className="eyebrow text-gold">{eyebrow}</p>
          <h1 className="heading mt-3 text-5xl">{title}</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/55">{intro}</p>
          <div className="mt-9">{children}</div>
        </div>
      </div>
    </div>
  )
}
