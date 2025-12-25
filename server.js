import http from 'node:http'
import fs from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DATA_DIR = join(__dirname, 'server-data')
const USERS_FILE = join(DATA_DIR, 'users.json')
const PORT = process.env.PORT || 4000

const ensureStorage = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, '[]', 'utf8')
  }
}

const readUsers = () => {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8')
    return raw ? JSON.parse(raw) : []
  } catch (error) {
    console.error('Failed to read users file', error)
    return []
  }
}

const writeUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8')
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

ensureStorage()

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
      const users = readUsers()
      const exists = users.find((user) => user.email === normalizedEmail)
      if (exists) {
        return send(res, 409, { message: 'Account already exists. Try signing in.' })
      }

      const newUser = {
        id: crypto.randomUUID(),
        fullName: fullName.trim(),
        email: normalizedEmail,
        headline: headline.trim(),
        passwordHash: hashPassword(password),
        profile: {
          workHistory: [],
          education: [],
          skills: [],
          interests: [],
        },
        createdAt: new Date().toISOString(),
      }

      writeUsers([...users, newUser])
      return send(res, 201, {
        message: 'Account created. Welcome to LINKEDIN.',
        profile: {
          id: newUser.id,
          fullName: newUser.fullName,
          email: newUser.email,
          headline: newUser.headline,
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
      const users = readUsers()
      const user = users.find((entry) => entry.email === normalizedEmail)
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
        profileData:
          user.profile || {
            workHistory: [],
            education: [],
            skills: [],
            interests: [],
          },
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
      const users = readUsers()
      const idx = users.findIndex((entry) => entry.email === normalizedEmail)
      if (idx === -1) {
        return send(res, 404, { message: 'User not found. Sign in again.' })
      }

      users[idx].profile = {
        workHistory,
        education,
        skills,
        interests,
        updatedAt: new Date().toISOString(),
      }
      writeUsers(users)

      return send(res, 200, { message: 'Profile updated successfully.' })
    } catch (error) {
      console.error('Update profile error', error)
      return send(res, 400, { message: 'Invalid profile payload.' })
    }
  }

  return send(res, 404, { message: 'Route not found.' })
})

server.listen(PORT, () => {
  console.log(`LINKEDIN auth backend listening on http://localhost:${PORT}`)
})
