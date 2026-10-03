import mongoose from 'mongoose';

const adminNotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['verify', 'complaint', 'emergency', 'payment', 'report'],
      default: 'report',
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, trim: true, default: '' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

adminNotificationSchema.index({ createdAt: -1 });

const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);
export default AdminNotification;
