import jwt from 'jsonwebtoken';
import { getSupabaseAdmin } from './supabase.js';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
}

export function createToken(userId) {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '14d' });
}

export async function requireUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return null;
  }

  const decoded = jwt.verify(token, getJwtSecret());
  const userId = decoded && typeof decoded === 'object' ? decoded.userId : null;
  if (!userId || typeof userId !== 'string') {
    return null;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: user, error } = await supabaseAdmin
    .from('app_users')
    .select('id, name, email')
    .eq('id', userId)
    .maybeSingle();

  if (error || !user) {
    return null;
  }

  return { id: user.id, name: user.name, email: user.email };
}