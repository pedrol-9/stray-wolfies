import { useState, useEffect } from 'react';

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
  const [textValue, setTextValue] = useState(value.toString());

  // Sync internal text state with value updates from buttons or props
  useEffect(() => {
    const parsed = parseInt(textValue, 10);
    const num = isNaN(parsed) ? 0 : parsed;
    if (num !== value) {
      setTextValue(value.toString());
    }
  }, [value]);

  const handleTextChange = (text: string) => {
    // Keep only numeric characters
    const cleaned = text.replace(/\D/g, '');
    setTextValue(cleaned);
    
    // Parse and update parent state (temporarily allow below min to facilitate backspacing)
    const parsed = cleaned === '' ? 0 : parseInt(cleaned, 10);
    const num = Math.min(max, parsed);
    onChange(num);
  };

  const handleBlur = () => {
    // Enforce min/max boundaries on blur
    const parsed = parseInt(textValue, 10);
    const num = isNaN(parsed) ? min : Math.min(max, Math.max(min, parsed));
    onChange(num);
    setTextValue(num.toString());
  };

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
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={textValue}
        onChange={(e) => handleTextChange(e.target.value)}
        onBlur={handleBlur}
        className={`w-7 text-center font-semibold bg-transparent outline-none border-b border-transparent focus:border-flame/40 py-0.5 tabular-nums ${
          size === 'sm' ? 'text-sm' : 'text-base'
        }`}
      />
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
