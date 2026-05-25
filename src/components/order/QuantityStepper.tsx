type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
};

export default function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  size = 'md',
}: Props) {
  const btn =
    size === 'sm'
      ? 'size-8 rounded-lg border border-white/20 text-base leading-none'
      : 'size-9 rounded-lg border border-white/20 text-lg leading-none';

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        aria-label="Menos"
        className={`${btn} text-cream transition hover:border-flame/50 disabled:opacity-30`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <span
        className={`min-w-6 text-center font-semibold tabular-nums ${
          size === 'sm' ? 'text-sm' : 'text-base'
        }`}
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Más"
        className={`${btn} text-cream transition hover:border-flame/50 disabled:opacity-30`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  );
}
