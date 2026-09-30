import mongoose, { Schema } from 'mongoose';

const AuditLogSchema = new Schema({
  personnelId: { type: String, required: true },
  personnelName: { type: String, required: true },
  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT', 'LOCK', 'UNLOCK', 'EXPORT', 'IMPORT'],
  },
  resource: {
    type: String,
    required: true,
    enum: ['form', 'member', 'settings', 'personnel', 'page', 'session', 'system'],
  },
  resourceId: { type: String, default: null },
  details: { type: String, default: '' },           // Encrypted details
  previousValue: { type: String, default: null },    // Encrypted previous state
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  timestamp: { type: Date, default: Date.now, index: true },
});

// Index for efficient querying
AuditLogSchema.index({ personnelId: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, action: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 });

export const AuditLogModel =
  mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
