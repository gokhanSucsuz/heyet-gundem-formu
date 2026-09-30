import mongoose, { Schema } from 'mongoose';

const SuperAdminSchema = new Schema({
  _id: { type: String, default: 'super-admin' },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  mustChangePassword: { type: Boolean, default: true },
}, { timestamps: true });

export const SuperAdminModel =
  mongoose.models.SuperAdmin || mongoose.model('SuperAdmin', SuperAdminSchema);
