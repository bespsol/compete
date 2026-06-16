import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AuthLayout } from '../components/auth-layout'
import { api } from '../lib/api'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(event.currentTarget)
    const payload = {
      firstName: String(form.get('firstName')),
      lastName: String(form.get('lastName')),
      email: String(form.get('email')),
      phone: String(form.get('phone')) || undefined,
      role: String(form.get('role')),
    }
    try {
      const result = await api<{ verification: { code?: string } }>('/auth/register', {
        method: 'POST',
        auth: false,
        body: JSON.stringify(payload),
      })
      await navigate({
        to: '/verify',
        search: { email: payload.email, code: result.verification.code },
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create your account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Join COMPETE"
      title="START WITH YOUR ROLE."
      intro="Your first role sets up the right workspace. You can hold additional roles later."
    >
      <form onSubmit={submit} className="grid gap-4">
        {error && <div className="form-error">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label htmlFor="firstName">First name</label>
            <input id="firstName" name="firstName" required autoComplete="given-name" />
          </div>
          <div className="field">
            <label htmlFor="lastName">Last name</label>
            <input id="lastName" name="lastName" required autoComplete="family-name" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone number <span className="font-normal text-white/35">(optional)</span></label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" />
        </div>
        <div className="field">
          <label htmlFor="role">My primary role</label>
          <select id="role" name="role" defaultValue="coach">
            <option value="promoter">Promoter</option>
            <option value="coach">Coach</option>
            <option value="fighter">Fighter</option>
            <option value="judge">Judge or official</option>
            <option value="parent">Parent or guardian</option>
          </select>
        </div>
        <button className="button button-primary mt-2 w-full" disabled={loading}>
          {loading ? <LoaderCircle className="animate-spin" size={18} /> : <>Create account <ArrowRight size={18} /></>}
        </button>
        <p className="text-center text-xs text-white/45">
          Already registered? <Link to="/login" className="font-semibold text-gold">Log in</Link>
        </p>
      </form>
    </AuthLayout>
  )
}
