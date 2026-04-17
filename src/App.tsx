import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

type ContactStatus = 'pending' | 'contacted' | 'no-answer' | 'interested';
type TemplateMode = 'manual' | 'auto-niche';

interface Contact {
  id: string;
  name: string;
  phone: string;
  clinicName: string;
  nicheName: string;
  status: ContactStatus;
  notes: string;
  createdAt: number;
}

interface Template {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
}

interface Settings {
  product: string;
  selectedTemplateId: string;
  useCustomMessage: boolean;
  customMessage: string;
  templateMode: TemplateMode;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface ToastState {
  type: 'success' | 'error' | 'info';
  message: string;
}

const rawApiBase = ((import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_BASE_URL || '').trim();
const API_BASE = !rawApiBase || rawApiBase === '-' || rawApiBase === 'undefined' || rawApiBase === 'null' ? '' : rawApiBase.replace(/\/$/, '');
const MAX_MESSAGE_LENGTH = 10000;

const defaultTemplates: Template[] = [
  {
    id: 'tpl-dental-general',
    name: 'Dental / General Clinic',
    content: `Hi [clinic name] team,

I'm Harsh, a professional web developer based in Mumbai.

I noticed your clinic, [Clinic Name], has amazing reviews on Google, but you don't have a website yet. I help local clinics build highly professional, mobile-friendly websites that rank on Google to attract new patients.

I'd love to build a free, no-obligation demo website for your clinic so you can see exactly how it would look and function.

Can I share the demo link with you here in 30 minutes?`,
    isDefault: true,
  },
  {
    id: 'tpl-specialist',
    name: 'Specialist / High-ticket Clinic',
    content: `Hi [Clinic Name] team,

I'm Harsh, a local web developer here in Mumbai. I came across your practice on Google and was really impressed by the clinic's excellent patient reviews!

I help specialist doctors build premium websites so they can rank directly on Google and completely eliminate their dependency on platforms like Practo or Justdial.

I've put together a free, no-obligation demo website designed specifically for specialists. Can I share the link with you here to see what you think?`,
    isDefault: true,
  },
  {
    id: 'tpl-gym',
    name: 'Traditional Gym',
    content: `Hi [Gym Name] team,

I'm Harsh, a local web developer. I came across your gym on Google and was really impressed by your solid reviews!

I help fitness centers build professional websites to capture more local searches (like "gym near me") and automate free trial bookings.

I've put together a completely free, no-obligation demo website designed specifically for gyms so you can see how it works. Can I share the link with you here?`,
    isDefault: true,
  },
  {
    id: 'tpl-yoga-wellness',
    name: 'Yoga / Wellness Studio',
    content: `Hi [Studio Name] team,

I'm Harsh, a local web developer. I came across your studio on Google and your reviews reflect the quality of your work beautifully!

I help yoga and wellness studios build professional websites to rank higher on Google searches and retain their students longer.

I've built a free, no-obligation demo website specifically designed for studios like yours. Can I share the link with you here to see what you think?`,
    isDefault: true,
  },
  {
    id: 'tpl-martial-arts',
    name: 'Martial Arts Academy',
    content: `Hi [Academy Name] team,

I'm Harsh, a local web developer. I found your academy on Google and you have impressive reviews. It is clearly a serious setup.

I noticed you don't have a website yet. Parents Google "martial arts classes near me" every day to enroll their kids, and right now, your academy doesn't appear.

I've built a free, no-obligation demo website designed specifically for martial arts academies to change that. Can I share the link with you here to see what you think?`,
    isDefault: true,
  },
  {
    id: 'tpl-dance-fitness',
    name: 'Dance Fitness Studio',
    content: `Hi [Studio Name] team,

I'm Harsh, a local web developer. I came across your dance studio on Google and your reviews show what a fun and energetic environment you've built!

People who search "dance classes near me" on Google are usually ready to join right then, not just browsing. I want to make sure your studio appears there.

I've built a free, no-obligation demo website specifically designed for dance fitness studios. Can I share the link with you here to see what you think?`,
    isDefault: true,
  },
  {
    id: 'tpl-sports-academy',
    name: 'Sports Academy',
    content: `Hi [Academy Name] team,

I'm Harsh, a local web developer. I came across your academy on Google and the work you're doing with young athletes is really impressive!

I noticed you don't have a website yet. Parents Google "cricket academy near me" or "football academy near me" every day before enrolling their child, and right now, your academy doesn't appear.

I've built a free, no-obligation demo website specifically designed for sports academies to help capture those parents. Can I share the link with you here?`,
    isDefault: true,
  },
  {
    id: 'tpl-unknown-niche',
    name: 'Unknown Niche / Generic Business',
    content: `Hi [gym/studio/clinic] Team,

I'm Harsh, a local web developer here in Mumbai. I came across your profile and wanted to reach out to you directly.

I help local business owners build premium websites so they can rank higher on Google searches, look incredibly professional to new clients, and capture more direct leads.

I've put together a free, no-obligation demo website showing exactly how a modern site helps grow a local business. Can I share the link with you here to see what you think?`,
    isDefault: true,
  },
];

const nicheRules: Record<string, string[]> = {
  'tpl-specialist': ['specialist', 'ivf', 'fertility', 'implant', 'orthodont', 'cardio', 'neuro', 'cosmetic', 'plastic'],
  'tpl-martial-arts': ['martial', 'karate', 'taekwondo', 'judo', 'mma', 'kickboxing'],
  'tpl-dance-fitness': ['dance', 'zumba', 'aerobics'],
  'tpl-yoga-wellness': ['yoga', 'wellness', 'meditation', 'pilates', 'bikram', 'vinyasa'],
  'tpl-gym': ['gym', 'crossfit', 'fitness center', 'fitness centre'],
  'tpl-sports-academy': ['sports', 'academy', 'cricket', 'football', 'badminton', 'tennis', 'swimming', 'athlet'],
  'tpl-dental-general': ['clinic', 'hospital', 'dental', 'physio', 'doctor', 'skin', 'derma', 'ent', 'ortho'],
};

const normalize = (text: string): string => text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const normalizeHeader = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]/g, '');
const makeId = (): string => Math.random().toString(36).slice(2, 11);

const getFirstName = (value: string): string => {
  const cleaned = value.replace(/^(dr\.?|doctor)\s+/i, '').trim();
  return cleaned.split(/\s+/)[0] || 'there';
};

const phoneToDigits = (phone: string): string => phone.replace(/\D/g, '');

const validatePhone = (phone: string): boolean => {
  const digits = phoneToDigits(phone);
  return digits.length === 10 || (digits.startsWith('91') && digits.length === 12);
};

const formatPhoneForWhatsApp = (phone: string): string => {
  const digits = phoneToDigits(phone);
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

const createWaLink = (phone: string, message: string): string => {
  return `https://wa.me/${formatPhoneForWhatsApp(phone)}?text=${encodeURIComponent(message)}`;
};

const mergeTemplates = (saved: Template[]): Template[] => {
  const base = defaultTemplates.map((template) => {
    const match = saved.find((item) => item.id === template.id);
    return match ? { ...template, ...match } : template;
  });
  const custom = saved.filter((item) => !defaultTemplates.some((baseTemplate) => baseTemplate.id === item.id));
  return [...base, ...custom];
};

const pickTemplateByNiche = (templates: Template[], nicheName: string): Template => {
  const niche = normalize(nicheName);
  for (const [templateId, keys] of Object.entries(nicheRules)) {
    if (keys.some((key) => niche.includes(key))) {
      const found = templates.find((template) => template.id === templateId);
      if (found) return found;
    }
  }
  return templates.find((template) => template.id === 'tpl-unknown-niche') || templates[0] || defaultTemplates[0];
};

const replaceTemplateVars = (template: string, contact: Contact, product: string): string => {
  const clinic = contact.clinicName.trim() || 'your clinic';
  const name = contact.name.trim() || 'there';
  const firstName = getFirstName(name);
  const niche = contact.nicheName.trim() || 'local business';
  const dictionary: Record<string, string> = {
    'name': firstName,
    'firstname': firstName,
    'doctorname': name,
    'fullname': name,
    'clinicname': clinic,
    'clinic': clinic,
    'gymname': clinic,
    'studioname': clinic,
    'academyname': clinic,
    'shopname': clinic,
    'gym/studio/clinic': clinic,
    'nichename': niche,
    'niche': niche,
    'product': product,
  };

  return template.replace(/\[([^\]]+)\]|\{([^}]+)\}/g, (full, bracketToken, curlyToken) => {
    const token = String(bracketToken || curlyToken || '').toLowerCase().replace(/[^a-z0-9/]/g, '');
    const value = dictionary[token];
    return value ?? full;
  });
};

const toStatus = (value: string): ContactStatus => {
  const v = value.toLowerCase();
  if (v.includes('hot') || v.includes('warm') || v.includes('interested')) return 'interested';
  if (v.includes('contacted') || v.includes('replied') || v.includes('responded')) return 'contacted';
  if (v.includes('no answer') || v.includes('cold') || v.includes('unresponsive')) return 'no-answer';
  return 'pending';
};

const getCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const getField = (row: Record<string, unknown>, aliases: string[]): string => {
  const normalizedAliases = aliases.map((alias) => normalizeHeader(alias));
  for (const [key, val] of Object.entries(row)) {
    const cleaned = normalizeHeader(key);
    if (normalizedAliases.includes(cleaned) || normalizedAliases.some((alias) => cleaned.includes(alias))) {
      const cell = getCell(val);
      if (cell) return cell;
    }
  }
  return '';
};

const importContactsFromRows = (rows: Record<string, unknown>[]): { contacts: Omit<Contact, 'id' | 'createdAt'>[]; warning: string } => {
  const contacts: Omit<Contact, 'id' | 'createdAt'>[] = [];
  let skipped = 0;
  const hasPitch = Object.keys(rows[0] || {}).some((key) => normalizeHeader(key).includes('whatsapppitch'));

  rows.forEach((row) => {
    const clinic = getField(row, ['Gym/Studio Name', 'Clinic Name', 'Hospital Name', 'Shop Name', 'Academy Name']);
    const name = getField(row, ['Doctor Name', 'Name', 'Contact Name']) || clinic;
    const phone = getField(row, ['Phone', 'Mobile', 'Mobile Number', 'WhatsApp Number']);
    const nicheName = getField(row, ['Niche Name', 'Niche']);
    const status = toStatus(getField(row, ['Lead Status', 'Status']));
    const notes = [
      getField(row, ['Lead ID']) ? `Lead ID: ${getField(row, ['Lead ID'])}` : '',
      getField(row, ['Niche ID']) ? `Niche ID: ${getField(row, ['Niche ID'])}` : '',
      getField(row, ['Rating']) ? `Rating: ${getField(row, ['Rating'])}` : '',
    ].filter(Boolean).join(' | ');

    if (!name || !phone || !validatePhone(phone)) {
      skipped += 1;
      return;
    }

    contacts.push({
      name,
      phone,
      clinicName: clinic,
      nicheName,
      status,
      notes,
    });
  });

  const warningBits: string[] = [];
  if (hasPitch) warningBits.push('WhatsApp Pitch column was detected and ignored.');
  if (skipped > 0) warningBits.push(`${skipped} invalid rows were skipped.`);
  return { contacts, warning: warningBits.join(' ') };
};

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2800);
    return () => clearTimeout(timer);
  }, [onClose]);
  const color = toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-slate-700';
  return <div className={`fixed top-4 right-4 z-50 ${color} text-white text-sm px-4 py-2 rounded-lg shadow-lg`}>{toast.message}</div>;
}

function ContactModal({
  open,
  editing,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: Contact | null;
  onClose: () => void;
  onSave: (data: Omit<Contact, 'id' | 'createdAt'>) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [nicheName, setNicheName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(editing?.name || '');
    setPhone(editing?.phone || '');
    setClinicName(editing?.clinicName || '');
    setNicheName(editing?.nicheName || '');
    setError('');
  }, [open, editing]);

  if (!open) return null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Name and phone are required.');
      return;
    }
    if (!validatePhone(phone)) {
      setError('Enter a valid Indian mobile number.');
      return;
    }
    onSave({
      name: name.trim(),
      phone: phone.trim(),
      clinicName: clinicName.trim(),
      nicheName: nicheName.trim(),
      status: editing?.status || 'pending',
      notes: editing?.notes || '',
    });
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white border border-slate-200 p-5 space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">{editing ? 'Edit Contact' : 'Add Contact'}</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Doctor or owner name" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Phone" />
        <input value={clinicName} onChange={(e) => setClinicName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Gym/Studio/Clinic" />
        <input value={nicheName} onChange={(e) => setNicheName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Niche name" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-300">Cancel</button>
          <button type="submit" className="flex-1 py-2 rounded-lg bg-emerald-600 text-white">Save</button>
        </div>
      </form>
    </div>
  );
}

function AuthView({
  loading,
  onSubmit,
}: {
  loading: boolean;
  onSubmit: (mode: 'login' | 'signup', payload: { name: string; email: string; password: string }) => Promise<void>;
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(mode, { name, email, password });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6">
        <h1 className="text-2xl font-semibold text-slate-800">WhatsApp Outreach</h1>
        <p className="text-sm text-slate-500 mt-1">Sign in to continue from where you left.</p>
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={() => setMode('login')} className={`flex-1 py-2 rounded-lg ${mode === 'login' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>Login</button>
          <button type="button" onClick={() => setMode('signup')} className={`flex-1 py-2 rounded-lg ${mode === 'signup' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>Sign Up</button>
        </div>
        <form onSubmit={submit} className="space-y-3 mt-4">
          {mode === 'signup' && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />}
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password (min 6 chars)" className="w-full px-3 py-2 border border-slate-300 rounded-lg" required />
          <button disabled={loading} className="w-full py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-60">
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

async function apiRequest(path: string, options: RequestInit = {}, token?: string): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

async function readApiPayload(res: Response): Promise<Record<string, unknown>> {
  const raw = await res.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const short = raw.slice(0, 140).trim();
    return {
      message: short.startsWith('A server error has occurred')
        ? 'Server error from /api route. Check Vercel environment variables.'
        : short || 'Server returned a non-JSON response',
    };
  }
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('wa-token'));
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [appLoading, setAppLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>(defaultTemplates);
  const [settings, setSettings] = useState<Settings>({
    product: 'our solution',
    selectedTemplateId: defaultTemplates[0].id,
    useCustomMessage: false,
    customMessage: '',
    templateMode: 'manual',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContactStatus>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [syncLabel, setSyncLabel] = useState<'saved' | 'saving' | 'error'>('saved');
  const [bootstrapped, setBootstrapped] = useState(false);

  const selectedTemplate = useMemo(() => templates.find((t) => t.id === settings.selectedTemplateId) || templates[0], [templates, settings.selectedTemplateId]);

  const resolveTemplate = (contact: Contact): Template => {
    if (settings.templateMode === 'auto-niche') {
      return pickTemplateByNiche(templates, contact.nicheName);
    }
    return selectedTemplate || templates[0] || defaultTemplates[0];
  };

  const messageForContact = (contact: Contact): string => {
    const templateText = settings.useCustomMessage ? settings.customMessage : resolveTemplate(contact).content;
    return replaceTemplateVars(templateText, contact, settings.product);
  };

  const previewMessage = messageForContact({
    id: 'preview',
    name: 'Dr. Priya Sharma',
    phone: '9876543210',
    clinicName: 'Victory Training Academy',
    nicheName: 'Tennis Coaching Center',
    status: 'pending',
    notes: '',
    createdAt: Date.now(),
  });

  const filteredContacts = contacts.filter((contact) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      contact.name.toLowerCase().includes(query) ||
      contact.phone.includes(searchQuery) ||
      contact.clinicName.toLowerCase().includes(query) ||
      contact.nicheName.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = contacts.filter((contact) => contact.status === 'pending').length;

  useEffect(() => {
    if (!token) return;
    let active = true;

    const loadAll = async () => {
      setAppLoading(true);
      try {
        const meRes = await apiRequest('/api/me', {}, token);
        const meData = (await readApiPayload(meRes)) as { user?: User; message?: string };
        if (!meRes.ok || !meData.user) throw new Error(meData.message || 'Session expired');
        if (!active) return;
        setUser(meData.user);

        const dataRes = await apiRequest('/api/data', {}, token);
        const payload = (await readApiPayload(dataRes)) as {
          contacts: Contact[];
          templates: Template[];
          settings: Partial<Settings>;
          message?: string;
        };
        if (!dataRes.ok) throw new Error(payload.message || 'Could not load saved data');
        if (!active) return;

        setContacts(Array.isArray(payload.contacts) ? payload.contacts : []);
        setTemplates(Array.isArray(payload.templates) && payload.templates.length > 0 ? mergeTemplates(payload.templates) : defaultTemplates);
        setSettings((prev) => ({
          ...prev,
          ...payload.settings,
          templateMode: payload.settings?.templateMode === 'auto-niche' ? 'auto-niche' : 'manual',
        }));
        setBootstrapped(true);
      } catch (error) {
        setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load account data' });
        localStorage.removeItem('wa-token');
        setToken(null);
        setUser(null);
      } finally {
        if (active) setAppLoading(false);
      }
    };

    loadAll();
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !bootstrapped) return;
    setSyncLabel('saving');
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest('/api/data', {
          method: 'PUT',
          body: JSON.stringify({ contacts, templates, settings }),
        }, token);
        if (!res.ok) throw new Error('Save failed');
        setSyncLabel('saved');
      } catch {
        setSyncLabel('error');
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [contacts, templates, settings, token, bootstrapped]);

  const handleAuth = async (mode: 'login' | 'signup', payload: { name: string; email: string; password: string }) => {
    setAuthLoading(true);
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const res = await apiRequest(path, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const body = await readApiPayload(res);
      if (!res.ok) {
        throw new Error(String(body.message || 'Authentication failed'));
      }
      const tokenValue = String(body.token || '');
      if (!tokenValue) throw new Error('Authentication failed');
      localStorage.setItem('wa-token', tokenValue);
      setToken(tokenValue);
      setToast({ type: 'success', message: mode === 'login' ? 'Logged in' : 'Account created' });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Authentication failed' });
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('wa-token');
    setToken(null);
    setUser(null);
    setContacts([]);
    setTemplates(defaultTemplates);
    setSettings({
      product: 'our solution',
      selectedTemplateId: defaultTemplates[0].id,
      useCustomMessage: false,
      customMessage: '',
      templateMode: 'manual',
    });
    setBootstrapped(false);
  };

  const saveContact = (data: Omit<Contact, 'id' | 'createdAt'>) => {
    if (editing) {
      setContacts((prev) => prev.map((item) => (item.id === editing.id ? { ...item, ...data } : item)));
      setToast({ type: 'success', message: 'Contact updated' });
      setEditing(null);
    } else {
      setContacts((prev) => [{ ...data, id: makeId(), createdAt: Date.now() }, ...prev]);
      setToast({ type: 'success', message: 'Contact added' });
    }
    setContactModalOpen(false);
  };

  const deleteContact = (id: string) => {
    setContacts((prev) => prev.filter((item) => item.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setToast({ type: 'success', message: 'Contact deleted' });
  };

  const deleteSelectedContacts = () => {
    if (selectedIds.size === 0) return;
    const shouldDelete = window.confirm(`Delete ${selectedIds.size} selected contacts?`);
    if (!shouldDelete) return;
    setContacts((prev) => prev.filter((item) => !selectedIds.has(item.id)));
    setSelectedIds(new Set());
    setToast({ type: 'success', message: 'Selected contacts deleted' });
  };

  const updateStatus = (id: string, status: ContactStatus) => {
    setContacts((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  const importFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      if (rows.length === 0) {
        setToast({ type: 'error', message: 'Selected file is empty' });
        return;
      }
      const { contacts: imported, warning } = importContactsFromRows(rows);
      if (imported.length === 0) {
        setToast({ type: 'error', message: 'No valid rows found in this file' });
        return;
      }

      let skipped = 0;
      setContacts((prev) => {
        const knownPhones = new Set(prev.map((item) => formatPhoneForWhatsApp(item.phone)));
        const newItems: Contact[] = [];
        for (const item of imported) {
          const key = formatPhoneForWhatsApp(item.phone);
          if (knownPhones.has(key)) {
            skipped += 1;
            continue;
          }
          knownPhones.add(key);
          newItems.push({ ...item, id: makeId(), createdAt: Date.now() });
        }
        return [...newItems, ...prev];
      });

      const importedUnique = imported.length - skipped;
      if (importedUnique <= 0) {
        setToast({ type: 'info', message: 'No new contacts imported. All phones were duplicates.' });
        return;
      }

      const parts = [`Imported ${importedUnique} contacts.`];
      if (skipped > 0) parts.push(`Skipped ${skipped} duplicate phones.`);
      if (warning) parts.push(warning);
      setToast({ type: 'success', message: parts.join(' ') });
    } catch {
      setToast({ type: 'error', message: 'Could not parse this Excel file' });
    }
  };

  const openWhatsApp = (contact: Contact) => {
    const message = messageForContact(contact);
    if (message.length > MAX_MESSAGE_LENGTH) {
      setToast({ type: 'error', message: `Message exceeds ${MAX_MESSAGE_LENGTH} characters` });
      return;
    }
    window.open(createWaLink(contact.phone, message), '_blank');
    setTimeout(() => updateStatus(contact.id, 'contacted'), 500);
  };

  const bulkOpen = async () => {
    const picked = contacts.filter((item) => selectedIds.has(item.id));
    let sent = 0;
    for (const contact of picked) {
      const message = messageForContact(contact);
      if (message.length > MAX_MESSAGE_LENGTH) continue;
      window.open(createWaLink(contact.phone, message), '_blank');
      sent += 1;
      await new Promise((resolve) => setTimeout(resolve, 450));
    }
    setToast({ type: sent > 0 ? 'success' : 'error', message: sent > 0 ? `Opened ${sent} chats` : 'No chats opened' });
  };

  const copyLink = async (contact: Contact) => {
    const message = messageForContact(contact);
    if (message.length > MAX_MESSAGE_LENGTH) {
      setToast({ type: 'error', message: `Message exceeds ${MAX_MESSAGE_LENGTH} characters` });
      return;
    }
    try {
      await navigator.clipboard.writeText(createWaLink(contact.phone, message));
      setToast({ type: 'success', message: 'Link copied' });
    } catch {
      setToast({ type: 'error', message: 'Clipboard permission blocked by browser' });
    }
  };

  if (!token) {
    return (
      <>
        <AuthView loading={authLoading} onSubmit={handleAuth} />
        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      </>
    );
  }

  if (appLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">Loading your workspace...</div>;
  }

  const messageLength = (settings.useCustomMessage ? settings.customMessage : selectedTemplate?.content || '').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:h-16 sm:py-0 sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">WhatsApp Outreach</h1>
            <p className="text-xs text-slate-500">Logged in as {user?.name || user?.email}</p>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="px-3 py-1 bg-slate-100 rounded-full text-slate-700">{contacts.length} total</span>
            <span className="px-3 py-1 bg-emerald-100 rounded-full text-emerald-700">{pendingCount} pending</span>
            <span className={`px-3 py-1 rounded-full ${syncLabel === 'saved' ? 'bg-emerald-100 text-emerald-700' : syncLabel === 'saving' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
              {syncLabel}
            </span>
            <button onClick={logout} className="px-3 py-1 border border-slate-300 rounded-lg">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 grid xl:grid-cols-5 gap-6">
        <section className="xl:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">Campaign Details</h2>
            <input
              value={settings.product}
              onChange={(e) => setSettings((prev) => ({ ...prev, product: e.target.value }))}
              placeholder="Product/Service"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">Message Composer</h2>
            <select
              value={settings.templateMode}
              onChange={(e) => setSettings((prev) => ({ ...prev, templateMode: e.target.value as TemplateMode }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="manual">Manual template selection</option>
              <option value="auto-niche">Auto-select by niche</option>
            </select>
            <select
              disabled={settings.templateMode === 'auto-niche'}
              value={settings.selectedTemplateId}
              onChange={(e) => setSettings((prev) => ({ ...prev, selectedTemplateId: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
            >
              {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={settings.useCustomMessage} onChange={(e) => setSettings((prev) => ({ ...prev, useCustomMessage: e.target.checked }))} />
              Write custom message
            </label>

            {settings.useCustomMessage ? (
              <textarea
                value={settings.customMessage}
                onChange={(e) => setSettings((prev) => ({ ...prev, customMessage: e.target.value }))}
                className="w-full h-56 px-3 py-2 border border-slate-300 rounded-lg"
              />
            ) : (
              <div className="h-56 overflow-y-auto text-sm p-3 rounded-lg bg-slate-50 border border-slate-200 whitespace-pre-wrap">
                {selectedTemplate?.content}
              </div>
            )}

            <div className="text-xs text-slate-500">{messageLength.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()} characters</div>
            <p className="text-xs text-slate-500">Placeholders: [Name], [Clinic Name], [Gym Name], [Studio Name], [Academy Name], [gym/studio/clinic], [Niche Name], {'{firstName}'}, {'{clinicName}'}, {'{nicheName}'}, {'{product}'}</p>

            <div>
              <p className="text-xs font-medium text-slate-600 mb-1">Preview</p>
              <div className="text-sm p-3 rounded-lg bg-emerald-50 border border-emerald-200 whitespace-pre-wrap">{previewMessage}</div>
            </div>
          </div>
        </section>

        <section className="xl:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
            <button onClick={() => { setEditing(null); setContactModalOpen(true); }} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">Add Contact</button>
            <label className="px-4 py-2 border border-slate-300 rounded-lg text-sm cursor-pointer">
              Import Excel
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importFile(file);
                  e.target.value = '';
                }}
              />
            </label>
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search contacts..." className="w-full sm:flex-1 sm:min-w-[220px] px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | ContactStatus)} className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option value="all">All status</option>
              <option value="pending">Pending</option>
              <option value="contacted">Contacted</option>
              <option value="no-answer">No Answer</option>
              <option value="interested">Interested</option>
            </select>
          </div>

          {selectedIds.size > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
              <span>{selectedIds.size} selected</span>
              <div className="flex gap-2">
                <button onClick={bulkOpen} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg">Open All in WhatsApp</button>
                <button onClick={deleteSelectedContacts} className="px-3 py-1.5 border border-red-300 text-red-700 rounded-lg">Delete Selected</button>
                <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 border border-slate-300 rounded-lg">Clear</button>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {filteredContacts.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No contacts yet.</div>
            ) : (
              <>
                <div className="hidden md:block divide-y divide-slate-100">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50 text-xs font-medium text-slate-500 uppercase">
                    <div className="col-span-1">
                      <input
                        type="checkbox"
                        checked={filteredContacts.length > 0 && filteredContacts.every((contact) => selectedIds.has(contact.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(new Set(filteredContacts.map((item) => item.id)));
                          } else {
                            setSelectedIds(new Set());
                          }
                        }}
                      />
                    </div>
                    <div className="col-span-4">Name</div>
                    <div className="col-span-3">Phone</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>

                  {filteredContacts.map((contact) => (
                    <div key={contact.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                      <div className="col-span-1">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(contact.id)}
                          onChange={() => {
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(contact.id)) next.delete(contact.id);
                              else next.add(contact.id);
                              return next;
                            });
                          }}
                        />
                      </div>
                      <div className="col-span-4">
                        <p className="text-sm font-medium text-slate-800">{contact.name}</p>
                        <p className="text-xs text-slate-500">{contact.clinicName || 'No business name'}{contact.nicheName ? ` | ${contact.nicheName}` : ''}</p>
                      </div>
                      <div className="col-span-3 text-sm text-slate-700">{contact.phone}</div>
                      <div className="col-span-2">
                        <select value={contact.status} onChange={(e) => updateStatus(contact.id, e.target.value as ContactStatus)} className="text-xs px-2 py-1 border border-slate-300 rounded-lg w-full max-w-32">
                          <option value="pending">Pending</option>
                          <option value="contacted">Contacted</option>
                          <option value="no-answer">No Answer</option>
                          <option value="interested">Interested</option>
                        </select>
                      </div>
                      <div className="col-span-2 flex justify-end gap-1 flex-wrap">
                        <button onClick={() => openWhatsApp(contact)} className="px-2 py-1 border border-emerald-300 text-emerald-700 rounded-lg text-xs">Open</button>
                        <button onClick={() => copyLink(contact)} className="px-2 py-1 border border-slate-300 rounded-lg text-xs">Copy</button>
                        <button onClick={() => { setEditing(contact); setContactModalOpen(true); }} className="px-2 py-1 border border-slate-300 rounded-lg text-xs">Edit</button>
                        <button onClick={() => deleteContact(contact.id)} className="px-2 py-1 border border-red-300 text-red-700 rounded-lg text-xs">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="md:hidden divide-y divide-slate-100">
                  <div className="px-4 py-2 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
                    <span>Select all</span>
                    <input
                      type="checkbox"
                      checked={filteredContacts.length > 0 && filteredContacts.every((contact) => selectedIds.has(contact.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(filteredContacts.map((item) => item.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                    />
                  </div>
                  {filteredContacts.map((contact) => (
                    <div key={contact.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{contact.name}</p>
                          <p className="text-xs text-slate-500">{contact.clinicName || 'No business name'}{contact.nicheName ? ` | ${contact.nicheName}` : ''}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(contact.id)}
                          onChange={() => {
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(contact.id)) next.delete(contact.id);
                              else next.add(contact.id);
                              return next;
                            });
                          }}
                        />
                      </div>
                      <p className="text-sm text-slate-700">{contact.phone}</p>
                      <select value={contact.status} onChange={(e) => updateStatus(contact.id, e.target.value as ContactStatus)} className="text-xs px-2 py-1 border border-slate-300 rounded-lg w-full">
                        <option value="pending">Pending</option>
                        <option value="contacted">Contacted</option>
                        <option value="no-answer">No Answer</option>
                        <option value="interested">Interested</option>
                      </select>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => openWhatsApp(contact)} className="px-2 py-1 border border-emerald-300 text-emerald-700 rounded-lg text-xs">Open</button>
                        <button onClick={() => copyLink(contact)} className="px-2 py-1 border border-slate-300 rounded-lg text-xs">Copy</button>
                        <button onClick={() => { setEditing(contact); setContactModalOpen(true); }} className="px-2 py-1 border border-slate-300 rounded-lg text-xs">Edit</button>
                        <button onClick={() => deleteContact(contact.id)} className="px-2 py-1 border border-red-300 text-red-700 rounded-lg text-xs">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <ContactModal
        open={contactModalOpen}
        editing={editing}
        onClose={() => {
          setContactModalOpen(false);
          setEditing(null);
        }}
        onSave={saveContact}
      />
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}