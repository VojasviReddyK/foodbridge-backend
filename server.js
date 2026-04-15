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

// ✅ FIXED: allow both local + deployed frontend
const allowedOrigins = [
  'http://localhost:5173',
  'https://foodbridge-xa6z.vercel.app',
]

// SOCKET.IO CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
})

initSocket(io)
app.set('io', io)

// MIDDLEWARES
app.use(helmet())

// ✅ FIXED CORS
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      } else {
        return callback(new Error('CORS not allowed'))
      }
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

// ROUTES
app.get('/', (req, res) => {
  res.send('FOODBRIDGE API is running 🚀')
})

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.use('/api/public', publicRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/donor', donorRoutes)
app.use('/api/acceptor', acceptorRoutes)
app.use('/api/volunteer', volunteerRoutes)
app.use('/api/admin', adminRoutes)

// ERROR HANDLER
app.use((err, _req, res, _next) => {
  console.error(err.message)
  return res.status(500).json({ message: err.message || 'Server error' })
})

const port = process.env.PORT || 5000

connectDB()
  .then(() => {
    server.listen(port, () => {
      console.log(`Server running on port ${port}`)
    })
  })
  .catch((err) => {
    console.error('DB connection failed:', err.message)
    process.exit(1)
  })