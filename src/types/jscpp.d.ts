declare module 'JSCPP' {
  export type JSCPPConfig = {
    stdio?: {
      write?: (text: string) => void;
    };
    maxTimeout?: number;
  };

  export type JSCPPModule = {
    run: (code: string, input?: string, config?: JSCPPConfig) => number;
  };

  const runtime: JSCPPModule;
  export default runtime;
}
