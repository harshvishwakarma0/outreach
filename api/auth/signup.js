import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
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
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!name || !email || password.length < 6) {
      return sendJson(res, 400, { message: 'Name, valid email, and password (min 6) are required' });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('app_users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingError) {
      return sendJson(res, 500, { message: 'Signup failed' });
    }

    if (existing) {
      return sendJson(res, 409, { message: 'Email already registered' });
    }

    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const { error: createUserError } = await supabaseAdmin.from('app_users').insert({
      id: userId,
      name,
      email,
      password_hash: passwordHash,
    });

    if (createUserError) {
      if (createUserError.code === '23505') {
        return sendJson(res, 409, { message: 'Email already registered' });
      }
      return sendJson(res, 500, { message: 'Signup failed' });
    }

    const { error: dataError } = await supabaseAdmin.from('user_data').upsert({
      user_id: userId,
      contacts: [],
      templates: [],
      settings: {
        product: 'our solution',
        selectedTemplateId: 'tpl-dental-general',
        useCustomMessage: false,
        customMessage: '',
        templateMode: 'manual',
      },
      updated_at: new Date().toISOString(),
    });

    if (dataError) {
      return sendJson(res, 500, { message: 'Signup failed' });
    }

    return sendJson(res, 201, { token: createToken(userId) });
  } catch (error) {
    return sendJson(res, 500, { message: 'Signup failed' });
  }
}