const mongoose = require('mongoose')

const donationSchema = new mongoose.Schema(
  {
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    foodName: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    quantity: { type: String, required: true },
    foodType: { type: String, enum: ['veg', 'non-veg', 'both'], required: true },
    expiryTime: { type: Date, required: true },
    images: { type: [String], default: [] },
    pickupAddress: { type: String, required: true },
    pickupPincode: { type: String },
    city: { type: String },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [78.4867, 17.385] }, // [lng, lat]
    },
    status: {
      type: String,
      enum: ['available', 'assigned', 'picked_up', 'delivered', 'expired'],
      default: 'available',
    },
    assignedVolunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAcceptor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    donorOTP: { type: String },
    acceptorOTP: { type: String },
    donorOTPVerified: { type: Boolean, default: false },
    acceptorOTPVerified: { type: Boolean, default: false },
    pickedUpAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } },
)

donationSchema.index({ location: '2dsphere' })
donationSchema.index({ status: 1, expiryTime: 1 })

module.exports = mongoose.model('Donation', donationSchema)

