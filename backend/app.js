import express from 'express'
import cors from 'cors'
import session from 'express-session'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import authRouter    from './routes/auth.js'
import callingRouter from './routes/v1/calling.js'
import userRouter    from './routes/v1/users.js'
import { requireAuth } from './middleware/auth.js'

const __dirname    = dirname(fileURLToPath(import.meta.url))
const FRONTEND_DIR = join(__dirname, '..')

const app = express()

// ── 미들웨어 ───────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(session({
  secret: process.env.SESSION_SECRET || 'jesus-calling-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 }, // 8시간
}))

// ── /admin 접근 보호 (login.html, login.css 제외) ──────────
app.use('/admin', (req, res, next) => {
  const open = ['/login.html', '/login.css']
  if (open.includes(req.path)) return next()
  if (!req.session?.userId)   return res.redirect('/admin/login.html')
  next()
})

// ── 정적 파일 ──────────────────────────────────────────────
app.use(express.static(FRONTEND_DIR))

// ── API 라우터 ─────────────────────────────────────────────
app.use('/api/auth',       authRouter)
app.use('/api/v1/calling', callingRouter)         // GET은 공개, 쓰기는 내부에서 requireAuth
app.use('/api/v1/users',   requireAuth, userRouter)

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not Found' }))

export default app
