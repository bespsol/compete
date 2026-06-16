import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight, LoaderCircle, RotateCcw } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { AuthLayout } from '../components/auth-layout'
import { api, setSessionToken } from '../lib/api'

const searchSchema = z.object({
  email: z.string().default(''),
  code: z.string().optional(),
})

export const Route = createFileRoute('/verify')({
  validateSearch: searchSchema,
  component: VerifyPage,
})

function VerifyPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [code, setCode] = useState(search.code ?? '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resent, setResent] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await api<{ token: string }>('/auth/verify-otp', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email: search.email, code }),
      })
      setSessionToken(result.token)
      await navigate({ to: '/app' })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to verify the code.')
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    setError('')
    try {
      const result = await api<{ code?: string }>('/auth/request-otp', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email: search.email, purpose: 'login' }),
      })
      if (result.code) setCode(result.code)
      setResent(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to resend the code.')
    }
  }

  return (
    <AuthLayout
      eyebrow="Check your email"
      title="ENTER YOUR SIX-DIGIT CODE."
      intro={`We sent a single-use code to ${search.email || 'your email address'}. It expires after ten minutes.`}
    >
      <form onSubmit={submit} className="grid gap-5">
        {error && <div className="form-error">{error}</div>}
        {search.code && (
          <div className="rounded-lg border border-gold/30 bg-gold/10 p-3 text-xs text-gold">
            Local development code: <strong>{search.code}</strong>
          </div>
        )}
        {resent && <p className="text-xs text-white/55">A fresh code has been issued.</p>}
        <div className="field">
          <label htmlFor="code">Verification code</label>
          <input
            id="code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            autoComplete="one-time-code"
            className="text-center font-mono text-2xl tracking-[.5em]"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          />
        </div>
        <button className="button button-primary w-full" disabled={loading}>
          {loading ? <LoaderCircle className="animate-spin" size={18} /> : <>Verify and continue <ArrowRight size={18} /></>}
        </button>
        <button type="button" onClick={resend} className="mx-auto flex items-center gap-2 text-xs font-semibold text-white/50 hover:text-white">
          <RotateCcw size={14} /> Send another code
        </button>
      </form>
    </AuthLayout>
  )
}
