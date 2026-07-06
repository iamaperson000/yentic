'use client';

import { useState } from 'react';

import { executeCode } from '@/lib/runners';

const SOURCE = `def primes(limit):
    sieve = [True] * limit
    for n in range(2, int(limit**0.5)+1):
        if sieve[n]:
            sieve[n*n::n] = [False] * len(sieve[n*n::n])
    return [i for i in range(2, limit) if sieve[i]]

print(primes(30))`;

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; text: string }
  | { kind: 'error'; text: string };

export default function HeroCode() {
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function run() {
    setState({ kind: 'loading' });
    try {
      const result = await executeCode('python', SOURCE);
      const out = (result.stdout || result.stderr || '').trimEnd();
      if (result.stderr && !result.stdout) {
        setState({ kind: 'error', text: out || 'error' });
      } else {
        setState({ kind: 'done', text: out || '(no output)' });
      }
    } catch (err) {
      setState({ kind: 'error', text: err instanceof Error ? err.message : 'failed to run' });
    }
  }

  const running = state.kind === 'loading';

  return (
    <div
      className="mt-10 min-w-0 overflow-hidden rounded-[11px] border"
      style={{ borderColor: 'var(--y-line)', background: 'var(--y-panel)' }}
    >
      <div
        className="flex items-center justify-between border-b px-[15px] py-2 font-[family-name:var(--font-mono-code)] text-[11.5px]"
        style={{ borderColor: 'var(--y-line)', color: 'var(--y-muted)' }}
      >
        <span>python</span>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="rounded-md px-3 py-1 font-semibold transition disabled:opacity-60"
          style={{ background: 'var(--y-brand)', color: 'var(--y-statfg)' }}
        >
          {running ? 'running…' : '▶ run'}
        </button>
      </div>

      <pre
        className="overflow-x-auto whitespace-pre px-5 py-[18px] font-[family-name:var(--font-mono-code)] text-[10.5px] leading-[1.75] sm:text-[13px] sm:leading-[1.9]"
        style={{ color: 'var(--y-fg)' }}
      >
        <span style={{ color: 'var(--y-kw)' }}>def</span>{' '}
        <span style={{ color: 'var(--y-fn)' }}>primes</span>(limit):{'\n'}
        {'    '}sieve = [<span style={{ color: 'var(--y-kw)' }}>True</span>] * limit{'\n'}
        {'    '}
        <span style={{ color: 'var(--y-kw)' }}>for</span> n{' '}
        <span style={{ color: 'var(--y-op)' }}>in</span>{' '}
        <span style={{ color: 'var(--y-fn)' }}>range</span>(
        <span style={{ color: 'var(--y-num)' }}>2</span>,{' '}
        <span style={{ color: 'var(--y-fn)' }}>int</span>(limit**
        <span style={{ color: 'var(--y-num)' }}>0.5</span>)+
        <span style={{ color: 'var(--y-num)' }}>1</span>):{'\n'}
        {'        '}
        <span style={{ color: 'var(--y-kw)' }}>if</span> sieve[n]: sieve[n*n::n] = [
        <span style={{ color: 'var(--y-kw)' }}>False</span>] *{' '}
        <span style={{ color: 'var(--y-fn)' }}>len</span>(sieve[n*n::n]){'\n'}
        {'    '}
        <span style={{ color: 'var(--y-kw)' }}>return</span> [i{' '}
        <span style={{ color: 'var(--y-kw)' }}>for</span> i{' '}
        <span style={{ color: 'var(--y-op)' }}>in</span>{' '}
        <span style={{ color: 'var(--y-fn)' }}>range</span>(
        <span style={{ color: 'var(--y-num)' }}>2</span>, limit){' '}
        <span style={{ color: 'var(--y-kw)' }}>if</span> sieve[i]]{'\n\n'}
        <span style={{ color: 'var(--y-fn)' }}>print</span>(
        <span style={{ color: 'var(--y-fn)' }}>primes</span>(
        <span style={{ color: 'var(--y-num)' }}>30</span>))
      </pre>

      <div
        className="border-t px-5 py-[13px] font-[family-name:var(--font-mono-code)] text-[12.5px]"
        style={{
          borderColor: 'var(--y-line)',
          background: 'var(--y-console-bg)',
          color: state.kind === 'error' ? 'var(--y-kw)' : 'var(--y-str)',
        }}
      >
        {state.kind === 'idle' && (
          <span style={{ color: 'var(--y-muted)' }}># press run to execute this in your browser</span>
        )}
        {state.kind === 'loading' && (
          <span style={{ color: 'var(--y-muted)' }}>loading the python runtime…</span>
        )}
        {(state.kind === 'done' || state.kind === 'error') && (
          <>
            <span style={{ color: 'var(--y-muted)' }}>→ </span>
            {state.text}
          </>
        )}
      </div>
    </div>
  );
}
