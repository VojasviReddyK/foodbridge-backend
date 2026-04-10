const express = require('express')
const auth = require('../middleware/authMiddleware')
const role = require('../middleware/roleMiddleware')
const adminController = require('../controllers/adminController')

const router = express.Router()

router.use(auth, role('admin'))

router.get('/stats', adminController.stats)
router.get('/users', adminController.users)
router.put('/users/:id/suspend', adminController.suspendUser)
router.get('/donations', adminController.donations)
router.get('/activity-log', adminController.activityLog)

module.exports = router

