const mongoose = require('mongoose')

const ratingSchema = new mongoose.Schema(
  {
    rater: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ratee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    donation: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', required: true },
    score: { type: Number, min: 1, max: 5, required: true },
    review: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } },
)

ratingSchema.index({ rater: 1, donation: 1 }, { unique: true })

module.exports = mongoose.model('Rating', ratingSchema)

