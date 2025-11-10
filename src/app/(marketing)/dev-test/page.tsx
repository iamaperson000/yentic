'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

type CollaborationMessage =
  | { type: 'update'; update: string; clientId?: string }
  | { type: 'presence'; clients: Array<{ clientId: string }> };

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

type Task = {
  id: string;
  text: string;
  completed: boolean;
  author: string | null;
  createdAt: number;
};

type TaskOperation =
  | { type: 'create'; task: Task }
  | { type: 'set-text'; id: string; text: string }
  | { type: 'set-completed'; id: string; completed: boolean }
  | { type: 'remove'; id: string }
  | { type: 'clear' };

type OperationEnvelope = {
  kind: 'op';
  opId: string;
  version: number | null;
  op: TaskOperation;
};

type SnapshotEnvelope = {
  kind: 'snapshot';
  version: number;
  tasks: Task[];
};

type CollaborationEnvelope = OperationEnvelope | SnapshotEnvelope;

type PostOptions = {
  keepalive?: boolean;
  preferBeacon?: boolean;
  allowDuringDispose?: boolean;
};

function generateClientId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  return `client-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function createOperationId(clientId: string): string {
  return `${clientId}:op:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
}

function createTaskId(clientId: string): string {
  return `${clientId}:task:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

function colorForClient(clientId: string): string {
  let hash = 0;
  for (let index = 0; index < clientId.length; index += 1) {
    hash = (hash << 5) - hash + clientId.charCodeAt(index);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}deg 65% 60%)`;
}

function serializeTask(task: Task): Task {
  return {
    id: task.id,
    text: task.text,
    completed: task.completed,
    author: task.author ?? null,
    createdAt: task.createdAt,
  };
}

function sanitizeTask(raw: unknown): Task | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const { id, text, completed, author, createdAt } = raw as Partial<Task> & {
    id?: unknown;
    text?: unknown;
    completed?: unknown;
    author?: unknown;
    createdAt?: unknown;
  };

  if (typeof id !== 'string' || id.trim().length === 0) {
    return null;
  }
  if (typeof text !== 'string') {
    return null;
  }
  const sanitizedText = text.length > 2000 ? text.slice(0, 2000) : text;
  if (typeof completed !== 'boolean') {
    return null;
  }
  const numericCreatedAt = typeof createdAt === 'number' && Number.isFinite(createdAt) ? createdAt : Date.now();
  const normalizedAuthor =
    typeof author === 'string'
      ? author.slice(0, 120)
      : author === null || typeof author === 'undefined'
        ? null
        : null;

  return {
    id,
    text: sanitizedText,
    completed,
    author: normalizedAuthor,
    createdAt: numericCreatedAt,
  };
}

function sanitizeOperation(raw: unknown): TaskOperation | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const { type } = raw as { type?: unknown };
  if (type === 'create') {
    const task = sanitizeTask((raw as { task?: unknown }).task);
    if (!task) {
      return null;
    }
    return { type: 'create', task };
  }
  if (type === 'set-text') {
    const id = (raw as { id?: unknown }).id;
    const text = (raw as { text?: unknown }).text;
    if (typeof id !== 'string' || id.trim().length === 0 || typeof text !== 'string') {
      return null;
    }
    const normalized = text.length > 2000 ? text.slice(0, 2000) : text;
    return { type: 'set-text', id, text: normalized };
  }
  if (type === 'set-completed') {
    const id = (raw as { id?: unknown }).id;
    const completed = (raw as { completed?: unknown }).completed;
    if (typeof id !== 'string' || id.trim().length === 0 || typeof completed !== 'boolean') {
      return null;
    }
    return { type: 'set-completed', id, completed };
  }
  if (type === 'remove') {
    const id = (raw as { id?: unknown }).id;
    if (typeof id !== 'string' || id.trim().length === 0) {
      return null;
    }
    return { type: 'remove', id };
  }
  if (type === 'clear') {
    return { type: 'clear' };
  }
  return null;
}

function serializeOperation(operation: TaskOperation): TaskOperation {
  switch (operation.type) {
    case 'create':
      return { type: 'create', task: serializeTask(operation.task) };
    case 'set-text':
      return { type: 'set-text', id: operation.id, text: operation.text };
    case 'set-completed':
      return { type: 'set-completed', id: operation.id, completed: operation.completed };
    case 'remove':
      return { type: 'remove', id: operation.id };
    case 'clear':
      return { type: 'clear' };
    default:
      return operation;
  }
}

function deserializeCollaborationEnvelope(raw: string): CollaborationEnvelope | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error('[Dev Test] Failed to parse collaboration payload:', error);
    return null;
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const { kind } = parsed as { kind?: unknown };
  if (kind === 'snapshot') {
    const version = (parsed as { version?: unknown }).version;
    if (typeof version !== 'number' || !Number.isFinite(version)) {
      return null;
    }
    const tasksRaw = (parsed as { tasks?: unknown }).tasks;
    if (!Array.isArray(tasksRaw)) {
      return null;
    }
    const tasks: Task[] = [];
    tasksRaw.forEach(item => {
      const task = sanitizeTask(item);
      if (task) {
        tasks.push(task);
      }
    });
    tasks.sort((a, b) => a.createdAt - b.createdAt);
    return { kind: 'snapshot', version, tasks };
  }

  if (kind === 'op') {
    const opId = (parsed as { opId?: unknown }).opId;
    const version = (parsed as { version?: unknown }).version;
    const op = sanitizeOperation((parsed as { op?: unknown }).op);
    if (typeof opId !== 'string' || opId.trim().length === 0 || !op) {
      return null;
    }
    const normalizedVersion = typeof version === 'number' && Number.isFinite(version) ? version : null;
    return { kind: 'op', opId, version: normalizedVersion, op };
  }

  return null;
}

function reduceOperation(state: Task[], operation: TaskOperation): Task[] {
  switch (operation.type) {
    case 'create': {
      const next = state.some(item => item.id === operation.task.id)
        ? state.map(item => (item.id === operation.task.id ? { ...item, ...operation.task } : item))
        : [...state, operation.task];
      return next.slice().sort((a, b) => a.createdAt - b.createdAt);
    }
    case 'set-text': {
      return state.map(item => (item.id === operation.id ? { ...item, text: operation.text } : item));
    }
    case 'set-completed': {
      return state.map(item =>
        item.id === operation.id ? { ...item, completed: operation.completed } : item,
      );
    }
    case 'remove': {
      return state.filter(item => item.id !== operation.id);
    }
    case 'clear': {
      if (state.length === 0) {
        return state;
      }
      return [];
    }
    default:
      return state;
  }
}

function formatTimestamp(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function DevTestPage() {
  const clientIdRef = useRef<string>(generateClientId());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [peerCount, setPeerCount] = useState(1);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [displayName, setDisplayName] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    try {
      return window.localStorage.getItem('yentic.dev-test.displayName') ?? '';
    } catch {
      return '';
    }
  });

  const tasksRef = useRef<Task[]>(tasks);
  const hasShareableStateRef = useRef<boolean>(tasks.length > 0);
  const versionRef = useRef<number>(0);
  const seenOperationsRef = useRef<Set<string>>(new Set());
  const knownPeersRef = useRef<Set<string>>(new Set());
  const connectedRef = useRef<boolean>(false);
  const statusGuardRef = useRef({ mounted: true });
  const displayNameRef = useRef<string>(displayName.trim());
  const pendingLocalUpdatesRef = useRef<Array<{ serialized: string; options?: PostOptions }>>([]);
  const sendUpdateRef = useRef<(serialized: string, options?: PostOptions) => void>((serialized, options) => {
    pendingLocalUpdatesRef.current.push({ serialized, options });
  });
  const sendPresenceRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    tasksRef.current = tasks;
    hasShareableStateRef.current = tasks.length > 0;
  }, [tasks]);

  useEffect(() => {
    displayNameRef.current = displayName.trim();
    if (typeof window !== 'undefined') {
      try {
        if (displayNameRef.current.length > 0) {
          window.localStorage.setItem('yentic.dev-test.displayName', displayNameRef.current);
        } else {
          window.localStorage.removeItem('yentic.dev-test.displayName');
        }
      } catch {
        // ignore localStorage errors
      }
    }
    if (sendPresenceRef.current) {
      sendPresenceRef.current();
    }
  }, [displayName]);

  const statusLabel = useMemo(() => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Reconnecting…';
      default:
        return 'Connecting…';
    }
  }, [connectionStatus]);

  const applyTaskOperation = useCallback(
    (operation: TaskOperation) => {
      const next = reduceOperation(tasksRef.current, operation);
      tasksRef.current = next;
      hasShareableStateRef.current = next.length > 0;
      setTasks(next);
    },
    [setTasks],
  );

  const applySnapshot = useCallback(
    (taskList: Task[], version: number) => {
      versionRef.current = version;
      tasksRef.current = taskList;
      hasShareableStateRef.current = taskList.length > 0;
      setTasks(taskList);
    },
    [setTasks],
  );

  const sendTaskOperation = useCallback(
    (operation: TaskOperation) => {
      const opId = createOperationId(clientIdRef.current);
      seenOperationsRef.current.add(opId);
      const nextVersion = versionRef.current + 1;
      versionRef.current = nextVersion;
      applyTaskOperation(operation);
      try {
        const envelope: OperationEnvelope = {
          kind: 'op',
          opId,
          version: nextVersion,
          op: serializeOperation(operation),
        };
        const serialized = JSON.stringify(envelope);
        sendUpdateRef.current(serialized);
      } catch (error) {
        console.error('[Dev Test] Failed to serialize operation:', error);
      }
    },
    [applyTaskOperation],
  );

  const broadcastSnapshot = useCallback(
    (options?: PostOptions) => {
      if (!hasShareableStateRef.current) {
        return;
      }
      try {
        const envelope: SnapshotEnvelope = {
          kind: 'snapshot',
          version: versionRef.current,
          tasks: tasksRef.current.map(task => serializeTask(task)),
        };
        const serialized = JSON.stringify(envelope);
        sendUpdateRef.current(serialized, options);
      } catch (error) {
        console.error('[Dev Test] Failed to serialize snapshot:', error);
      }
    },
    [],
  );

  useEffect(() => {
    statusGuardRef.current.mounted = true;
    const endpoint = '/api/projects/dev-test/collaboration';
    const pendingRequests: Array<{ body: string; keepalive: boolean; attempt: number; allowDuringDispose?: boolean }> = [];
    let sendingRequest = false;
    let eventSource: EventSource | null = null;
    let disposed = false;
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
    let presenceInterval: number | null = null;

    const safeSetStatus = (status: ConnectionStatus) => {
      if (statusGuardRef.current.mounted) {
        setConnectionStatus(status);
      }
    };

    const safeSetPeerCount = (count: number) => {
      if (statusGuardRef.current.mounted) {
        setPeerCount(Math.max(1, count));
      }
    };

    const processPendingRequests = () => {
      if (sendingRequest || pendingRequests.length === 0) {
        return;
      }
      const next = pendingRequests.shift();
      if (!next) {
        return;
      }
      sendingRequest = true;
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: next.body,
        keepalive: next.keepalive,
      })
        .then(() => {
          sendingRequest = false;
          processPendingRequests();
        })
        .catch(error => {
          console.error('[Dev Test] Failed to post collaboration payload:', error);
          sendingRequest = false;
          if (!disposed && typeof window !== 'undefined' && next.attempt < 3) {
            const delay = Math.min(600 * 2 ** next.attempt, 5000);
            window.setTimeout(() => {
              pendingRequests.unshift({
                body: next.body,
                keepalive: next.keepalive,
                attempt: next.attempt + 1,
                allowDuringDispose: next.allowDuringDispose,
              });
              processPendingRequests();
            }, delay);
          }
          processPendingRequests();
        });
    };

    const postCollaboration = (
      payload: { type: 'update'; update: string } | { type: 'presence'; presence: unknown },
      options?: PostOptions,
    ) => {
      if (disposed && !options?.allowDuringDispose) {
        return;
      }
      const bodyObject =
        payload.type === 'update'
          ? { type: 'update', update: payload.update, clientId: clientIdRef.current }
          : { type: 'presence', presence: payload.presence, clientId: clientIdRef.current };
      const body = JSON.stringify(bodyObject);

      if (payload.type === 'presence' && options?.preferBeacon && typeof navigator !== 'undefined') {
        try {
          if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(endpoint, body)) {
            return;
          }
        } catch (error) {
          console.error('[Dev Test] Failed to send beacon payload:', error);
        }
      }

      pendingRequests.push({
        body,
        keepalive: options?.keepalive ?? payload.type === 'presence',
        attempt: 0,
        allowDuringDispose: options?.allowDuringDispose,
      });
      processPendingRequests();
    };

    sendUpdateRef.current = (serialized, options) => {
      postCollaboration({ type: 'update', update: serialized }, options);
    };

    if (pendingLocalUpdatesRef.current.length > 0) {
      const queued = pendingLocalUpdatesRef.current.splice(0, pendingLocalUpdatesRef.current.length);
      queued.forEach(item => {
        postCollaboration({ type: 'update', update: item.serialized }, item.options);
      });
    }

    const buildPresencePayload = () => ({
      id: clientIdRef.current,
      name: displayNameRef.current.length > 0 ? displayNameRef.current : null,
      color: colorForClient(clientIdRef.current),
      avatar: null,
    });

    const sendPresence = (
      presence: unknown,
      options?: PostOptions,
    ) => {
      postCollaboration({ type: 'presence', presence }, options);
    };

    sendPresenceRef.current = () => {
      sendPresence(buildPresencePayload(), { keepalive: true });
    };

    const handlePageHide = () => {
      broadcastSnapshot({ allowDuringDispose: true, keepalive: true, preferBeacon: true });
      sendPresence(null, { keepalive: true, preferBeacon: true, allowDuringDispose: true });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', handlePageHide);
    }

    const handleUpdateEnvelope = (message: { update: string; clientId?: string }) => {
      if (!message.update) {
        return;
      }
      if (message.clientId && message.clientId === clientIdRef.current) {
        return;
      }
      const payload = deserializeCollaborationEnvelope(message.update);
      if (!payload) {
        return;
      }
      if (payload.kind === 'snapshot') {
        if (payload.version >= versionRef.current) {
          applySnapshot(payload.tasks, payload.version);
        }
        return;
      }
      if (seenOperationsRef.current.has(payload.opId)) {
        return;
      }
      seenOperationsRef.current.add(payload.opId);
      if (typeof payload.version === 'number' && Number.isFinite(payload.version)) {
        versionRef.current = Math.max(versionRef.current, payload.version);
      } else {
        versionRef.current += 1;
      }
      applyTaskOperation(payload.op);
    };

    const openEventStream = () => {
      if (eventSource) {
        eventSource.close();
      }

      connectedRef.current = false;
      safeSetStatus('connecting');
      safeSetPeerCount(1);

      try {
        eventSource = new EventSource(`${endpoint}?clientId=${encodeURIComponent(clientIdRef.current)}`);
      } catch (error) {
        console.error('[Dev Test] Failed to initialize collaboration stream:', error);
        safeSetStatus('disconnected');
        return;
      }

      eventSource.onopen = () => {
        reconnectAttempts = 0;
        if (reconnectTimer !== null && typeof window !== 'undefined') {
          window.clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        connectedRef.current = true;
        safeSetStatus('connected');
        broadcastSnapshot();
        sendPresence(buildPresencePayload());
        if (presenceInterval !== null && typeof window !== 'undefined') {
          window.clearInterval(presenceInterval);
        }
        if (typeof window !== 'undefined') {
          presenceInterval = window.setInterval(() => {
            sendPresence(buildPresencePayload());
          }, 20000);
        }
      };

      eventSource.onmessage = event => {
        if (!event.data) {
          return;
        }
        let parsed: CollaborationMessage;
        try {
          parsed = JSON.parse(event.data) as CollaborationMessage;
        } catch (error) {
          console.error('[Dev Test] Failed to parse SSE payload:', error);
          return;
        }

        if (parsed.type === 'update') {
          handleUpdateEnvelope(parsed);
          return;
        }

        const uniqueIds = new Set<string>();
        const remoteIds = new Set<string>();
        parsed.clients.forEach(client => {
          if (typeof client.clientId === 'string') {
            uniqueIds.add(client.clientId);
            if (client.clientId !== clientIdRef.current) {
              remoteIds.add(client.clientId);
            }
          }
        });
        const previous = knownPeersRef.current;
        const newPeers: string[] = [];
        remoteIds.forEach(id => {
          if (!previous.has(id)) {
            newPeers.push(id);
          }
        });
        knownPeersRef.current = remoteIds;
        safeSetPeerCount(Math.max(1, uniqueIds.size));
        if (newPeers.length > 0 && connectedRef.current && hasShareableStateRef.current) {
          broadcastSnapshot();
        }
      };

      eventSource.onerror = error => {
        console.error('[Dev Test] Collaboration stream error:', error);
        connectedRef.current = false;
        safeSetStatus('disconnected');
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (presenceInterval !== null && typeof window !== 'undefined') {
          window.clearInterval(presenceInterval);
          presenceInterval = null;
        }
        if (disposed || typeof window === 'undefined') {
          return;
        }
        if (reconnectTimer !== null) {
          window.clearTimeout(reconnectTimer);
        }
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 12000);
        reconnectAttempts += 1;
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null;
          openEventStream();
        }, delay);
      };
    };

    openEventStream();

    return () => {
      broadcastSnapshot({ allowDuringDispose: true, keepalive: true, preferBeacon: true });
      sendPresence(null, { keepalive: true, preferBeacon: true, allowDuringDispose: true });
      disposed = true;
      connectedRef.current = false;
      if (presenceInterval !== null && typeof window !== 'undefined') {
        window.clearInterval(presenceInterval);
      }
      if (reconnectTimer !== null && typeof window !== 'undefined') {
        window.clearTimeout(reconnectTimer);
      }
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', handlePageHide);
      }
      safeSetStatus('disconnected');
      safeSetPeerCount(1);
      knownPeersRef.current = new Set();
      statusGuardRef.current.mounted = false;
      sendUpdateRef.current = (serialized, options) => {
        pendingLocalUpdatesRef.current.push({ serialized, options });
      };
      sendPresenceRef.current = null;
    };
  }, [applySnapshot, applyTaskOperation, broadcastSnapshot]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = newTaskText.trim();
      if (!trimmed) {
        return;
      }
      const task: Task = {
        id: createTaskId(clientIdRef.current),
        text: trimmed.slice(0, 2000),
        completed: false,
        author: displayNameRef.current.length > 0 ? displayNameRef.current : null,
        createdAt: Date.now(),
      };
      sendTaskOperation({ type: 'create', task });
      setNewTaskText('');
    },
    [newTaskText, sendTaskOperation],
  );

  const handleToggleTask = useCallback(
    (task: Task) => {
      sendTaskOperation({ type: 'set-completed', id: task.id, completed: !task.completed });
    },
    [sendTaskOperation],
  );

  const handleRemoveTask = useCallback(
    (task: Task) => {
      sendTaskOperation({ type: 'remove', id: task.id });
    },
    [sendTaskOperation],
  );

  const handleRenameTask = useCallback(
    (task: Task) => {
      if (typeof window === 'undefined') {
        return;
      }
      const nextText = window.prompt('Update the card text', task.text);
      if (nextText === null) {
        return;
      }
      const trimmed = nextText.trim();
      if (!trimmed) {
        sendTaskOperation({ type: 'remove', id: task.id });
        return;
      }
      if (trimmed === task.text) {
        return;
      }
      sendTaskOperation({ type: 'set-text', id: task.id, text: trimmed.slice(0, 2000) });
    },
    [sendTaskOperation],
  );

  const handleClearBoard = useCallback(() => {
    if (tasksRef.current.length === 0) {
      return;
    }
    sendTaskOperation({ type: 'clear' });
  }, [sendTaskOperation]);

  const handleManualSnapshot = useCallback(() => {
    broadcastSnapshot();
  }, [broadcastSnapshot]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 py-10">
      <div className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300/80">Dev Test</p>
        <h1 className="text-3xl font-semibold">Realtime task wall</h1>
        <p className="text-sm text-white/60">
          Experiment with the collaboration bridge powering the IDE. Add or edit cards and watch every
          connected browser stay in sync without relying on the Yjs document used elsewhere in the app.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-medium transition ${
            connectionStatus === 'connected'
              ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200'
              : 'border-white/10 bg-white/5'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-300' : 'bg-yellow-300'}`} />
          {statusLabel}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-medium text-white/70">
          {peerCount} {peerCount === 1 ? 'active tab' : 'active tabs'}
        </span>
        <button
          type="button"
          onClick={handleManualSnapshot}
          className="rounded-full border border-emerald-300/40 px-3 py-1 font-medium text-emerald-200 transition hover:border-emerald-300 hover:text-emerald-100"
        >
          Broadcast snapshot now
        </button>
        <button
          type="button"
          onClick={handleClearBoard}
          className="rounded-full border border-white/15 px-3 py-1 font-medium text-white/70 transition hover:border-red-400/60 hover:text-red-200"
        >
          Clear board
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/40 p-6 shadow-inner shadow-black/40">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label htmlFor="dev-test-new-card" className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
              Add a card
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="dev-test-new-card"
                value={newTaskText}
                onChange={event => setNewTaskText(event.target.value)}
                placeholder="Write a quick task or note and press Enter"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none transition focus:border-emerald-400/60 focus:bg-black/40"
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!newTaskText.trim()}
              >
                Share update
              </button>
            </div>
          </form>

          <div className="rounded-xl border border-white/10 bg-white/5">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-white/50">
                <span>No cards yet.</span>
                <span>Add something above and open another browser tab to watch it sync.</span>
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {tasks.map(task => (
                  <li key={task.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-1 items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task)}
                        className={`mt-1 h-4 w-4 rounded border ${
                          task.completed
                            ? 'border-emerald-300 bg-emerald-400'
                            : 'border-white/20 bg-transparent'
                        } transition hover:border-emerald-300`}
                        aria-pressed={task.completed}
                        aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                      />
                      <div className="flex flex-col">
                        <span className={`text-sm ${task.completed ? 'text-white/50 line-through' : 'text-white/90'}`}>
                          {task.text}
                        </span>
                        <span className="text-xs text-white/40">
                          {task.author ? `Added by ${task.author}` : 'Anonymous update'} · {formatTimestamp(task.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleRenameTask(task)}
                        className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/70 transition hover:border-white/40 hover:text-white"
                      >
                        Edit text
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveTask(task)}
                        className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-red-200 transition hover:border-red-400/60 hover:text-red-100"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="dev-test-display-name" className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
              Your label
            </label>
            <input
              id="dev-test-display-name"
              value={displayName}
              onChange={event => setDisplayName(event.target.value.slice(0, 80))}
              placeholder="Optional name shown to other testers"
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/90 outline-none transition focus:border-emerald-400/60"
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white/60">
            <p className="font-semibold text-white/80">How this test works</p>
            <ul className="mt-2 space-y-2 text-xs">
              <li>• Updates are broadcast as tiny JSON operations instead of Yjs binary patches.</li>
              <li>• Snapshots are sent when new peers arrive or when you manually broadcast them.</li>
              <li>• Presence data relies on the same SSE channel that powers the production IDE.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs text-white/50">
            Tip: keep this tab open next to another device, add cards here, and confirm everything updates instantly.
          </div>
        </aside>
      </div>
    </div>
  );
}
