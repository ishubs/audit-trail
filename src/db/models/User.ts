import mongoose, { type InferSchemaType } from 'mongoose';

import { auditTrailPlugin } from '../plugins/auditTrailPlugin.js';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, enum: ['admin', 'reviewer'] },
    apiKey: { type: String, required: true, unique: true, index: true }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

UserSchema.index({ createdAt: -1 });

UserSchema.plugin(auditTrailPlugin, { entity: 'User' });

export type UserDoc = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const UserModel =
  (mongoose.models.User as mongoose.Model<UserDoc> | undefined) ??
  mongoose.model<UserDoc>('User', UserSchema);

