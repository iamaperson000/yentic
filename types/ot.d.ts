declare module 'ot' {
  export class TextOperation {
    constructor();
    ops: Array<number | string>;
    retain(n: number): TextOperation;
    insert(str: string): TextOperation;
    delete(str: string): TextOperation;
    apply(str: string): string;
    compose(operation: TextOperation): TextOperation;
    toJSON(): unknown;
    static fromJSON(obj: unknown): TextOperation;
    static transform(a: TextOperation, b: TextOperation): [TextOperation, TextOperation];
  }

  export class Server {
    constructor(doc?: string);
    document: string;
    operations: TextOperation[];
    receiveOperation(revision: number, operation: TextOperation): TextOperation;
  }
}
