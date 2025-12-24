const functions = require('firebase-functions')
const express = require('express')
const crypto = require('crypto')
const cors = require('cors')
const admin = require('firebase-admin')

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

const app = express()
app.use(cors({ origin: true }))
app.use(express.json())

const hashPassword = (value) =>
  crypto.createHash('sha256').update(value).digest('hex')

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', service: 'linkedin-auth' }),
)

app.post('/api/signup', async (req, res) => {
  const { fullName, email, password, headline = '' } = req.body || {}
  if (!fullName || !email || !password) {
    return res
      .status(400)
      .json({ message: 'Name, email, and password are required.' })
  }
  const normalizedEmail = email.trim().toLowerCase()

  const userRef = db.collection('users').doc(normalizedEmail)
  const existing = await userRef.get()
  if (existing.exists) {
    return res
      .status(409)
      .json({ message: 'Account already exists. Try signing in.' })
  }

  const user = {
    id: crypto.randomUUID(),
    fullName: fullName.trim(),
    email: normalizedEmail,
    headline: headline.trim(),
    passwordHash: hashPassword(password),
    profile: {},
    createdAt: new Date().toISOString(),
  }

  await userRef.set(user)

  return res.status(201).json({
    message: 'Account created. Welcome to LINKEDIN.',
    profile: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      headline: user.headline,
    },
  })
})

app.post('/api/signin', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' })
  }
  const normalizedEmail = email.trim().toLowerCase()
  const snap = await db.collection('users').doc(normalizedEmail).get()
  if (!snap.exists) {
    return res
      .status(401)
      .json({ message: 'Invalid credentials. Please try again.' })
  }
  const user = snap.data()

  if (!user || user.passwordHash !== hashPassword(password)) {
    return res
      .status(401)
      .json({ message: 'Invalid credentials. Please try again.' })
  }
  const sessionToken = crypto
    .createHash('sha256')
    .update(`${user.email}-${Date.now()}`)
    .digest('hex')
    .slice(0, 48)
  return res.json({
    message: 'Signed in. Redirecting you to LINKEDIN.',
    token: sessionToken,
    profile: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      headline: user.headline,
    },
  })
})

app.post('/api/update-profile', async (req, res) => {
  const { email, workHistory = [], education = [], skills = [], interests = [] } =
    req.body || {}
  if (!email) {
    return res
      .status(400)
      .json({ message: 'Email is required for profile updates.' })
  }
  const normalizedEmail = email.trim().toLowerCase()
  const userRef = db.collection('users').doc(normalizedEmail)
  const snap = await userRef.get()
  if (!snap.exists) {
    return res.status(404).json({ message: 'User not found. Sign in again.' })
  }
  await userRef.update({
    profile: {
      workHistory,
      education,
      skills,
      interests,
      updatedAt: new Date().toISOString(),
    },
  })
  return res.json({ message: 'Profile updated successfully.' })
})

exports.api = functions.https.onRequest(app)
