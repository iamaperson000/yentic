declare module 'JSCPP' {
  export function run(
    source: string,
    stdin?: string,
    options?: {
      stdio?: {
        write?(chunk: string): boolean | void;
        drain?(): string | null | void;
      };
    }
  ): number | void;
}
