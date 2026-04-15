const express = require('express')
const auth = require('../middleware/authMiddleware')
const role = require('../middleware/roleMiddleware')
const volunteerController = require('../controllers/volunteerController')

const router = express.Router()

router.use(auth, role('volunteer'))

router.get('/assignments', volunteerController.getAssignments)
router.post('/verify-donor-otp', volunteerController.verifyDonorOtp)
router.post('/verify-acceptor-otp', volunteerController.verifyAcceptorOtp)
router.get('/dashboard-stats', volunteerController.dashboardStats)
router.post('/rate/:donorId', volunteerController.rateDonor)
router.post("/accept", acceptDonation)

module.exports = router

