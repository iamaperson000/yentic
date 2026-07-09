/*
 * C/C++ compile-and-run engine for the browser, executed inside a Web Worker.
 *
 * Adapted from wasm-clang's shared.js (Copyright 2020 WebAssembly Community
 * Group participants, Apache-2.0) — canvas support removed, stdout/stderr
 * split, C language mode added, clock_time_get implemented.
 * https://github.com/binji/wasm-clang
 *
 * This file is served as a static asset on purpose: the toolchain re-imports
 * and instantiates raw wasm binaries, which must stay outside the bundler.
 *
 * Protocol:
 *   in:  { id, language: 'c' | 'cpp', source, stdin }
 *   out: { id, phase: 'downloading' | 'compiling' | 'running' }
 *        { id, done: { stdout, stderr } }
 *        { id, error: string }
 */

const ASSET_BASE = '/wasm-clang/';
const ESUCCESS = 0;

class ProcExit extends Error {
  constructor(code) {
    super(`process exited with code ${code}.`);
    this.code = code;
  }
}

class NotImplemented extends Error {
  constructor(modname, fieldname) {
    super(`${modname}.${fieldname} not implemented.`);
  }
}

function assert(cond, msg = 'assertion failed.') {
  if (!cond) throw new Error(msg);
}

function readStr(u8, o, len = -1) {
  let str = '';
  let end = u8.length;
  if (len != -1) end = o + len;
  for (let i = o; i < end && u8[i] != 0; ++i) str += String.fromCharCode(u8[i]);
  return str;
}

class Memory {
  constructor(memory) {
    this.memory = memory;
    this.buffer = this.memory.buffer;
    this.u8 = new Uint8Array(this.buffer);
    this.u32 = new Uint32Array(this.buffer);
  }

  check() {
    if (this.buffer.byteLength === 0) {
      this.buffer = this.memory.buffer;
      this.u8 = new Uint8Array(this.buffer);
      this.u32 = new Uint32Array(this.buffer);
    }
  }

  read8(o) { return this.u8[o]; }
  read32(o) { return this.u32[o >> 2]; }
  write8(o, v) { this.u8[o] = v; }
  write32(o, v) { this.u32[o >> 2] = v; }
  write64(o, vlo, vhi = 0) { this.write32(o, vlo); this.write32(o + 4, vhi); }

  readStr(o, len) { return readStr(this.u8, o, len); }

  writeStr(o, str) {
    o += this.write(o, str);
    this.write8(o, 0);
    return str.length + 1;
  }

  write(o, buf) {
    if (buf instanceof ArrayBuffer) {
      return this.write(o, new Uint8Array(buf));
    } else if (typeof buf === 'string') {
      return this.write(o, buf.split('').map(x => x.charCodeAt(0)));
    } else {
      const dst = new Uint8Array(this.buffer, o, buf.length);
      dst.set(buf);
      return buf.length;
    }
  }
}

class MemFS {
  constructor(options) {
    this.hostWrite = options.hostWrite; // (str, fd) => void
    this.stdinStr = options.stdinStr || '';
    this.stdinStrPos = 0;
    this.hostMem_ = null;

    const env = {
      abort: this.abort.bind(this),
      host_write: this.host_write.bind(this),
      host_read: this.host_read.bind(this),
      memfs_log: this.memfs_log.bind(this),
      copy_in: this.copy_in.bind(this),
      copy_out: this.copy_out.bind(this),
    };

    this.ready = options
      .compileStreaming(options.memfsFilename)
      .then(module => WebAssembly.instantiate(module, { env }))
      .then(instance => {
        this.instance = instance;
        this.exports = instance.exports;
        this.mem = new Memory(this.exports.memory);
        this.exports.init();
      });
  }

  set hostMem(mem) { this.hostMem_ = mem; }

  setStdinStr(str) {
    this.stdinStr = str;
    this.stdinStrPos = 0;
  }

  addDirectory(path) {
    this.mem.check();
    this.mem.write(this.exports.GetPathBuf(), path);
    this.exports.AddDirectoryNode(path.length);
  }

  addFile(path, contents) {
    const length = contents instanceof ArrayBuffer ? contents.byteLength : contents.length;
    this.mem.check();
    this.mem.write(this.exports.GetPathBuf(), path);
    const inode = this.exports.AddFileNode(path.length, length);
    const addr = this.exports.GetFileNodeAddress(inode);
    this.mem.check();
    this.mem.write(addr, contents);
  }

  getFileContents(path) {
    this.mem.check();
    this.mem.write(this.exports.GetPathBuf(), path);
    const inode = this.exports.FindNode(path.length);
    const addr = this.exports.GetFileNodeAddress(inode);
    const size = this.exports.GetFileNodeSize(inode);
    return new Uint8Array(this.mem.buffer, addr, size);
  }

  abort() { throw new Error('abort'); }

  host_write(fd, iovs, iovs_len, nwritten_out) {
    this.hostMem_.check();
    assert(fd <= 2);
    let size = 0;
    let str = '';
    for (let i = 0; i < iovs_len; ++i) {
      const buf = this.hostMem_.read32(iovs);
      iovs += 4;
      const len = this.hostMem_.read32(iovs);
      iovs += 4;
      str += this.hostMem_.readStr(buf, len);
      size += len;
    }
    this.hostMem_.write32(nwritten_out, size);
    this.hostWrite(str, fd);
    return ESUCCESS;
  }

  host_read(fd, iovs, iovs_len, nread) {
    this.hostMem_.check();
    assert(fd === 0);
    let size = 0;
    for (let i = 0; i < iovs_len; ++i) {
      const buf = this.hostMem_.read32(iovs);
      iovs += 4;
      const len = this.hostMem_.read32(iovs);
      iovs += 4;
      const lenToWrite = Math.min(len, this.stdinStr.length - this.stdinStrPos);
      if (lenToWrite === 0) break;
      this.hostMem_.write(buf, this.stdinStr.substr(this.stdinStrPos, lenToWrite));
      size += lenToWrite;
      this.stdinStrPos += lenToWrite;
      if (lenToWrite !== len) break;
    }
    this.hostMem_.write32(nread, size);
    return ESUCCESS;
  }

  memfs_log(buf, len) {
    this.mem.check();
    console.log(this.mem.readStr(buf, len));
  }

  copy_out(clang_dst, memfs_src, size) {
    this.hostMem_.check();
    const dst = new Uint8Array(this.hostMem_.buffer, clang_dst, size);
    this.mem.check();
    const src = new Uint8Array(this.mem.buffer, memfs_src, size);
    dst.set(src);
  }

  copy_in(memfs_dst, clang_src, size) {
    this.mem.check();
    const dst = new Uint8Array(this.mem.buffer, memfs_dst, size);
    this.hostMem_.check();
    const src = new Uint8Array(this.hostMem_.buffer, clang_src, size);
    dst.set(src);
  }
}

class App {
  constructor(module, memfs, name, ...args) {
    this.argv = [name, ...args];
    this.environ = { USER: 'user' };
    this.memfs = memfs;

    const wasi_unstable = {
      proc_exit: this.proc_exit.bind(this),
      environ_sizes_get: this.environ_sizes_get.bind(this),
      environ_get: this.environ_get.bind(this),
      args_sizes_get: this.args_sizes_get.bind(this),
      args_get: this.args_get.bind(this),
      random_get: this.random_get.bind(this),
      clock_time_get: this.clock_time_get.bind(this),
      poll_oneoff: this.poll_oneoff.bind(this),
    };
    Object.assign(wasi_unstable, this.memfs.exports);

    this.ready = WebAssembly.instantiate(module, { wasi_unstable }).then(instance => {
      this.instance = instance;
      this.exports = this.instance.exports;
      this.mem = new Memory(this.exports.memory);
      this.memfs.hostMem = this.mem;
    });
  }

  async run() {
    await this.ready;
    try {
      this.exports._start();
      return 0;
    } catch (exn) {
      if (exn instanceof ProcExit) {
        return exn.code;
      }
      throw exn;
    }
  }

  proc_exit(code) { throw new ProcExit(code); }

  environ_sizes_get(environ_count_out, environ_buf_size_out) {
    this.mem.check();
    let size = 0;
    const names = Object.getOwnPropertyNames(this.environ);
    for (const name of names) {
      size += name.length + this.environ[name].length + 2;
    }
    this.mem.write64(environ_count_out, names.length);
    this.mem.write64(environ_buf_size_out, size);
    return ESUCCESS;
  }

  environ_get(environ_ptrs, environ_buf) {
    this.mem.check();
    const names = Object.getOwnPropertyNames(this.environ);
    for (const name of names) {
      this.mem.write32(environ_ptrs, environ_buf);
      environ_ptrs += 4;
      environ_buf += this.mem.writeStr(environ_buf, `${name}=${this.environ[name]}`);
    }
    this.mem.write32(environ_ptrs, 0);
    return ESUCCESS;
  }

  args_sizes_get(argc_out, argv_buf_size_out) {
    this.mem.check();
    let size = 0;
    for (const arg of this.argv) size += arg.length + 1;
    this.mem.write64(argc_out, this.argv.length);
    this.mem.write64(argv_buf_size_out, size);
    return ESUCCESS;
  }

  args_get(argv_ptrs, argv_buf) {
    this.mem.check();
    for (const arg of this.argv) {
      this.mem.write32(argv_ptrs, argv_buf);
      argv_ptrs += 4;
      argv_buf += this.mem.writeStr(argv_buf, arg);
    }
    this.mem.write32(argv_ptrs, 0);
    return ESUCCESS;
  }

  random_get(buf, buf_len) {
    const data = new Uint8Array(this.mem.buffer, buf, buf_len);
    for (let i = 0; i < buf_len; ++i) data[i] = (Math.random() * 256) | 0;
    return ESUCCESS;
  }

  clock_time_get(clock_id, precision, time_out) {
    // Millisecond wall clock is enough for time()/chrono in student programs.
    this.mem.check();
    const ns = BigInt(Date.now()) * 1000000n;
    this.mem.write32(time_out, Number(ns & 0xffffffffn));
    this.mem.write32(time_out + 4, Number((ns >> 32n) & 0xffffffffn));
    return ESUCCESS;
  }

  poll_oneoff() {
    throw new NotImplemented('wasi_unstable', 'poll_oneoff');
  }
}

class Tar {
  constructor(buffer) {
    this.u8 = new Uint8Array(buffer);
    this.offset = 0;
  }

  readStr(len) {
    const result = readStr(this.u8, this.offset, len);
    this.offset += len;
    return result;
  }

  readOctal(len) { return parseInt(this.readStr(len), 8); }

  alignUp() { this.offset = (this.offset + 511) & ~511; }

  readEntry() {
    if (this.offset + 512 > this.u8.length) return null;
    const entry = {
      filename: this.readStr(100),
      mode: this.readOctal(8),
      owner: this.readOctal(8),
      group: this.readOctal(8),
      size: this.readOctal(12),
      mtim: this.readOctal(12),
      checksum: this.readOctal(8),
      type: this.readStr(1),
      linkname: this.readStr(100),
    };
    if (this.readStr(8) !== 'ustar  ') return null;
    entry.ownerName = this.readStr(32);
    entry.groupName = this.readStr(32);
    entry.devMajor = this.readStr(8);
    entry.devMinor = this.readStr(8);
    entry.filenamePrefix = this.readStr(155);
    this.alignUp();
    if (entry.type === '0') {
      entry.contents = this.u8.subarray(this.offset, this.offset + entry.size);
      this.offset += entry.size;
      this.alignUp();
    } else if (entry.type !== '5') {
      assert(false, `unexpected tar entry type ${entry.type}`);
    }
    return entry;
  }

  untar(memfs) {
    let entry;
    while ((entry = this.readEntry())) {
      if (entry.type === '0') memfs.addFile(entry.filename, entry.contents);
      else if (entry.type === '5') memfs.addDirectory(entry.filename);
    }
  }
}

const CLANG_COMMON_ARGS = [
  '-disable-free',
  '-isysroot', '/',
  '-internal-isystem', '/include/c++/v1',
  '-internal-isystem', '/include',
  '-internal-isystem', '/lib/clang/8.0.1/include',
  '-ferror-limit', '19',
  '-fmessage-length', '80',
];

class Engine {
  constructor() {
    this.moduleCache = new Map();
    this.stdout = '';
    this.stderr = '';
    this.memfs = null;
    this.ready = null;
  }

  hostWrite(str, fd) {
    if (fd === 2) this.stderr += str;
    else this.stdout += str;
  }

  compileStreaming(filename) {
    // Not actually streaming: the toolchain files are extensionless, so they
    // are served without the application/wasm MIME type that
    // WebAssembly.compileStreaming requires.
    const url = ASSET_BASE + filename;
    return fetch(url).then(r => {
      if (!r.ok) throw new Error(`Failed to fetch ${filename}: HTTP ${r.status}`);
      return r.arrayBuffer();
    }).then(WebAssembly.compile);
  }

  async getModule(name) {
    if (this.moduleCache.has(name)) return this.moduleCache.get(name);
    const module = await this.compileStreaming(name);
    this.moduleCache.set(name, module);
    return module;
  }

  ensureReady() {
    if (!this.ready) {
      this.ready = (async () => {
        this.memfs = new MemFS({
          compileStreaming: this.compileStreaming.bind(this),
          hostWrite: this.hostWrite.bind(this),
          memfsFilename: 'memfs',
        });
        await this.memfs.ready;
        const tarBuffer = await fetch(ASSET_BASE + 'sysroot.tar').then(r => r.arrayBuffer());
        new Tar(tarBuffer).untar(this.memfs);
      })().catch(error => {
        this.ready = null;
        throw error;
      });
    }
    return this.ready;
  }

  async runCommand(module, ...args) {
    const app = new App(module, this.memfs, ...args);
    return app.run(); // resolves to exit code
  }

  async compileLinkRun(language, source, stdin, reportPhase) {
    this.stdout = '';
    this.stderr = '';

    reportPhase('downloading');
    await this.ensureReady();
    const clang = await this.getModule('clang');
    const lld = await this.getModule('lld');

    reportPhase('compiling');
    const input = language === 'c' ? 'main.c' : 'main.cc';
    this.memfs.addFile(input, source);
    const compileExit = await this.runCommand(
      clang, 'clang', '-cc1', '-emit-obj', ...CLANG_COMMON_ARGS,
      '-O0', '-o', 'main.o', '-x', language === 'c' ? 'c' : 'c++', input
    );
    if (compileExit !== 0) {
      return { stdout: '', stderr: this.stderr.trim() || `Compilation failed (exit ${compileExit}).` };
    }

    const libdir = 'lib/wasm32-wasi';
    const linkExit = await this.runCommand(
      lld, 'wasm-ld', '--no-threads', '--export-dynamic',
      '-z', 'stack-size=1048576', `-L${libdir}`, `${libdir}/crt1.o`,
      'main.o', '-lc', '-lc++', '-lc++abi', '-o', 'main.wasm'
    );
    if (linkExit !== 0) {
      return { stdout: '', stderr: this.stderr.trim() || `Linking failed (exit ${linkExit}).` };
    }

    reportPhase('running');
    // Reset captured streams: compiler/linker warnings shouldn't pollute the
    // program's own output.
    const toolStderr = this.stderr;
    this.stdout = '';
    this.stderr = '';
    this.memfs.setStdinStr(stdin || '');
    const programModule = await WebAssembly.compile(this.memfs.getFileContents('main.wasm'));
    const exitCode = await this.runCommand(programModule, 'main.wasm');

    let stderr = this.stderr;
    if (exitCode !== 0) {
      stderr = `${stderr}${stderr && !stderr.endsWith('\n') ? '\n' : ''}Program exited with code ${exitCode}\n`;
    }
    void toolStderr; // tool warnings intentionally dropped on success
    return { stdout: this.stdout, stderr };
  }
}

const engine = new Engine();
let queue = Promise.resolve();

self.onmessage = event => {
  const { id, language, source, stdin } = event.data;
  queue = queue.then(async () => {
    try {
      const result = await engine.compileLinkRun(language, source, stdin, phase => {
        self.postMessage({ id, phase });
      });
      self.postMessage({ id, done: result });
    } catch (error) {
      self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
    }
  });
};
