import mongoose from 'mongoose';

const servicePackageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    price: { type: Number, required: true },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    includedServices: { type: [String], default: [] },
    discount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ServicePackage = mongoose.model('ServicePackage', servicePackageSchema);
export default ServicePackage;
