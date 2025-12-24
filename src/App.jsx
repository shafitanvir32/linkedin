import { useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

const starterForm = {
  fullName: '',
  email: '',
  password: '',
  headline: '',
}

const highlights = [
  'Tailored feed to showcase your professional story.',
  'Chat-ready messaging that stays in sync across devices.',
  'Secure auth with instant feedback for new members.',
]

function App() {
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState(starterForm)
  const [status, setStatus] = useState({ type: 'idle', message: '' })
  const [loading, setLoading] = useState(false)

  const formTitle = mode === 'signin' ? 'Welcome back' : 'Join LINKEDIN'
  const ctaLabel = mode === 'signin' ? 'Sign in' : 'Create account'

  const heroHeadline = useMemo(
    () =>
      mode === 'signin'
        ? 'Pick up the conversation with recruiters and peers.'
        : 'Join a community built for career moves.',
    [mode],
  )

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const switchMode = (next) => {
    setMode(next)
    setForm(starterForm)
    setStatus({ type: 'idle', message: '' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setStatus({ type: 'pending', message: 'Contacting LINKEDIN secure API...' })

    const endpoint = mode === 'signin' ? '/api/signin' : '/api/signup'
    const payload =
      mode === 'signin'
        ? {
            email: form.email.trim(),
            password: form.password,
          }
        : {
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            password: form.password,
            headline: form.headline.trim(),
          }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data?.message || 'Unable to process your request.')
      }

      setStatus({
        type: 'success',
        message: data?.message || 'You are in. Redirecting...',
      })
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Something went wrong. Try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const disabled =
    loading ||
    (mode === 'signin'
      ? !form.email.trim() || !form.password
      : !form.fullName.trim() || !form.email.trim() || !form.password)

  return (
    <div className="page">
      <div className="halo" />
      <div className="grid-accent" />
      <div className="frame">
        <aside className="brand-panel">
          <div className="wordmark">
            <div className="mark">in</div>
            <span className="brand">LINKEDIN</span>
          </div>
          <h1>{heroHeadline}</h1>
          <p className="lede">
            Authenticate into a refreshed LINKEDIN experience with a crisp
            visual design and fast, modern security defaults.
          </p>
          <div className="highlight-list">
            {highlights.map((item) => (
              <div key={item} className="highlight">
                <span className="dot" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="footnote">
            Built for demos — pair this UI with the included Node backend.
          </div>
        </aside>

        <main className="panel">
          <div className="panel-header">
            <div className="pill">
              <button
                type="button"
                className={mode === 'signin' ? 'active' : ''}
                onClick={() => switchMode('signin')}
              >
                Sign in
              </button>
              <button
                type="button"
                className={mode === 'signup' ? 'active' : ''}
                onClick={() => switchMode('signup')}
              >
                Sign up
              </button>
            </div>
            <span className="badge">Secure</span>
          </div>

          <div className="panel-body">
            <div className="panel-title">{formTitle}</div>
            <p className="subtext">
              Use your work email to sync with recruiters, hiring teams, and the
              people you already know.
            </p>

            <form onSubmit={handleSubmit} className="form">
              {mode === 'signup' && (
                <label className="field">
                  <span>Full name</span>
                  <input
                    name="fullName"
                    type="text"
                    placeholder="Ari Steele"
                    value={form.fullName}
                    onChange={updateField('fullName')}
                  />
                </label>
              )}

              <label className="field">
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={updateField('email')}
                />
              </label>

              {mode === 'signup' && (
                <label className="field">
                  <span>Headline</span>
                  <input
                    name="headline"
                    type="text"
                    placeholder="Product Designer @ LINKEDIN"
                    value={form.headline}
                    onChange={updateField('headline')}
                  />
                </label>
              )}

              <label className="field">
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={updateField('password')}
                />
              </label>

              <div className="actions">
                <label className="remember">
                  <input type="checkbox" defaultChecked />
                  <span>Stay signed in on this device</span>
                </label>
                <a href="#" className="link">
                  Forgot password?
                </a>
              </div>

              <button className="cta" type="submit" disabled={disabled}>
                {loading ? 'Verifying…' : ctaLabel}
              </button>
            </form>

            <div
              className={`status ${status.type !== 'idle' ? status.type : ''}`}
            >
              {status.type === 'pending' && status.message}
              {status.type === 'success' && status.message}
              {status.type === 'error' && status.message}
              {status.type === 'idle' && (
                <>
                  Backend target: <code>{API_BASE}</code>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
