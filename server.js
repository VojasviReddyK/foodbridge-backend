require('dotenv').config()
const express = require('express')
const http = require('http')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const cookieParser = require('cookie-parser')
const morgan = require('morgan')
const { Server } = require('socket.io')

const connectDB = require('./config/db')
const { initSocket } = require('./utils/socket')

const authRoutes = require('./routes/authRoutes')
const donorRoutes = require('./routes/donorRoutes')
const acceptorRoutes = require('./routes/acceptorRoutes')
const volunteerRoutes = require('./routes/volunteerRoutes')
const adminRoutes = require('./routes/adminRoutes')
const publicRoutes = require('./routes/publicRoutes')

const app = express()
const server = http.createServer(app)

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const DEV_LOCALHOST_ORIGIN = /^https?:\/\/localhost:\d{2,5}$/i

const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (origin === CLIENT_URL) return cb(null, true)
      if (process.env.NODE_ENV !== 'production' && DEV_LOCALHOST_ORIGIN.test(origin))
        return cb(null, true)
      return cb(new Error(`CORS blocked for origin: ${origin}`))
    },
    credentials: true,
  },
})
initSocket(io)
app.set('io', io)

app.use(helmet())
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (origin === CLIENT_URL) return cb(null, true)
      if (process.env.NODE_ENV !== 'production' && DEV_LOCALHOST_ORIGIN.test(origin))
        return cb(null, true)
      return cb(new Error(`CORS blocked for origin: ${origin}`))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(morgan('dev'))

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }),
)

// Note: auth endpoints define their own per-route rate limits.

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.use('/api/public', publicRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/donor', donorRoutes)
app.use('/api/acceptor', acceptorRoutes)
app.use('/api/volunteer', volunteerRoutes)
app.use('/api/admin', adminRoutes)

// basic error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err)
  return res.status(500).json({ message: 'Server error' })
})

const port = process.env.PORT || 5000

connectDB()
  .then(() => {
    server.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on port ${port}`)
    })
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('DB connection failed:', err.message)
    process.exit(1)
  })

  app.get("/", (req, res) => {
    res.send("FOODBRIDGE API is running 🚀");
  });