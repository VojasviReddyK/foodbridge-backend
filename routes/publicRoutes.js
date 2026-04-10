const express = require('express')
const publicController = require('../controllers/publicController')

const router = express.Router()

router.get('/recent-donations', publicController.recentDonations)
router.get('/impact', publicController.impact)
router.post('/contact', publicController.contact)

module.exports = router

