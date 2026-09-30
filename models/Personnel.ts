import mongoose, { Schema } from 'mongoose';

const PersonnelSchema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: String, default: 'system' },
}, { timestamps: true });

export const PersonnelModel =
  mongoose.models.Personnel || mongoose.model('Personnel', PersonnelSchema);
