const express = require('express')
const { body } = require('express-validator')
const rateLimit = require('express-rate-limit')
const auth = require('../middleware/authMiddleware')
const authController = require('../controllers/authController')

const router = express.Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
})

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
})

router.post(
  '/register',
  authLimiter,
  [
    body('name').isString().isLength({ min: 2 }),
    body('email').isEmail(),
    body('password').isString().isLength({ min: 8 }),
    body('role').isIn(['donor', 'acceptor', 'volunteer', 'admin']),
    body('pincode').optional().isString().isLength({ min: 4, max: 10 }),
  ],
  authController.register,
)

router.post(
  '/login',
  authLimiter,
  [body('email').isEmail(), body('password').isString().notEmpty()],
  authController.login,
)

router.post('/logout', authController.logout)
router.get('/me', auth, authController.me)
router.put('/me', auth, authController.updateMe)

router.post(
  '/forgot-password',
  otpLimiter,
  [body('email').isEmail()],
  authController.forgotPassword,
)
router.post(
  '/verify-otp',
  otpLimiter,
  [body('email').isEmail(), body('otp').isString().isLength({ min: 6, max: 6 })],
  authController.verifyOtp,
)
router.post(
  '/reset-password',
  otpLimiter,
  [body('email').isEmail(), body('password').isString().isLength({ min: 8 })],
  authController.resetPassword,
)

module.exports = router

