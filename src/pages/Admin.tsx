import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { API_BASE_URL } from '../config/api';

/* ------------------------- storage keys ------------------------- */
const LS_ORG = 'cl_org_v1';
const LS_USERS = 'cl_users_v1';
const LS_FLAGS = 'cl_flags_v1';
const LS_RUNTIME = 'cl_runtime_v1';
const LS_EMISSIONS = 'emissions_v1';
const LS_FACTORS = 'factors_v1';

/* --------------------------- types ------------------------------ */
type OrgSettings = {
  orgId: string;
  name: string;
  logoUrl?: string;
  timezone?: string;
  currency?: string;
  fyStartMonth: number; // 1..12
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Analyst' | 'Viewer';
  active: boolean;
  createdAt: string;
};

type Flags = {
  useMockApi: boolean;
  enableAdvancedAnalysis: boolean;
  enableExportPdf: boolean;
  enableAuditLog: boolean;
  darkMode: boolean;
};

type RuntimeConfig = {
  apiBaseUrl: string;
  useMockApi: boolean;
};

/* --------------------------- defaults --------------------------- */
const defaultOrg = (): OrgSettings => ({
  orgId: uid(),
  name: 'My Organization',
  logoUrl: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  currency: 'CAD',
  fyStartMonth: 1,
});

const defaultUsers = (): UserRow[] => [
  {
    id: uid(),
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'Admin',
    active: true,
    createdAt: new Date().toISOString(),
  },
];

const defaultFlags: Flags = {
  useMockApi: false,
  enableAdvancedAnalysis: false,
  enableExportPdf: true,
  enableAuditLog: false,
  darkMode: false,
};

const defaultRuntime: RuntimeConfig = {
  apiBaseUrl: API_BASE_URL,
  useMockApi: false,
};

/* --------------------------- helpers ---------------------------- */
function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function saveLS<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function fmtDateTime(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/* ----------------------------- UI ------------------------------ */
type TabKey = 'org' | 'users' | 'flags' | 'data' | 'system';

export default function Admin() {
  const [tab, setTab] = useState<TabKey>('org');

  // load all state from LS
  const [org, setOrg] = useState<OrgSettings>(() => loadLS(LS_ORG, defaultOrg()));
  const [users, setUsers] = useState<UserRow[]>(() => loadLS(LS_USERS, defaultUsers()));
  const [flags, setFlags] = useState<Flags>(() => loadLS(LS_FLAGS, defaultFlags));
  const [runtime, setRuntime] = useState<RuntimeConfig>(() =>
    loadLS(LS_RUNTIME, defaultRuntime)
  );

  useEffect(() => saveLS(LS_ORG, org), [org]);
  useEffect(() => saveLS(LS_USERS, users), [users]);
  useEffect(() => {
    saveLS(LS_FLAGS, flags);
    // optional dark mode application (demo)
    document.documentElement.dataset.theme = flags.darkMode ? 'dark' : 'light';
  }, [flags]);
  useEffect(() => saveLS(LS_RUNTIME, runtime), [runtime]);

  // counts for data mgmt cards
  const emissionsCount = useMemo(() => {
    try {
      const raw = localStorage.getItem(LS_EMISSIONS);
      const arr = raw ? (JSON.parse(raw) as any[]) : [];
      return arr.length || 0;
    } catch {
      return 0;
    }
  }, []);
  const factorsCount = useMemo(() => {
    try {
      const raw = localStorage.getItem(LS_FACTORS);
      const arr = raw ? (JSON.parse(raw) as any[]) : [];
      return arr.length || 0;
    } catch {
      return 0;
    }
  }, []);

  return (
    <>
      <h2>Admin</h2>

      <div className="card" style={{ marginBottom: 12 }}>
        <TabNav active={tab} onChange={setTab} />
      </div>

      {tab === 'org' && <OrgTab org={org} onChange={setOrg} />}
      {tab === 'users' && <UsersTab users={users} onChange={setUsers} />}
      {tab === 'flags' && <FlagsTab flags={flags} onChange={setFlags} />}
      {tab === 'data' && (
        <DataTab
          emissionsCount={emissionsCount}
          factorsCount={factorsCount}
        />
      )}
      {tab === 'system' && <SystemTab runtime={runtime} onChange={setRuntime} />}
    </>
  );
}

/* -------------------------- Tabs / Nav -------------------------- */
function TabNav({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'org', label: 'Organization' },
    { key: 'users', label: 'Users & Roles' },
    { key: 'flags', label: 'Feature Flags' },
    { key: 'data', label: 'Data Management' },
    { key: 'system', label: 'System' },
  ];
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className="tab"
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
            background: active === t.key ? '#eef2ff' : '#fff',
            color: active === t.key ? '#1b4ad1' : '#111',
            fontWeight: active === t.key ? 600 : 500,
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* --------------------------- Org Tab ---------------------------- */
const orgSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  logoUrl: z.string().url().optional().or(z.literal('')),
  timezone: z.string().optional(),
  currency: z.string().min(1).default('CAD'),
  fyStartMonth: z.number().int().min(1).max(12),
});
type OrgForm = z.infer<typeof orgSchema>;

function OrgTab({ org, onChange }: { org: OrgSettings; onChange: (o: OrgSettings) => void }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<OrgForm>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: org.name,
      logoUrl: org.logoUrl || '',
      timezone: org.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      currency: org.currency || 'CAD',
      fyStartMonth: org.fyStartMonth,
    },
  });

  useEffect(() => {
    reset({
      name: org.name,
      logoUrl: org.logoUrl || '',
      timezone: org.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      currency: org.currency || 'CAD',
      fyStartMonth: org.fyStartMonth,
    });
  }, [org, reset]);

  const onSubmit = (v: OrgForm) => {
    onChange({ ...org, ...v, logoUrl: v.logoUrl || undefined });
    alert('Organization settings saved.');
  };

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h3 style={{ marginTop: 0 }}>Organization Settings</h3>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <label>
            <div>Organization Name</div>
            <input {...register('name')} placeholder="Company Inc." />
            <Err e={errors.name?.message} />
          </label>
          <label>
            <div>Org ID</div>
            <input value={org.orgId} disabled />
          </label>
          <label>
            <div>Logo URL</div>
            <input {...register('logoUrl')} placeholder="https://…" />
            <Err e={errors.logoUrl?.message} />
          </label>
          <label>
            <div>Timezone</div>
            <input {...register('timezone')} placeholder="America/Edmonton" />
          </label>
          <label>
            <div>Currency</div>
            <input {...register('currency')} placeholder="CAD" />
            <Err e={errors.currency?.message} />
          </label>
          <label>
            <div>Fiscal Year Start (month)</div>
            <input type="number" min={1} max={12} {...register('fyStartMonth', { valueAsNumber: true })} />
            <Err e={errors.fyStartMonth?.message} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit">Save</button>
          <button type="button" onClick={() => onChange(defaultOrg())}>Reset to Default</button>
        </div>
      </form>
    </div>
  );
}

/* -------------------------- Users Tab --------------------------- */
const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['Admin', 'Analyst', 'Viewer']),
  active: z.boolean(),
});
type UserForm = z.infer<typeof userSchema>;

function UsersTab({ users, onChange }: { users: UserRow[]; onChange: (u: UserRow[]) => void }) {
  const [mode, setMode] = useState<{ kind: 'idle' } | { kind: 'create' } | { kind: 'edit'; row: UserRow }>({ kind: 'idle' });

  const startCreate = () => setMode({ kind: 'create' });
  const startEdit = (row: UserRow) => setMode({ kind: 'edit', row });

  const onDelete = (id: string) => {
    if (!window.confirm('Delete this user?')) return;
    onChange(users.filter(u => u.id !== id));
  };

  return (
    <>
      {mode.kind === 'idle' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h3 style={{ marginTop: 0, marginBottom: 12, flex: 1 }}>Users & Roles</h3>
            <button onClick={startCreate}>+ Add User</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <Td>{u.name}</Td>
                    <Td>{u.email}</Td>
                    <Td>{u.role}</Td>
                    <Td>{u.active ? 'Active' : 'Inactive'}</Td>
                    <Td>{fmtDateTime(u.createdAt)}</Td>
                    <Td style={{ whiteSpace: 'nowrap' }}>
                      <button onClick={() => startEdit(u)}>Edit</button>{' '}
                      <button onClick={() => onDelete(u.id)}>Delete</button>
                    </Td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><Td colSpan={6} style={{ color: '#666', textAlign: 'center' }}>No users yet.</Td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mode.kind !== 'idle' && (
        <div className="card" style={{ maxWidth: 720 }}>
          <h3 style={{ marginTop: 0 }}>{mode.kind === 'create' ? 'Add User' : 'Edit User'}</h3>
          <UserEditor
            initial={mode.kind === 'edit' ? mode.row : undefined}
            onCancel={() => setMode({ kind: 'idle' })}
            onSubmit={(v) => {
              if (mode.kind === 'create') {
                const next: UserRow = {
                  id: uid(),
                  createdAt: new Date().toISOString(),
                  ...v,
                };
                onChange([next, ...users]);
              } else {
                onChange(users.map(u => u.id === mode.row.id ? { ...u, ...v } : u));
              }
              setMode({ kind: 'idle' });
            }}
          />
        </div>
      )}
    </>
  );
}

function UserEditor({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<UserRow>;
  onSubmit: (values: UserForm) => void | Promise<void>;
  onCancel: () => void;
}) {
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: initial
      ? {
          name: initial.name || '',
          email: initial.email || '',
          role: (initial.role as any) || 'Viewer',
          active: initial.active ?? true,
        }
      : { role: 'Viewer', active: true } as any,
  });

  useEffect(() => {
    if (!initial) return;
    setValue('name', initial.name || '');
    setValue('email', initial.email || '');
    setValue('role', (initial.role as any) || 'Viewer');
    setValue('active', initial.active ?? true);
  }, [initial, setValue]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}
    >
      <label>
        <div>Name</div>
        <input {...register('name')} />
        <Err e={errors.name?.message} />
      </label>
      <label>
        <div>Email</div>
        <input type="email" {...register('email')} />
        <Err e={errors.email?.message} />
      </label>
      <label>
        <div>Role</div>
        <select {...register('role')}>
          <option>Admin</option>
          <option>Analyst</option>
          <option>Viewer</option>
        </select>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" {...register('active')} /> Active
      </label>
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
        <button type="submit">Save</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/* -------------------------- Flags Tab --------------------------- */
function FlagsTab({ flags, onChange }: { flags: Flags; onChange: (f: Flags) => void }) {
  const set = (k: keyof Flags) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...flags, [k]: e.target.checked });

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h3 style={{ marginTop: 0 }}>Feature Flags</h3>
      <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0, display: 'grid', gap: 10 }}>
        <li><label><input type="checkbox" checked={flags.useMockApi} onChange={set('useMockApi')} /> Use Mock API (frontend only)</label></li>
        <li><label><input type="checkbox" checked={flags.enableAdvancedAnalysis} onChange={set('enableAdvancedAnalysis')} /> Enable Advanced Analysis</label></li>
        <li><label><input type="checkbox" checked={flags.enableExportPdf} onChange={set('enableExportPdf')} /> Enable Report PDF Export</label></li>
        <li><label><input type="checkbox" checked={flags.enableAuditLog} onChange={set('enableAuditLog')} /> Enable Audit Log</label></li>
        <li><label><input type="checkbox" checked={flags.darkMode} onChange={set('darkMode')} /> Dark Mode (demo)</label></li>
      </ul>
      <small style={{ color: '#666' }}>These are saved to localStorage ({LS_FLAGS}) and can be read by your app at runtime.</small>
    </div>
  );
}

/* ------------------------ Data Management ----------------------- */
function DataTab({ emissionsCount, factorsCount }: { emissionsCount: number; factorsCount: number }) {
  const exportJson = (key: string, filename: string) => {
    const raw = localStorage.getItem(key) ?? '[]';
    download(filename, raw, 'application/json;charset=utf-8');
  };

  const importJson = async (key: string) => {
    const file = await pickFile('.json');
    if (!file) return;
    const text = await file.text();
    try {
      JSON.parse(text); // validate shape loosely
      localStorage.setItem(key, text);
      alert('Import successful.');
      window.location.reload();
    } catch {
      alert('Invalid JSON.');
    }
  };

  const clearData = (key: string, label: string) => {
    if (!window.confirm(`Clear ${label}? This cannot be undone.`)) return;
    localStorage.removeItem(key);
    alert('Cleared.');
    window.location.reload();
  };

  return (
    <div className="grid">
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Emissions Data</h3>
        <p>Records: <strong>{emissionsCount}</strong></p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => exportJson(LS_EMISSIONS, 'emissions.json')} disabled={!emissionsCount}>Export JSON</button>
          <button onClick={() => importJson(LS_EMISSIONS)}>Import JSON</button>
          <button onClick={() => clearData(LS_EMISSIONS, 'Emissions')}>Clear</button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Factors Data</h3>
        <p>Records: <strong>{factorsCount}</strong></p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => exportJson(LS_FACTORS, 'factors.json')} disabled={!factorsCount}>Export JSON</button>
          <button onClick={() => importJson(LS_FACTORS)}>Import JSON</button>
          <button onClick={() => clearData(LS_FACTORS, 'Factors')}>Clear</button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- System Tab ------------------------- */
const runtimeSchema = z.object({
  apiBaseUrl: z.string().min(1),
  useMockApi: z.boolean(),
});
type RuntimeForm = z.infer<typeof runtimeSchema>;

function SystemTab({ runtime, onChange }: { runtime: RuntimeConfig; onChange: (r: RuntimeConfig) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<RuntimeForm>({
    resolver: zodResolver(runtimeSchema),
    defaultValues: runtime,
  });

  const onSubmit = (v: RuntimeForm) => {
    onChange(v);
    alert('Runtime config saved to localStorage.');
  };

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h3 style={{ marginTop: 0 }}>System</h3>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gap: 12 }}>
        <label>
          <div>API Base URL</div>
          <input placeholder="/api" {...register('apiBaseUrl')} />
          <Err e={errors.apiBaseUrl?.message} />
          <small style={{ color: '#666' }}>
            Tip: You can read this in your axios client at runtime from <code>localStorage["{LS_RUNTIME}"]</code>.
          </small>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" {...register('useMockApi')} /> Use Mock API (frontend only)
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit">Save</button>
          <button
            type="button"
            onClick={() => onChange(defaultRuntime)}
          >
            Reset to Default
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------------------- tiny helpers/components ----------------- */
function Err({ e }: { e?: string }) {
  if (!e) return null;
  return <div style={{ color: '#c91919', fontSize: 12 }}>{e}</div>;
}

function Th(props: any) {
  return (
    <th
      {...props}
      style={{
        textAlign: 'left',
        borderBottom: '1px solid #eee',
        padding: 6,
        ...(props.style || {}),
      }}
    />
  );
}

function Td(props: any) {
  return (
    <td
      {...props}
      style={{
        borderBottom: '1px solid #f2f2f2',
        padding: 6,
        verticalAlign: 'top',
        ...(props.style || {}),
      }}
    />
  );
}

function download(filename: string, contents: string, mime = 'application/octet-stream') {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function pickFile(accept = '*/*'): Promise<File | null> {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = accept;
    inp.onchange = () => resolve(inp.files?.[0] ?? null);
    inp.click();
  });
}
