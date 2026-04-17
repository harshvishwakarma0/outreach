import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '../_lib/supabase.js';
import { createToken } from '../_lib/auth.js';
import { applyCors, readJsonBody, sendJson } from '../_lib/http.js';

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { message: 'Method not allowed' });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await readJsonBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return sendJson(res, 400, { message: 'Email and password are required' });
    }

    const { data: user, error } = await supabaseAdmin
      .from('app_users')
      .select('id, password_hash')
      .eq('email', email)
      .maybeSingle();

    if (error || !user) {
      return sendJson(res, 401, { message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return sendJson(res, 401, { message: 'Invalid credentials' });
    }

    return sendJson(res, 200, { token: createToken(user.id) });
  } catch {
    return sendJson(res, 500, { message: 'Login failed' });
  }
}