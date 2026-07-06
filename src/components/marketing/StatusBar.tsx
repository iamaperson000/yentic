export default function StatusBar({ items, right }: { items: string[]; right: string[] }) {
  return (
    <div
      className="flex h-[34px] items-center gap-6 px-[18px] font-[family-name:var(--font-mono-code)] text-xs font-semibold"
      style={{ background: 'var(--y-brand)', color: 'var(--y-statfg)' }}
    >
      {items.map((t, i) => (
        <span key={t} className="flex items-center">
          {i === 0 && (
            <span
              className="mr-1.5 inline-block h-[7px] w-[7px] rounded-full"
              style={{ background: 'var(--y-statfg)' }}
            />
          )}
          {t}
        </span>
      ))}
      <span className="ml-auto flex gap-6">
        {right.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </span>
    </div>
  );
}
