import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a service name'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    price: {
      type: Number,
      default: 0,
    },
    emergencyEnabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

serviceSchema.index({ name: 1 });

const Service = mongoose.model('Service', serviceSchema);
export default Service;
