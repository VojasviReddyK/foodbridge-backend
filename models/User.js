const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String },
    role: {
      type: String,
      enum: ['donor', 'acceptor', 'volunteer', 'admin'],
    },
    googleId: { type: String },
    avatar: { type: String },
    phone: { type: String },
    address: { type: String },
    city: { type: String },
    pincode: { type: String },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [78.4867, 17.385] }, // [lng, lat]
    },
    organizationName: { type: String },
    vehicleType: { type: String },
    isVerified: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    suspended: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } },
)

userSchema.index({ location: '2dsphere' })

module.exports = mongoose.model('User', userSchema)

