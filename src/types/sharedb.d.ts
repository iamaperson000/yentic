declare module 'sharedb' {
  export type JSONOpComponent = {
    p: Array<string | number>;
    oi?: unknown;
    od?: unknown;
    li?: unknown;
    ld?: unknown;
  };
  export type JSONOp = JSONOpComponent[];

  export interface SubmitOptions {
    source?: unknown;
  }

  export interface Doc<T> {
    data: T | undefined;
    type: string | null;
    subscribe(callback: (error?: Error | null) => void): void;
    fetch(callback: (error?: Error | null) => void): void;
    create(data: T, callback: (error?: Error | null) => void): void;
    create(data: T, type: string | null, callback: (error?: Error | null) => void): void;
    create(
      data: T,
      type: string | null,
      options: Record<string, unknown>,
      callback: (error?: Error | null) => void,
    ): void;
    submitOp(op: JSONOp, options: SubmitOptions, callback: (error?: Error | null) => void): void;
  }

  export interface Connection {
    get<T>(collection: string, id: string): Doc<T>;
  }

  export default class ShareDB {
    connect(): Connection;
    use(action: string, middleware: (...args: unknown[]) => void): void;
    listen(stream: unknown): void;
  }
}

declare module 'sharedb/lib/client' {
  export type JSONOpComponent = {
    p: Array<string | number>;
    oi?: unknown;
    od?: unknown;
    li?: unknown;
    ld?: unknown;
  };
  export type JSONOp = JSONOpComponent[];

  export interface SubmitOptions {
    source?: unknown;
  }

  export interface Doc<T> {
    data: T | undefined;
    subscribe(callback: (error?: Error | null) => void): void;
    destroy(): void;
    submitOp(op: JSONOp, options?: SubmitOptions, callback?: (error?: Error | null) => void): void;
    on(event: 'op', listener: (ops: JSONOp, source: unknown) => void): void;
    on(event: 'load', listener: () => void): void;
    on(event: 'error', listener: (error: Error) => void): void;
    removeListener(event: 'op', listener: (ops: JSONOp, source: unknown) => void): void;
    removeListener(event: 'load', listener: () => void): void;
    removeListener(event: 'error', listener: (error: Error) => void): void;
  }

  export class Connection {
    constructor(socket: WebSocket);
    get<T>(collection: string, id: string): Doc<T>;
    close(): void;
  }

  const sharedbClient: {
    Connection: typeof Connection;
  };

  export default sharedbClient;
}
