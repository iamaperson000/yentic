'use client';

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type JSX,
} from 'react';

type PulseStatus = 'blocked' | 'in-progress' | 'shipped';

type PulseItem = {
  id: string;
  title: string;
  status: PulseStatus;
  owner: string | null;
  updatedAt: number;
};

const displayNameKey = 'yentic.dev-test.display-name';
const storageKey = 'yentic.dev-test.pulseboard';

const statusLabel: Record<PulseStatus, string> = {
  blocked: 'Blocked',
  'in-progress': 'In Progress',
  shipped: 'Shipped',
};

const statusToneMap: Record<PulseStatus, string> = {
  blocked: 'bg-rose-500/20 text-rose-200 ring-rose-400/40',
  'in-progress': 'bg-sky-500/20 text-sky-200 ring-sky-400/40',
  shipped: 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/40',
};

const statusDotMap: Record<PulseStatus, string> = {
  blocked: 'bg-rose-400',
  'in-progress': 'bg-sky-400',
  shipped: 'bg-emerald-400',
};

function isPulseStatus(value: unknown): value is PulseStatus {
  return value === 'blocked' || value === 'in-progress' || value === 'shipped';
}

function generateId(prefix: string): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}_${crypto.randomUUID()}`;
    }
  } catch {
    // Ignore and fall back to Math.random.
  }
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function relativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const minutes = Math.round(diff / 60000);
  if (minutes <= 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function statusTone(status: PulseStatus): string {
  return statusToneMap[status] ?? statusToneMap['in-progress'];
}

function statusDot(status: PulseStatus): string {
  return statusDotMap[status] ?? statusDotMap['in-progress'];
}

function buildInitialItems(): PulseItem[] {
  const now = Date.now();
  return [
    {
      id: generateId('pulse'),
      title: 'Architect service boundaries',
      status: 'in-progress',
      owner: 'Jess',
      updatedAt: now - 1000 * 60 * 3,
    },
    {
      id: generateId('pulse'),
      title: 'Wire realtime dashboards',
      status: 'blocked',
      owner: 'Taylor',
      updatedAt: now - 1000 * 60 * 7,
    },
    {
      id: generateId('pulse'),
      title: 'Polish onboarding tour',
      status: 'shipped',
      owner: 'Sam',
      updatedAt: now - 1000 * 60 * 12,
    },
    {
      id: generateId('pulse'),
      title: 'Benchmark production replicas',
      status: 'in-progress',
      owner: 'Dev',
      updatedAt: now - 1000 * 60 * 18,
    },
  ];
}

function parseStoredItems(serialized: string | null): PulseItem[] | null {
  if (!serialized) {
    return null;
  }

  try {
    const data: unknown = JSON.parse(serialized);
    if (!Array.isArray(data)) {
      return null;
    }

    if (data.length === 0) {
      return [];
    }

    const result: PulseItem[] = data.map(item => {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof (item as { id?: unknown }).id !== 'string' ||
        typeof (item as { title?: unknown }).title !== 'string' ||
        !isPulseStatus((item as { status?: unknown }).status) ||
        typeof (item as { updatedAt?: unknown }).updatedAt !== 'number'
      ) {
        throw new Error('Invalid pulse item');
      }

      const owner = (item as { owner?: unknown }).owner;

      return {
        id: (item as { id: string }).id,
        title: (item as { title: string }).title,
        status: (item as { status: PulseStatus }).status,
        owner: typeof owner === 'string' && owner.trim().length > 0 ? owner : null,
        updatedAt: (item as { updatedAt: number }).updatedAt,
      };
    });

    return result;
  } catch {
    return null;
  }
}

export default function DevTestPage(): JSX.Element {
  const [items, setItems] = useState<PulseItem[]>([]);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftStatus, setDraftStatus] = useState<PulseStatus>('in-progress');
  const [displayName, setDisplayName] = useState<string>('');
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setItems(buildInitialItems());
      return;
    }

    const stored = parseStoredItems(window.localStorage.getItem(storageKey));
    setItems(stored ?? buildInitialItems());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const stored = window.localStorage.getItem(displayNameKey);
    if (stored) {
      setDisplayName(stored);
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // Ignore persistence errors (e.g. storage disabled).
    }
  }, [items]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => b.updatedAt - a.updatedAt),
    [items],
  );

  const handleDisplayNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setDisplayName(value);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(displayNameKey, value);
        } catch {
          // Ignore storage errors.
        }
      }
    },
    [],
  );

  const resetForm = useCallback(() => {
    setDraftTitle('');
    setDraftStatus('in-progress');
  }, []);

  const handleCreate = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const normalized = draftTitle.trim();
      if (normalized.length === 0) {
        return;
      }

      const owner = displayName.trim();
      const item: PulseItem = {
        id: generateId('pulse'),
        title: normalized,
        status: draftStatus,
        owner: owner.length > 0 ? owner : null,
        updatedAt: Date.now(),
      };

      setItems(previous => [...previous, item]);
      resetForm();
    },
    [displayName, draftStatus, draftTitle, resetForm],
  );

  const updateStatus = useCallback(
    (itemId: string, status: PulseStatus) => {
      const owner = displayName.trim();
      const nextOwner = owner.length > 0 ? owner : null;

      setItems(previous =>
        previous.map(item => {
          if (item.id !== itemId) {
            return item;
          }

          if (item.status === status && (item.owner ?? null) === nextOwner) {
            return item;
          }

          return {
            ...item,
            status,
            owner: nextOwner,
            updatedAt: Date.now(),
          };
        }),
      );
    },
    [displayName],
  );

  const connectionLabel = 'local-only';
  const connectionBadge = 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/50';
  const normalizedDisplayName = displayName.trim();

  return (
    <div className="flex min-h-screen flex-col gap-10 bg-[#05070B] px-6 pb-16 pt-14 text-white sm:px-10">
      <header className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/60">Local Lab</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Pulseboard command center</h1>
            <p className="mt-3 max-w-2xl text-sm text-white/60">
              An interactive status wall that saves straight to your browser. No websockets, no background services—everything
              stays local to this session.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.35em] ring-1 ring-inset transition ${connectionBadge}`}
            >
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-current" />
              {connectionLabel}
            </span>
          </div>
        </div>

        <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-emerald-500/10 sm:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60" htmlFor="display-name">
              Your handle
            </label>
            <input
              id="display-name"
              value={displayName}
              onChange={handleDisplayNameChange}
              placeholder="Let the session know who is adjusting the dials"
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300 focus:bg-black/60"
              maxLength={80}
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">Active peers</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-white/40">
                Local session only
              </span>
              {normalizedDisplayName.length > 0 ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-white/80">
                  {normalizedDisplayName}
                </span>
              ) : (
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-white/40">
                  Set a handle to tag updates
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-emerald-500/10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">Add a pulse</p>
            <h2 className="mt-2 text-xl font-semibold">Push a new track to the board</h2>
          </div>
          <form onSubmit={handleCreate} className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center">
            <input
              value={draftTitle}
              onChange={event => setDraftTitle(event.target.value)}
              placeholder="Ship local notifications"
              className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300 focus:bg-black/60"
              maxLength={160}
            />
            <select
              value={draftStatus}
              onChange={event => setDraftStatus(event.target.value as PulseStatus)}
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300 focus:bg-black/60"
            >
              <option value="in-progress">In progress</option>
              <option value="blocked">Blocked</option>
              <option value="shipped">Shipped</option>
            </select>
            <button
              type="submit"
              className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/30"
              disabled={draftTitle.trim().length === 0}
            >
              Broadcast
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedItems.map(item => (
          <article
            key={item.id}
            className="group flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/40 p-6 text-sm text-white shadow-lg shadow-black/40 transition hover:border-emerald-300/60 hover:shadow-emerald-400/20"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white/90">{item.title}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.35em] text-white/40">Last update {relativeTime(item.updatedAt)}</p>
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.35em] ring-1 ring-inset ${statusTone(item.status)}`}
              >
                <span className={`inline-flex h-2 w-2 rounded-full ${statusDot(item.status)}`} />
                {statusLabel[item.status]}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.35em] text-white/70">
                {item.owner ?? 'Unclaimed'}
              </span>
              <span className="text-[11px] uppercase tracking-[0.35em] text-white/40">•</span>
              <span className="text-[11px] uppercase tracking-[0.35em] text-white/50">{item.id.slice(-6)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['in-progress', 'blocked', 'shipped'] as PulseStatus[]).map(status => (
                <button
                  key={`${item.id}-${status}`}
                  type="button"
                  onClick={() => updateStatus(item.id, status)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] transition ${
                    item.status === status
                      ? 'bg-white text-black'
                      : 'border border-white/15 text-white/70 hover:border-emerald-300/60 hover:text-emerald-200'
                  }`}
                >
                  {statusLabel[status]}
                </button>
              ))}
            </div>
          </article>
        ))}
        {sortedItems.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-10 text-center text-sm text-white/50">
            Waiting for the first broadcast…
          </div>
        )}
      </section>
    </div>
  );
}
