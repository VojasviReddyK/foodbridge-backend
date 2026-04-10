const mongoose = require('mongoose')

const foodRequestSchema = new mongoose.Schema(
  {
    acceptor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    donation: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    message: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } },
)

foodRequestSchema.index({ acceptor: 1, donation: 1 }, { unique: true })

module.exports = mongoose.model('FoodRequest', foodRequestSchema)

