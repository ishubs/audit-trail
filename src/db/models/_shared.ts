export function toPublicId(doc: any): string {
  if (!doc) return '';
  const raw = doc._id ?? doc.id;
  return typeof raw === 'string' ? raw : raw?.toString?.() ?? String(raw);
}

export function stripMongoInternals<T extends Record<string, any>>(doc: T): Omit<T, '_id' | '__v'> & { id: string } {
  const id = toPublicId(doc);
  const { _id: _ignored, __v: _ignored2, ...rest } = doc as any;
  return { ...rest, id };
}

