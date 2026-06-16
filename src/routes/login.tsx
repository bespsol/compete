import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AuthLayout } from '../components/auth-layout'
import { api } from '../lib/api'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await api<{ code?: string }>('/auth/request-otp', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email, purpose: 'login' }),
      })
      await navigate({
        to: '/verify',
        search: { email, code: result.code },
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to send the code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="SIGN IN WITHOUT A PASSWORD."
      intro="Enter your email and we will send a six-digit, single-use verification code."
    >
      <form onSubmit={submit} className="grid gap-5">
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@yourgym.co.uk"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <button className="button button-primary w-full" disabled={loading}>
          {loading ? <LoaderCircle className="animate-spin" size={18} /> : <>Send my code <ArrowRight size={18} /></>}
        </button>
        <p className="text-center text-xs text-white/45">
          New to COMPETE?{' '}
          <Link to="/register" className="font-semibold text-gold">Create an account</Link>
        </p>
      </form>
    </AuthLayout>
  )
}
