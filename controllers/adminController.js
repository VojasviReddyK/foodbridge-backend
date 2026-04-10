const Donation = require('../models/Donation')
const User = require('../models/User')

exports.stats = async (_req, res) => {
  const [users, donations, delivered] = await Promise.all([
    User.countDocuments({}),
    Donation.countDocuments({}),
    Donation.countDocuments({ status: 'delivered' }),
  ])

  const byRole = await User.aggregate([
    { $group: { _id: '$role', value: { $sum: 1 } } },
    { $project: { _id: 0, role: '$_id', value: 1 } },
  ])

  const byCity = await Donation.aggregate([
    { $match: { status: 'delivered' } },
    { $group: { _id: '$city', value: { $sum: 1 } } },
    { $project: { _id: 0, city: { $ifNull: ['$_id', 'Unknown'] }, value: 1 } },
    { $sort: { value: -1 } },
    { $limit: 8 },
  ])

  const foodType = await Donation.aggregate([
    { $group: { _id: '$foodType', value: { $sum: 1 } } },
    { $project: { _id: 0, name: '$_id', value: 1 } },
  ])

  // last 30 days rollup (simple)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const overTime = await Donation.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%m-%d', date: '$createdAt' } },
        value: { $sum: 1 },
      },
    },
    { $project: { _id: 0, day: '$_id', value: 1 } },
    { $sort: { day: 1 } },
  ])

  const cities = await Donation.distinct('city')
  return res.json({
    totals: {
      users,
      donations,
      delivered,
      foodSavedKg: delivered * 5,
      cities: cities.filter(Boolean).length,
    },
    charts: {
      usersByRole: byRole,
      deliveriesByCity: byCity,
      foodType: foodType.map((x) => ({
        name: x.name === 'non-veg' ? 'Non-veg' : x.name === 'veg' ? 'Veg' : 'Both',
        value: x.value,
      })),
      donationsOverTime: overTime,
    },
  })
}

exports.users = async (_req, res) => {
  const users = await User.find({})
    .sort({ createdAt: -1 })
    .select('name email role suspended createdAt')
    .limit(200)
  return res.json({ users })
}

exports.suspendUser = async (req, res) => {
  const { suspended = true } = req.body
  await User.updateOne({ _id: req.params.id }, { suspended: !!suspended })
  return res.json({ message: 'Updated' })
}

exports.donations = async (_req, res) => {
  const donations = await Donation.find({})
    .sort({ createdAt: -1 })
    .populate('donor', 'name email')
    .populate('assignedVolunteer', 'name email')
    .populate('assignedAcceptor', 'name email organizationName')
    .limit(200)
  return res.json({ donations })
}

exports.activityLog = async (_req, res) => {
  const items = await Donation.find({})
    .sort({ createdAt: -1 })
    .select('foodName status createdAt deliveredAt pickedUpAt')
    .limit(50)
  return res.json({ items })
}

