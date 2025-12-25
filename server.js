import http from 'node:http'
import crypto from 'node:crypto'
import mysql from 'mysql2/promise'
import 'dotenv/config'

const PORT = process.env.PORT || 4000
const DATABASE_URL = process.env.SINGLESTORE_URL

if (!DATABASE_URL) {
  throw new Error('Missing SINGLESTORE_URL in environment.')
}

const pool = mysql.createPool(DATABASE_URL)

const ensureSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) NOT NULL,
      email VARCHAR(255) NOT NULL,
      fullName VARCHAR(255) NOT NULL,
      headline VARCHAR(255) NOT NULL DEFAULT '',
      passwordHash CHAR(64) NOT NULL,
      profile JSON NULL,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NULL,
      PRIMARY KEY (email),
      UNIQUE KEY (id)
    )
  `)
}

const hashPassword = (value) =>
  crypto.createHash('sha256').update(value).digest('hex')

const send = (res, status, data = {}) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(data))
}

const parseBody = (req) =>
  new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 1e6) {
        req.connection.destroy()
        reject(new Error('Payload too large'))
      }
    })
    req.on('end', () => {
      if (!body) return resolve({})
      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(error)
      }
    })
  })

const parseProfile = (value) => {
  if (!value) {
    return { workHistory: [], education: [], skills: [], interests: [] }
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return { workHistory: [], education: [], skills: [], interests: [] }
    }
  }
  return value
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return send(res, 200, {})
  }

  if (req.url === '/api/health') {
    return send(res, 200, { status: 'ok', service: 'linkedin-auth' })
  }

  if (req.url === '/api/signup' && req.method === 'POST') {
    try {
      const { fullName, email, password, headline = '' } = await parseBody(req)
      if (!fullName || !email || !password) {
        return send(res, 400, { message: 'Name, email, and password are required.' })
      }

      const normalizedEmail = email.trim().toLowerCase()
      const [rows] = await pool.query(
        'SELECT email FROM users WHERE email = ? LIMIT 1',
        [normalizedEmail],
      )
      if (rows.length) {
        return send(res, 409, { message: 'Account already exists. Try signing in.' })
      }

      const now = new Date()
      const profile = {
        workHistory: [],
        education: [],
        skills: [],
        interests: [],
      }
      await pool.query(
        `INSERT INTO users (id, email, fullName, headline, passwordHash, profile, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ,
        [
          crypto.randomUUID(),
          normalizedEmail,
          fullName.trim(),
          headline.trim(),
          hashPassword(password),
          JSON.stringify(profile),
          now,
          now,
        ],
      )

      return send(res, 201, {
        message: 'Account created. Welcome to LINKEDIN.',
        profile: {
          fullName: fullName.trim(),
          email: normalizedEmail,
          headline: headline.trim(),
        },
      })
    } catch (error) {
      console.error('Signup error', error)
      return send(res, 400, { message: 'Invalid signup payload.' })
    }
  }

  if (req.url === '/api/signin' && req.method === 'POST') {
    try {
      const { email, password } = await parseBody(req)
      if (!email || !password) {
        return send(res, 400, { message: 'Email and password are required.' })
      }

      const normalizedEmail = email.trim().toLowerCase()
      const [rows] = await pool.query(
        'SELECT id, email, fullName, headline, passwordHash, profile FROM users WHERE email = ? LIMIT 1',
        [normalizedEmail],
      )
      if (!rows.length) {
        return send(res, 401, { message: 'Invalid credentials. Please try again.' })
      }

      const user = rows[0]
      if (!user || user.passwordHash !== hashPassword(password)) {
        return send(res, 401, { message: 'Invalid credentials. Please try again.' })
      }

      const sessionToken = crypto
        .createHash('sha256')
        .update(`${user.email}-${Date.now()}`)
        .digest('hex')
        .slice(0, 48)

      return send(res, 200, {
        message: 'Signed in. Redirecting you to LINKEDIN.',
        token: sessionToken,
        profile: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          headline: user.headline,
        },
        profileData: parseProfile(user.profile),
      })
    } catch (error) {
      console.error('Signin error', error)
      return send(res, 400, { message: 'Invalid signin payload.' })
    }
  }

  if (req.url === '/api/update-profile' && req.method === 'POST') {
    try {
      const { email, workHistory = [], education = [], skills = [], interests = [] } =
        await parseBody(req)
      if (!email) {
        return send(res, 400, { message: 'Email is required for profile updates.' })
      }

      const normalizedEmail = email.trim().toLowerCase()
      const profile = {
        workHistory,
        education,
        skills,
        interests,
        updatedAt: new Date().toISOString(),
      }

      const [rows] = await pool.query(
        'SELECT email FROM users WHERE email = ? LIMIT 1',
        [normalizedEmail],
      )
      if (!rows.length) {
        return send(res, 404, { message: 'User not found. Sign in again.' })
      }

      await pool.query(
        'UPDATE users SET profile = ?, updatedAt = ? WHERE email = ?',
        [JSON.stringify(profile), new Date(), normalizedEmail],
      )

      return send(res, 200, { message: 'Profile updated successfully.' })
    } catch (error) {
      console.error('Update profile error', error)
      return send(res, 400, { message: 'Invalid profile payload.' })
    }
  }

  if (req.url?.startsWith('/api/profile') && req.method === 'GET') {
    const url = new URL(req.url, `http://localhost:${PORT}`)
    const email = url.searchParams.get('email')
    if (!email) {
      return send(res, 400, { message: 'Email is required.' })
    }
    const normalizedEmail = email.trim().toLowerCase()
    try {
      const [rows] = await pool.query(
        'SELECT profile FROM users WHERE email = ? LIMIT 1',
        [normalizedEmail],
      )
      if (!rows.length) {
        return send(res, 404, { message: 'Profile not found.' })
      }
      return send(res, 200, { profileData: parseProfile(rows[0].profile) })
    } catch (error) {
      console.error('Profile read error', error)
      return send(res, 500, { message: 'Failed to read profile.' })
    }
  }

  return send(res, 404, { message: 'Route not found.' })
})

ensureSchema()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`LINKEDIN auth backend listening on http://localhost:${PORT}`)
    })
  })
  .catch((error) => {
    console.error('Failed to initialize database', error)
    process.exit(1)
  })
