const Donation = require('../models/Donation')
const Rating = require('../models/Rating')
const User = require('../models/User')
const { emitToUser } = require('../utils/socket')
const { sendEmail, deliveryCompleteTemplate } = require('../utils/sendEmail')

exports.getAssignments = async (req, res) => {
  const assignments = await Donation.find({ assignedVolunteer: req.user._id })
    .sort({ createdAt: -1 })
    .populate('donor', 'name email phone address city location')
    .populate('assignedAcceptor', 'name email organizationName address city location')
  return res.json({ assignments })
}

exports.verifyDonorOtp = async (req, res) => {
  const { donationId, otp } = req.body
  const donation = await Donation.findOne({
    _id: donationId,
    assignedVolunteer: req.user._id,
  })
  if (!donation) return res.status(404).json({ message: 'Not found' })
  if (donation.donorOTPVerified) return res.json({ donation })
  if (donation.donorOTP !== otp) return res.status(400).json({ message: 'Invalid OTP' })

  donation.donorOTPVerified = true
  donation.status = 'picked_up'
  donation.pickedUpAt = new Date()
  await donation.save()

  const io = req.app.get('io')
  emitToUser(io, donation.donor, 'otp:donor-verified', { donationId: donation._id })

  return res.json({ donation })
}

exports.verifyAcceptorOtp = async (req, res) => {
  const { donationId, otp } = req.body
  const donation = await Donation.findOne({
    _id: donationId,
    assignedVolunteer: req.user._id,
  }).populate('donor', 'email').populate('assignedAcceptor', 'email')

  if (!donation) return res.status(404).json({ message: 'Not found' })
  if (!donation.donorOTPVerified)
    return res.status(400).json({ message: 'Pickup OTP not verified yet' })
  if (donation.acceptorOTPVerified) return res.json({ donation })
  if (donation.acceptorOTP !== otp) return res.status(400).json({ message: 'Invalid OTP' })

  donation.acceptorOTPVerified = true
  donation.status = 'delivered'
  donation.deliveredAt = new Date()
  await donation.save()

  const io = req.app.get('io')
  emitToUser(io, donation.assignedAcceptor, 'otp:acceptor-verified', { donationId: donation._id })
  emitToUser(io, donation.donor?._id, 'otp:acceptor-verified', { donationId: donation._id })
  emitToUser(io, donation.donor?._id, 'donation:completed', { donationId: donation._id })
  emitToUser(io, donation.assignedAcceptor, 'donation:completed', { donationId: donation._id })
  emitToUser(io, donation.assignedVolunteer, 'donation:completed', { donationId: donation._id })

  if (donation.donor?.email) {
    await sendEmail({
      to: donation.donor.email,
      subject: 'Delivery Complete — Thank You! 🎉',
      html: deliveryCompleteTemplate({ mealsSaved: 1 }),
    })
  }
  if (donation.assignedAcceptor?.email) {
    await sendEmail({
      to: donation.assignedAcceptor.email,
      subject: 'Delivery Complete — Thank You! 🎉',
      html: deliveryCompleteTemplate({ mealsSaved: 1 }),
    })
  }

  return res.json({ donation })
}

exports.dashboardStats = async (req, res) => {
  const [delivered, active] = await Promise.all([
    Donation.countDocuments({ assignedVolunteer: req.user._id, status: 'delivered' }),
    Donation.countDocuments({ assignedVolunteer: req.user._id, status: { $in: ['assigned', 'picked_up'] } }),
  ])
  const user = await User.findById(req.user._id)
  return res.json({
    delivered,
    active,
    rating: user?.rating || 0,
    distanceKm: null,
  })
}

exports.rateDonor = async (req, res) => {
  const { score, review, donationId } = req.body
  const donorId = req.params.donorId

  const donation = await Donation.findOne({
    _id: donationId,
    assignedVolunteer: req.user._id,
    donor: donorId,
    status: 'delivered',
  })

  if (!donation) {
    return res.status(400).json({ message: 'Invalid donation' })
  }

  const rating = await Rating.create({
    rater: req.user._id,
    ratee: donorId,
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
    { _id: donorId },
    { rating: next?.avg || 0, totalRatings: next?.count || 0 }
  )

  return res.status(201).json({ rating })
}

exports.acceptDonation = async (req, res) => {
  const { donationId } = req.body

  const donation = await Donation.findById(donationId)

  if (!donation) {
    return res.status(404).json({ message: "Donation not found" })
  }

  if (donation.assignedVolunteer) {
    return res.status(400).json({ message: "Already assigned" })
  }

  donation.assignedVolunteer = req.user._id
  donation.status = "assigned"

  await donation.save()

  return res.json({ donation })
}

