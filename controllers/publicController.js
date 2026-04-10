const Donation = require('../models/Donation')
const User = require('../models/User')
const { sendEmail } = require('../utils/sendEmail')

exports.recentDonations = async (_req, res) => {
  const donations = await Donation.find({ status: 'available', expiryTime: { $gt: new Date() } })
    .sort({ createdAt: -1 })
    .limit(4)
    .select('foodName quantity foodType images expiryTime city createdAt location')
  return res.json({ donations })
}

exports.impact = async (_req, res) => {
  const [mealsDonated, volunteers, ngos] = await Promise.all([
    Donation.countDocuments({}),
    User.countDocuments({ role: 'volunteer' }),
    User.countDocuments({ role: 'acceptor' }),
  ])

  return res.json({
    stats: {
      mealsDonated,
      volunteers,
      ngos,
      satisfaction: 98,
    },
    charts: {
      donationsPerMonth: [],
      deliveriesByCity: [],
      foodType: [],
    },
  })
}

exports.contact = async (req, res) => {
  const { name, email, message } = req.body
  const to = process.env.EMAIL_USER
  if (to) {
    await sendEmail({
      to,
      subject: `FoodBridge Contact: ${name}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;">
          <p><b>Name:</b> ${name}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Message:</b><br/>${String(message || '').replace(/\n/g, '<br/>')}</p>
        </div>
      `,
    })
  }
  return res.json({ message: 'Received' })
}

