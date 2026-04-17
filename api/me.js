import { requireUser } from './_lib/auth.js';
import { applyCors, sendJson } from './_lib/http.js';

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return sendJson(res, 405, { message: 'Method not allowed' });
  }

  try {
    const user = await requireUser(req);
    if (!user) {
      return sendJson(res, 401, { message: 'Unauthorized' });
    }
    return sendJson(res, 200, { user });
  } catch {
    return sendJson(res, 401, { message: 'Unauthorized' });
  }
}