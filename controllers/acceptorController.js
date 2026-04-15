const Donation = require('../models/Donation')
const FoodRequest = require('../models/FoodRequest')
const Rating = require('../models/Rating')
const User = require('../models/User')
const generateOTP = require('../utils/generateOTP')
const {
  sendEmail,
  acceptorOtpTemplate,
  volunteerAssignmentTemplate,
} = require('../utils/sendEmail')
const { emitToUser } = require('../utils/socket')

exports.browse = async (req, res) => {
  const { city, pincode, type } = req.query
  const query = {
    status: 'available',
    expiryTime: { $gt: new Date() },
  }

  if (type) query.foodType = type

  const effectiveCity = (city || req.user.city || '').trim()
  if (effectiveCity) query.city = effectiveCity
  if (pincode) query.pickupPincode = String(pincode).trim()

  const donations = await Donation.find(query)
    .sort({ createdAt: -1 })
    .limit(60)
    .populate('donor', 'name city')

  return res.json({ donations })
}

exports.requestFood = async (req, res) => {
  const donation = await Donation.findById(req.params.donationId).populate('donor', 'email name')
  if (!donation) return res.status(404).json({ message: 'Donation not found' })
  if (donation.status !== 'available')
    return res.status(400).json({ message: 'Donation is not available' })
  if (donation.expiryTime < new Date())
    return res.status(400).json({ message: 'Donation expired' })

  const { message = '' } = req.body

  const existing = await FoodRequest.findOne({ acceptor: req.user._id, donation: donation._id })
  if (existing) return res.status(409).json({ message: 'Already requested' })

  const acceptorOTP = generateOTP()

  // Assign a volunteer in the same city (no maps / geo dependency)
  const volunteer = await User.findOne({
    role: 'volunteer',
    suspended: false,
    city: donation.city || req.user.city,
  }).select('name email')

  const request = await FoodRequest.create({
    acceptor: req.user._id,
    donation: donation._id,
    status: volunteer ? 'approved' : 'pending',
    message,
  })

  if (volunteer) {
    donation.assignedVolunteer = volunteer._id
    donation.assignedAcceptor = req.user._id
    donation.acceptorOTP = acceptorOTP
    donation.status = 'assigned'
    await donation.save()

    await sendEmail({
      to: req.user.email,
      subject: "Food is on the way! Here's your delivery OTP 🚗",
      html: acceptorOtpTemplate({ donation, otp: acceptorOTP }),
    })

    await sendEmail({
      to: volunteer.email,
      subject: 'New Pickup Assigned to You! 📦',
      html: volunteerAssignmentTemplate({
        donation,
        volunteerName: volunteer.name,
        mapLink: process.env.CLIENT_URL || '',
      }),
    })

    const io = req.app.get('io')
    emitToUser(io, volunteer._id, 'volunteer:assigned', { donationId: donation._id })
    emitToUser(io, donation.donor?._id, 'volunteer:assigned', { donationId: donation._id })
  }

  return res.status(201).json({ request })
}

exports.getMyRequests = async (req, res) => {
  const requests = await FoodRequest.find({ acceptor: req.user._id })
    .sort({ createdAt: -1 })
    .populate('donation')
  return res.json({ requests })
}

exports.dashboardStats = async (req, res) => {
  const [pending, received] = await Promise.all([
    FoodRequest.countDocuments({ acceptor: req.user._id, status: 'pending' }),
    Donation.countDocuments({ assignedAcceptor: req.user._id, status: 'delivered' }),
  ])
  const mealsServed = received
  const acceptor = await User.findById(req.user._id)
  return res.json({
    pending,
    received,
    mealsServed,
    rating: acceptor?.rating || 0,
  })
}

exports.rateVolunteer = async (req, res) => {
  const { score, review, donationId } = req.body
  const volunteerId = req.params.volunteerId

  const donation = await Donation.findOne({
    _id: donationId,
    assignedAcceptor: req.user._id,
    assignedVolunteer: volunteerId,
    status: 'delivered',
  })
  if (!donation) return res.status(400).json({ message: 'Invalid donation' })

  const rating = await Rating.create({
    rater: req.user._id,
    ratee: volunteerId,
    donation: donation._id,
    score,
    review: review || '',
  })

  const agg = await Rating.aggregate([
    { $match: { ratee: rating.ratee } },
    { $group: { _id: '$ratee', avg: { $avg: '$score' }, count: { $sum: 1 } } },
  ])
  const next = agg[0]
  await User.updateOne(
    { _id: volunteerId },
    { rating: next?.avg || 0, totalRatings: next?.count || 0 },
  )

  return res.status(201).json({ rating })
}

donation.status = "assigned"
donation.assignedVolunteer = null