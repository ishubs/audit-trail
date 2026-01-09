import mongoose, { type InferSchemaType } from 'mongoose';

import { auditTrailPlugin } from '../plugins/auditTrailPlugin.js';

const BookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    authors: { type: String, required: true, trim: true },
    publishedBy: { type: String, required: true, trim: true },

    createdById: { type: String, required: true },
    updatedById: { type: String, required: false },
    deletedById: { type: String, required: false },
    deletedAt: { type: Date, required: false, default: null }
  },
  {
    timestamps: true
  }
);

BookSchema.index({ createdAt: -1, _id: -1 });
BookSchema.index({ updatedAt: -1 });
BookSchema.index({ deletedAt: -1 });

BookSchema.plugin(auditTrailPlugin, { entity: 'Book' });

export type BookDoc = InferSchemaType<typeof BookSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const BookModel =
  (mongoose.models.Book as mongoose.Model<BookDoc> | undefined) ??
  mongoose.model<BookDoc>('Book', BookSchema);

