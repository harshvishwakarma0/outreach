import { getSupabaseAdmin } from './_lib/supabase.js';
import { requireUser } from './_lib/auth.js';
import { applyCors, readJsonBody, sendJson } from './_lib/http.js';

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const user = await requireUser(req);
    if (!user) {
      return sendJson(res, 401, { message: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const { data: record, error } = await supabaseAdmin
        .from('user_data')
        .select('contacts, templates, settings')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        return sendJson(res, 500, { message: 'Request failed' });
      }

      if (!record) {
        return sendJson(res, 200, { contacts: [], templates: [], settings: {} });
      }

      return sendJson(res, 200, {
        contacts: record.contacts || [],
        templates: record.templates || [],
        settings: record.settings || {},
      });
    }

    if (req.method === 'PUT') {
      const body = await readJsonBody(req);
      const contacts = Array.isArray(body.contacts) ? body.contacts : [];
      const templates = Array.isArray(body.templates) ? body.templates : [];
      const settings = body.settings && typeof body.settings === 'object' ? body.settings : {};

      const { error } = await supabaseAdmin.from('user_data').upsert({
        user_id: user.id,
        contacts,
        templates,
        settings,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        return sendJson(res, 500, { message: 'Request failed' });
      }

      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 405, { message: 'Method not allowed' });
  } catch {
    return sendJson(res, 500, { message: 'Request failed' });
  }
}