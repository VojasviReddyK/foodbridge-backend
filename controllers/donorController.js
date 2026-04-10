const Donation = require('../models/Donation')
const Rating = require('../models/Rating')
const User = require('../models/User')
const generateOTP = require('../utils/generateOTP')
const { sendEmail, donationLiveTemplate } = require('../utils/sendEmail')

exports.createDonation = async (req, res) => {
  const {
    foodName,
    description,
    quantity,
    foodType,
    expiryTime,
    pickupAddress,
    pickupPincode,
  } = req.body

  const images = (req.files || []).map((f) => f.path).filter(Boolean)

  const donorOTP = generateOTP()

  const donation = await Donation.create({
    donor: req.user._id,
    foodName,
    description,
    quantity,
    foodType,
    expiryTime: new Date(expiryTime),
    images,
    pickupAddress,
    pickupPincode,
    city: req.user.city,
    donorOTP,
  })

  await sendEmail({
    to: req.user.email,
    subject: 'Your Donation is Live! 🍱',
    html: donationLiveTemplate({ donation, otp: donorOTP }),
  })

  const io = req.app.get('io')
  io?.emit('donation:new', { donationId: donation._id })

  return res.status(201).json({ donation })
}

exports.getMyDonations = async (req, res) => {
  const donations = await Donation.find({ donor: req.user._id })
    .sort({ createdAt: -1 })
    .populate('assignedVolunteer', 'name email phone')
    .populate('assignedAcceptor', 'name email organizationName')
  return res.json({ donations })
}

exports.updateDonation = async (req, res) => {
  const donation = await Donation.findOne({ _id: req.params.id, donor: req.user._id })
  if (!donation) return res.status(404).json({ message: 'Not found' })

  const allow = ['foodName', 'description', 'quantity', 'foodType', 'expiryTime', 'pickupAddress']
  for (const k of allow) if (req.body[k] !== undefined) donation[k] = req.body[k]
  await donation.save()
  return res.json({ donation })
}

exports.deleteDonation = async (req, res) => {
  const donation = await Donation.findOne({ _id: req.params.id, donor: req.user._id })
  if (!donation) return res.status(404).json({ message: 'Not found' })
  if (donation.status !== 'available')
    return res.status(400).json({ message: 'Only available donations can be deleted' })

  await donation.deleteOne()
  return res.json({ message: 'Deleted' })
}

exports.dashboardStats = async (req, res) => {
  const [total, active, delivered] = await Promise.all([
    Donation.countDocuments({ donor: req.user._id }),
    Donation.countDocuments({ donor: req.user._id, status: { $in: ['available', 'assigned', 'picked_up'] } }),
    Donation.countDocuments({ donor: req.user._id, status: 'delivered' }),
  ])

  const donor = await User.findById(req.user._id)
  return res.json({
    total,
    active,
    delivered,
    rating: donor?.rating || 0,
  })
}

exports.rateVolunteer = async (req, res) => {
  const { score, review, donationId } = req.body
  const volunteerId = req.params.volunteerId

  const donation = await Donation.findOne({ _id: donationId, donor: req.user._id, assignedVolunteer: volunteerId })
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

