import mongoose, { type InferSchemaType } from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, required: true, default: () => new Date(), index: true },

    entity: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    action: {
      type: String,
      required: true,
      enum: ['create', 'update', 'delete', 'restore', 'auth_check'],
      index: true
    },

    actorId: { type: String, required: true, index: true },
    requestId: { type: String, required: true, index: true },

    route: { type: String, required: false },
    method: { type: String, required: false },
    status: { type: Number, required: false },

    diff: { type: mongoose.Schema.Types.Mixed, required: true },
    // Empty string is valid (e.g. create/auth_check where we may not have a before+after object pair to diff keys).
    changedFieldsPacked: { type: String, required: false, default: '' }
  },
  { timestamps: false }
);

AuditLogSchema.index({ entity: 1, entityId: 1 });
AuditLogSchema.index({ timestamp: -1, _id: -1 });

export type AuditLogDoc = InferSchemaType<typeof AuditLogSchema> & {
  _id: mongoose.Types.ObjectId;
  timestamp: Date;
};

export const AuditLogModel =
  (mongoose.models.AuditLog as mongoose.Model<AuditLogDoc> | undefined) ??
  mongoose.model<AuditLogDoc>('AuditLog', AuditLogSchema);

