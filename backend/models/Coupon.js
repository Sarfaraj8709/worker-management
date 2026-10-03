import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'flat'], default: 'percent' },
    value: { type: Number, required: true },
    minOrder: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: 0 },
    validFrom: { type: Date, default: Date.now },
    validTo: { type: Date },
    usageLimit: { type: Number, default: 0 },
    usageCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
