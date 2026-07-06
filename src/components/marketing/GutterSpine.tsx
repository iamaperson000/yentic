export default function GutterSpine({ lines }: { lines: number }) {
  return (
    <div
      aria-hidden
      className="select-none border-r text-right font-[family-name:var(--font-mono-code)] text-xs leading-[2.2]"
      style={{ borderColor: 'var(--y-line)', color: 'var(--y-gnum)', padding: '44px 14px' }}
    >
      {Array.from({ length: lines }, (_, i) => (
        <div key={i}>{i + 1}</div>
      ))}
    </div>
  );
}
