export type Cursor = {
  ts: string;
  id: string;
};

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): Cursor {
  const raw = Buffer.from(cursor, 'base64url').toString('utf8');
  const parsed = JSON.parse(raw) as Cursor;
  if (!parsed?.ts || !parsed?.id) throw new Error('Invalid cursor');
  return parsed;
}

