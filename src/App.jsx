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
  const [view, setView] = useState('auth')
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState(starterForm)
  const [status, setStatus] = useState({ type: 'idle', message: '' })
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  const [workHistory, setWorkHistory] = useState([
    { company: '', title: '', start: '', end: '', current: false },
  ])
  const [education, setEducation] = useState([
    { school: '', degree: 'Bachelors', field: '' },
  ])
  const [skills, setSkills] = useState([])
  const [interests, setInterests] = useState([])
  const [skillInput, setSkillInput] = useState('')
  const [interestInput, setInterestInput] = useState('')
  const [profileStatus, setProfileStatus] = useState({
    type: 'idle',
    message: 'Complete your profile to stand out.',
  })

  const formTitle =
    view === 'auth'
      ? mode === 'signin'
        ? 'Welcome back'
        : 'Join LINKEDIN'
      : 'Profile Setup'
  const ctaLabel = mode === 'signin' ? 'Sign in' : 'Create account'

  const heroHeadline = useMemo(
    () => {
      if (view === 'profile') {
        return 'Ship your profile so recruiters find you first.'
      }
      return mode === 'signin'
        ? 'Pick up the conversation with recruiters and peers.'
        : 'Join a community built for career moves.'
    },
    [mode, view],
  )

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const switchMode = (next) => {
    setMode(next)
    setForm(starterForm)
    setStatus({ type: 'idle', message: '' })
  }

  const pushPath = (path) => {
    window.history.pushState({}, '', path)
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

      if (mode === 'signup') {
        setStatus({
          type: 'success',
          message: data?.message || 'Account created. Redirecting to sign in...',
        })
        setMode('signin')
        setForm({ ...starterForm, email: form.email })
        pushPath('/')
        return
      }

      setUserEmail(data?.profile?.email || form.email)
      setStatus({
        type: 'success',
        message: data?.message || 'You are in. Redirecting...',
      })
      setView('profile')
      setProfileStatus({
        type: 'idle',
        message: 'Complete your profile to stand out.',
      })
      pushPath('/profile-setup')
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

  const updateWorkItem = (index, key, value) => {
    setWorkHistory((current) =>
      current.map((item, idx) => {
        if (idx !== index) return item
        if (key === 'current' && value) {
          return { ...item, current: value, end: '' }
        }
        return { ...item, [key]: value }
      }),
    )
  }

  const addWorkRow = () => {
    setWorkHistory((current) => [
      ...current,
      { company: '', title: '', start: '', end: '', current: false },
    ])
  }

  const removeWorkRow = (index) => {
    setWorkHistory((current) =>
      current.filter((_, idx) => idx !== index).length
        ? current.filter((_, idx) => idx !== index)
        : [{ company: '', title: '', start: '', end: '', current: false }],
    )
  }

  const updateEduItem = (index, key, value) => {
    setEducation((current) =>
      current.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)),
    )
  }

  const addEduRow = () => {
    setEducation((current) => [...current, { school: '', degree: 'Bachelors', field: '' }])
  }

  const removeEduRow = (index) => {
    setEducation((current) =>
      current.filter((_, idx) => idx !== index).length
        ? current.filter((_, idx) => idx !== index)
        : [{ school: '', degree: 'Bachelors', field: '' }],
    )
  }

  const addTag = (value, list, setList, setInput) => {
    const trimmed = value.trim()
    if (!trimmed) return
    if (list.includes(trimmed)) {
      setInput('')
      return
    }
    setList([...list, trimmed])
    setInput('')
  }

  const removeTag = (value, setList) => {
    setList((current) => current.filter((item) => item !== value))
  }

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    if (!userEmail) {
      setProfileStatus({
        type: 'error',
        message: 'Missing signed-in user. Please sign in again.',
      })
      setView('auth')
      setMode('signin')
      pushPath('/')
      return
    }
    setProfileStatus({ type: 'pending', message: 'Saving your profile...' })

    const payload = {
      email: userEmail,
      workHistory,
      education,
      skills,
      interests,
    }

    try {
      const response = await fetch(`${API_BASE}/api/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.message || 'Unable to save profile.')
      }
      setProfileStatus({
        type: 'success',
        message: data?.message || 'Profile saved. Welcome to LINKEDIN.',
      })
    } catch (error) {
      setProfileStatus({
        type: 'error',
        message: error.message || 'Unable to save profile.',
      })
    }
  }

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
          {view === 'auth' ? (
            <>
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
            </>
          ) : (
            <div className="panel-body profile">
              <div className="panel-title">Profile setup</div>
              <p className="subtext">
                Tell LINKEDIN how you work, learn, and collaborate. Save to finish onboarding.
              </p>

              <form className="form" onSubmit={handleProfileSubmit}>
                <section className="section">
                  <div className="section-header">
                    <div>
                      <div className="section-title">Work history</div>
                      <p className="microcopy">Add companies where you made impact.</p>
                    </div>
                    <button type="button" className="chip ghost" onClick={addWorkRow}>
                      + Add role
                    </button>
                  </div>
                  <div className="section-grid">
                    {workHistory.map((item, idx) => (
                      <div key={`work-${idx}`} className="card-block">
                        <div className="row two">
                          <label className="field">
                            <span>Company</span>
                            <input
                              type="text"
                              placeholder="LINKEDIN"
                              value={item.company}
                              onChange={(e) => updateWorkItem(idx, 'company', e.target.value)}
                            />
                          </label>
                          <label className="field">
                            <span>Title</span>
                            <input
                              type="text"
                              placeholder="Product Lead"
                              value={item.title}
                              onChange={(e) => updateWorkItem(idx, 'title', e.target.value)}
                            />
                          </label>
                        </div>
                        <div className="row three">
                          <label className="field">
                            <span>Start</span>
                            <input
                              type="month"
                              value={item.start}
                              onChange={(e) => updateWorkItem(idx, 'start', e.target.value)}
                            />
                          </label>
                          <label className="field">
                            <span>End</span>
                            <input
                              type="month"
                              disabled={item.current}
                              value={item.end}
                              onChange={(e) => updateWorkItem(idx, 'end', e.target.value)}
                            />
                          </label>
                          <label className="field checkbox-row">
                            <input
                              type="checkbox"
                              checked={item.current}
                              onChange={(e) => updateWorkItem(idx, 'current', e.target.checked)}
                            />
                            <span>Currently work here</span>
                          </label>
                        </div>
                        <div className="row end">
                          <button
                            type="button"
                            className="chip ghost warn"
                            onClick={() => removeWorkRow(idx)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="section">
                  <div className="section-header">
                    <div>
                      <div className="section-title">Education</div>
                      <p className="microcopy">Showcase how you learned.</p>
                    </div>
                    <button type="button" className="chip ghost" onClick={addEduRow}>
                      + Add education
                    </button>
                  </div>
                  <div className="section-grid">
                    {education.map((item, idx) => (
                      <div key={`edu-${idx}`} className="card-block">
                        <div className="row two">
                          <label className="field">
                            <span>School / University</span>
                            <input
                              type="text"
                              placeholder="Stanford University"
                              value={item.school}
                              onChange={(e) => updateEduItem(idx, 'school', e.target.value)}
                            />
                          </label>
                          <label className="field">
                            <span>Degree</span>
                            <select
                              value={item.degree}
                              onChange={(e) => updateEduItem(idx, 'degree', e.target.value)}
                            >
                              <option value="Bachelors">Bachelor&apos;s</option>
                              <option value="Masters">Master&apos;s</option>
                              <option value="PhD">PhD</option>
                              <option value="Diploma">Diploma</option>
                              <option value="Certificate">Certificate</option>
                            </select>
                          </label>
                        </div>
                        <div className="row two">
                          <label className="field">
                            <span>Field of study</span>
                            <input
                              type="text"
                              placeholder="Computer Science"
                              value={item.field}
                              onChange={(e) => updateEduItem(idx, 'field', e.target.value)}
                            />
                          </label>
                        </div>
                        <div className="row end">
                          <button
                            type="button"
                            className="chip ghost warn"
                            onClick={() => removeEduRow(idx)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="section two-col">
                  <div>
                    <div className="section-header">
                      <div>
                        <div className="section-title">Skills</div>
                        <p className="microcopy">Add tags, press Enter to confirm.</p>
                      </div>
                    </div>
                    <div className="chip-input">
                      {skills.map((item) => (
                        <span key={item} className="chip">
                          {item}
                          <button type="button" onClick={() => removeTag(item, setSkills)}>
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        placeholder="React, Product Strategy, Python"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addTag(skillInput, skills, setSkills, setSkillInput)
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="section-header">
                      <div>
                        <div className="section-title">Interests</div>
                        <p className="microcopy">What keeps you curious.</p>
                      </div>
                    </div>
                    <div className="chip-input">
                      {interests.map((item) => (
                        <span key={item} className="chip">
                          {item}
                          <button type="button" onClick={() => removeTag(item, setInterests)}>
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        placeholder="Open Source, AI, Remote Work"
                        value={interestInput}
                        onChange={(e) => setInterestInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addTag(interestInput, interests, setInterests, setInterestInput)
                          }
                        }}
                      />
                    </div>
                  </div>
                </section>

                <div className="actions end">
                  <button className="cta" type="submit">
                    Save profile
                  </button>
                </div>

                <div
                  className={`status ${profileStatus.type !== 'idle' ? profileStatus.type : ''}`}
                >
                  {profileStatus.message}
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
