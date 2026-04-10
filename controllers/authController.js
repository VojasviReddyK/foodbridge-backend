const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { validationResult } = require('express-validator')
const OTP = require('../models/OTP')
const User = require('../models/User')
const generateOTP = require('../utils/generateOTP')
const {
  sendEmail,
  passwordResetOtpTemplate,
} = require('../utils/sendEmail')

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  )
}

function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

exports.register = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const {
    name,
    email,
    password,
    role,
    phone,
    address,
    city,
    pincode,
    location,
    organizationName,
    vehicleType,
  } = req.body

  const existing = await User.findOne({ email })
  if (existing) return res.status(409).json({ message: 'Email already registered' })

  const hashed = await bcrypt.hash(password, 12)
  const loc = location && typeof location === 'object' ? location : null

  const user = await User.create({
    name,
    email,
    password: hashed,
    role,
    phone,
    address,
    city,
    pincode,
    location: loc || undefined,
    organizationName,
    vehicleType,
    isVerified: true,
  })

  return res.status(201).json({
    message: 'Registered',
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
  })
}

exports.login = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const { email, password } = req.body
  const user = await User.findOne({ email })
  if (!user) return res.status(401).json({ message: 'Invalid credentials' })
  if (user.suspended) return res.status(403).json({ message: 'Account suspended' })
  if (!user.password) return res.status(401).json({ message: 'Invalid credentials' })

  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' })
  if (!user.role) return res.status(403).json({ message: 'Role missing' })

  const token = signToken(user)
  setAuthCookie(res, token)

  return res.json({
    token,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
  })
}

exports.logout = async (_req, res) => {
  res.clearCookie('token')
  return res.json({ message: 'Logged out' })
}

exports.me = async (req, res) => {
  return res.json({ user: req.user })
}

exports.updateMe = async (req, res) => {
  const allow = [
    'name',
    'phone',
    'address',
    'city',
    'pincode',
    'organizationName',
    'vehicleType',
  ]
  const patch = {}
  for (const k of allow) if (req.body[k] !== undefined) patch[k] = req.body[k]

  const user = await User.findByIdAndUpdate(req.user._id, patch, { new: true }).select('-password')
  return res.json({ user })
}

exports.forgotPassword = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const { email } = req.body
  const user = await User.findOne({ email })
  if (!user) return res.json({ message: 'If the email exists, OTP was sent.' })

  const otp = generateOTP()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await OTP.findOneAndUpdate(
    { email },
    { email, otp, expiresAt },
    { upsert: true, new: true },
  )

  await sendEmail({
    to: email,
    subject: 'Your FoodBridge Password Reset OTP',
    html: passwordResetOtpTemplate({ otp }),
  })

  return res.json({ message: 'OTP sent' })
}

exports.verifyOtp = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const { email, otp } = req.body
  const record = await OTP.findOne({ email, otp })
  if (!record) return res.status(400).json({ message: 'Invalid OTP' })
  if (record.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' })

  return res.json({ message: 'OTP verified' })
}

exports.resetPassword = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const { email, password } = req.body
  const record = await OTP.findOne({ email })
  if (!record) return res.status(400).json({ message: 'OTP not verified' })
  if (record.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' })

  const hashed = await bcrypt.hash(password, 12)
  await User.updateOne({ email }, { password: hashed })
  await OTP.deleteMany({ email })

  return res.json({ message: 'Password updated' })
}

exports._signToken = signToken
exports._setAuthCookie = setAuthCookie

