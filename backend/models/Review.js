import mongoose from 'mongoose';
import WorkerProfile from './WorkerProfile.js';

const reviewSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      unique: true, // Only one review per ticket
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // References User with role: worker
      required: true,
    },
    rating: {
      type: Number,
      required: [true, 'Please provide a rating between 1 and 5'],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: [true, 'Please provide a comment'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Visible', 'Hidden', 'Reported'],
      default: 'Visible',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent user from reviewing the same ticket multiple times (already unique index)
reviewSchema.index({ ticketId: 1 }, { unique: true });

// Static method to get avg rating and update worker profile
reviewSchema.statics.getAverageRating = async function (workerId) {
  const obj = await this.aggregate([
    {
      $match: { workerId: workerId },
    },
    {
      $group: {
        _id: '$workerId',
        averageRating: { $avg: '$rating' },
      },
    },
  ]);

  try {
    if (obj.length > 0) {
      await WorkerProfile.findOneAndUpdate(
        { userId: workerId },
        {
          rating: Math.round(obj[0].averageRating * 10) / 10,
        }
      );
    } else {
      await WorkerProfile.findOneAndUpdate(
        { userId: workerId },
        {
          rating: 5.0,
        }
      );
    }
  } catch (err) {
    console.error(`Error updating worker average rating: ${err}`);
  }
};

// Call getAverageRating after save
reviewSchema.post('save', async function () {
  await this.constructor.getAverageRating(this.workerId);
});

// Call getAverageRating before delete
reviewSchema.post('remove', async function () {
  await this.constructor.getAverageRating(this.workerId);
});

const Review = mongoose.model('Review', reviewSchema);
export default Review;
