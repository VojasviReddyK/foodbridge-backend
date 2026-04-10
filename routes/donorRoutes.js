const express = require('express')
const multer = require('multer')
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const initCloudinary = require('../config/cloudinary')
const auth = require('../middleware/authMiddleware')
const role = require('../middleware/roleMiddleware')
const donorController = require('../controllers/donorController')

const router = express.Router()
const cloudinary = initCloudinary()

const hasCloudinary =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET

const storage = hasCloudinary
  ? new CloudinaryStorage({
      cloudinary,
      params: {
        folder: 'foodbridge/donations',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      },
    })
  : multer.memoryStorage()

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|jpg)$/i.test(file.mimetype)
    cb(ok ? null : new Error('Only image uploads are allowed'), ok)
  },
})

router.use(auth, role('donor'))

router.post('/donations', upload.array('images', 6), donorController.createDonation)
router.get('/donations', donorController.getMyDonations)
router.put('/donations/:id', donorController.updateDonation)
router.delete('/donations/:id', donorController.deleteDonation)
router.get('/dashboard-stats', donorController.dashboardStats)
router.post('/rate/:volunteerId', donorController.rateVolunteer)

module.exports = router

