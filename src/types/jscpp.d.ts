declare module 'JSCPP' {
  export function run(
    source: string,
    stdin?: string,
    options?: {
      stdio?: {
        write?(chunk: string): void;
        drain?(): string | void;
      };
    }
  ): number | void;
}
