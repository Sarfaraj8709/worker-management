import AuditLog from '../models/AuditLog.js';

export const writeAudit = async (req, { action, entity = '', entityType = '', previousValue = '', newValue = '' }) => {
  try {
    await AuditLog.create({
      admin: req.user?.name || 'Admin',
      adminId: req.user?._id,
      action,
      entity,
      entityType,
      previousValue: previousValue == null ? '' : String(previousValue),
      newValue: newValue == null ? '' : String(newValue),
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
};
