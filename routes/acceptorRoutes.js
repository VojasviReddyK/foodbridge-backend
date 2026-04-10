const express = require('express')
const auth = require('../middleware/authMiddleware')
const role = require('../middleware/roleMiddleware')
const acceptorController = require('../controllers/acceptorController')

const router = express.Router()

router.use(auth, role('acceptor'))

router.get('/browse', acceptorController.browse)
router.post('/request/:donationId', acceptorController.requestFood)
router.get('/requests', acceptorController.getMyRequests)
router.get('/dashboard-stats', acceptorController.dashboardStats)
router.post('/rate/:volunteerId', acceptorController.rateVolunteer)

module.exports = router

