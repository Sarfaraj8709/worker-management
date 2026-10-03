import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    admin: { type: String, required: true, trim: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true, trim: true },
    entity: { type: String, trim: true, default: '' },
    entityType: { type: String, trim: true, default: '' },
    previousValue: { type: String, trim: true, default: '' },
    newValue: { type: String, trim: true, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

auditLogSchema.index({ timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
