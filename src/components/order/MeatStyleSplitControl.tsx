import type { MeatStyleSplit } from '../../lib/meat-style';
import { meatSplitSum } from '../../lib/meat-style';
import QuantityStepper from './QuantityStepper';

type Props = {
  total: number;
  split: MeatStyleSplit;
  onChange: (split: MeatStyleSplit) => void;
};

export default function MeatStyleSplitControl({ total, split, onChange }: Props) {
  const sum = meatSplitSum(split);
  const ok = sum === total && sum > 0;

  return (
    <div className="mt-2 rounded-lg border border-white/10 bg-void/40 p-3">
      <p className="mb-2 text-xs text-smoke">
        Picante / tradicional ({sum} de {total})
      </p>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs font-medium text-cream">Picante</span>
          <QuantityStepper
            size="sm"
            min={0}
            max={total - split.tradicional}
            value={split.picante}
            onChange={(picante) => onChange({ picante, tradicional: split.tradicional })}
          />
        </div>
        <div className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs font-medium text-cream">Tradicional</span>
          <QuantityStepper
            size="sm"
            min={0}
            max={total - split.picante}
            value={split.tradicional}
            onChange={(tradicional) => onChange({ picante: split.picante, tradicional })}
          />
        </div>
      </div>
      {!ok && (
        <p className="mt-2 text-center text-xs text-ember">
          {sum === 0
            ? 'Elige al menos un estilo.'
            : `Deben sumar ${total}.`}
        </p>
      )}
    </div>
  );
}
