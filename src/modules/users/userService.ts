import { UserModel } from '../../db/models/User.js';
import { stripMongoInternals } from '../../db/models/_shared.js';

export type AuthUser = {
  id: string;
  name: string;
  role: 'admin' | 'reviewer';
};

export async function findUserByApiKey(apiKey: string): Promise<AuthUser | null> {
  const user = await UserModel.findOne({ apiKey }).lean();
  if (!user) return null;
  const pub = stripMongoInternals(user);
  return { id: pub.id, name: pub.name, role: pub.role };
}

