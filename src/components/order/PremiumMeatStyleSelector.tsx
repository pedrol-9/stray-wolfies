import { useState, useEffect } from 'react';
import type { MeatStyleSplit } from '../../lib/meat-style';
import { meatSplitSum } from '../../lib/meat-style';

type AnimationVariant = 'flame' | 'grill' | 'admin-fire';

type Props = {
  split: MeatStyleSplit;
  onChange: (split: MeatStyleSplit) => void;
  minSum?: number;
  variant?: AnimationVariant;
  plain?: boolean;
  id?: string;
  vertical?: boolean;
};

export default function PremiumMeatStyleSelector({ 
  split, 
  onChange, 
  minSum = 0,
  variant = 'flame',
  plain = false,
  id,
  vertical = false
}: Props) {
  const [picanteStr, setPicanteStr] = useState(split.picante.toString());
  const [tradicionalStr, setTradicionalStr] = useState(split.tradicional.toString());

  // Sync state with props ONLY when the parsed values differ (meaning it was updated from outside/buttons)
  useEffect(() => {
    const val = parseInt(picanteStr, 10);
    const parsed = isNaN(val) ? 0 : val;
    if (parsed !== split.picante) {
      setPicanteStr(split.picante.toString());
    }
  }, [split.picante]);

  useEffect(() => {
    const val = parseInt(tradicionalStr, 10);
    const parsed = isNaN(val) ? 0 : val;
    if (parsed !== split.tradicional) {
      setTradicionalStr(split.tradicional.toString());
    }
  }, [split.tradicional]);

  const sum = meatSplitSum(split);

  // Helper to handle increments
  const handleIncrement = (type: 'picante' | 'tradicional') => {
    if (type === 'picante') {
      onChange({ ...split, picante: split.picante + 1 });
    } else {
      onChange({ ...split, tradicional: split.tradicional + 1 });
    }
  };

  // Helper to handle decrements
  const handleDecrement = (type: 'picante' | 'tradicional') => {
    if (sum <= minSum) return; // Prevent going below minSum
    
    if (type === 'picante' && split.picante > 0) {
      onChange({ ...split, picante: split.picante - 1 });
    } else if (type === 'tradicional' && split.tradicional > 0) {
      onChange({ ...split, tradicional: split.tradicional - 1 });
    }
  };

  // Helper to handle text typing
  const handleTextChange = (type: 'picante' | 'tradicional', text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (type === 'picante') {
      setPicanteStr(cleaned);
      const parsed = cleaned === '' ? 0 : parseInt(cleaned, 10);
      onChange({ ...split, picante: parsed });
    } else {
      setTradicionalStr(cleaned);
      const parsed = cleaned === '' ? 0 : parseInt(cleaned, 10);
      onChange({ ...split, tradicional: parsed });
    }
  };

  // Helper to format text on blur
  const handleBlur = (type: 'picante' | 'tradicional') => {
    if (type === 'picante') {
      setPicanteStr(split.picante.toString());
    } else {
      setTradicionalStr(split.tradicional.toString());
    }
  };

  if (plain) {
    return (
      <div id={id} className="relative z-10 w-full">
        {/* Header */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
          <h4 className="text-xs font-semibold text-cream/70 tracking-wide uppercase flex items-center gap-2">
            🔥 Elige el tipo de chorizo
          </h4>
        </div>

        {/* Controls Container - Horizontal when space permits, vertical when constrained */}
        <div className={`relative z-10 flex ${vertical ? 'flex-col' : 'flex-wrap'} gap-3`}>
          
          {/* Picante Control */}
          <div className={`flex-grow flex-shrink-0 flex-1 ${vertical ? '' : 'min-w-[190px]'} rounded-lg border py-2 px-2.5 transition-colors ${
            split.picante > 0 ? 'border-flame/50 bg-flame/15' : 'border-white/5 bg-white/5'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-ember select-none">Picante</span>
              <div className="flex items-center gap-1.5 bg-void/50 rounded-lg p-0.5 border border-white/5 shrink-0">
                <button
                  type="button"
                  className="size-7 flex items-center justify-center rounded-md bg-white/5 text-cream hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 text-sm font-bold"
                  onClick={() => handleDecrement('picante')}
                  disabled={split.picante === 0 || sum <= minSum}
                >
                  -
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={picanteStr}
                  onChange={(e) => handleTextChange('picante', e.target.value)}
                  onBlur={() => handleBlur('picante')}
                  className="w-8 text-center font-bold text-cream text-sm bg-transparent outline-none border-b border-transparent focus:border-flame/45 py-0.5"
                />
                <button
                  type="button"
                  className="size-7 flex items-center justify-center rounded-md bg-flame/20 text-flame hover:bg-flame/30 hover:text-gold transition-all active:scale-95 text-sm font-bold"
                  onClick={() => handleIncrement('picante')}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Tradicional Control */}
          <div className={`flex-grow flex-shrink-0 flex-1 ${vertical ? '' : 'min-w-[190px]'} rounded-lg border py-2 px-2.5 transition-colors ${
            split.tradicional > 0 ? 'border-gold/50 bg-gold/15' : 'border-white/5 bg-white/5'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-amber-200 select-none">Tradicional</span>
              <div className="flex items-center gap-1.5 bg-void/50 rounded-lg p-0.5 border border-white/5 shrink-0">
                <button
                  type="button"
                  className="size-7 flex items-center justify-center rounded-md bg-white/5 text-cream hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 text-sm font-bold"
                  onClick={() => handleDecrement('tradicional')}
                  disabled={split.tradicional === 0 || sum <= minSum}
                >
                  -
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={tradicionalStr}
                  onChange={(e) => handleTextChange('tradicional', e.target.value)}
                  onBlur={() => handleBlur('tradicional')}
                  className="w-8 text-center font-bold text-cream text-sm bg-transparent outline-none border-b border-transparent focus:border-gold/45 py-0.5"
                />
                <button
                  type="button"
                  className="size-7 flex items-center justify-center rounded-md bg-gold/20 text-gold hover:bg-gold/30 hover:text-yellow-200 transition-all active:scale-95 text-sm font-bold"
                  onClick={() => handleIncrement('tradicional')}
                >
                  +
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div id={id} className={`relative overflow-hidden rounded-xl border border-white/10 p-4 transition-all duration-300 ${
      sum > 0 ? 'bg-void/60 shadow-lg shadow-flame/10' : 'bg-void/40'
    }`}>
      {/* Background Animations */}
      {variant === 'flame' && sum > 0 && (
        <div className="absolute inset-0 bg-gradient-to-t from-flame/20 to-transparent opacity-50 animate-pulse pointer-events-none" />
      )}
      {variant === 'grill' && sum > 0 && (
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
          backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(255, 100, 0, 0.2) 10px, rgba(255, 100, 0, 0.2) 12px)'
        }} />
      )}
      {variant === 'admin-fire' && sum > 0 && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-ember/35 via-flame/15 to-transparent blur-md"></div>
          <div className="absolute bottom-0 left-0 right-0 h-full bg-gradient-to-t from-flame/40 via-gold/15 to-transparent opacity-60 mix-blend-screen filter blur-xs animate-pulse duration-[3s]"></div>
          {[...Array(12)].map((_, i) => {
            const size = Math.random() * 3 + 2;
            const left = Math.random() * 100;
            const duration = Math.random() * 4 + 4;
            const delay = Math.random() * -8;
            const color = i % 3 === 0 ? 'bg-gold' : i % 3 === 1 ? 'bg-flame' : 'bg-ember';
            return (
              <div
                key={i}
                className={`absolute bottom-0 rounded-full opacity-0 animate-ember ${color}`}
                style={{
                  left: `${left}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  animationDuration: `${duration}s`,
                  animationDelay: `${delay}s`,
                  filter: 'blur(0.5px)',
                }}
              />
            );
          })}
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <h4 className="text-sm font-semibold text-cream tracking-wide uppercase flex items-center gap-2">
          🔥 Elige el tipo de chorizo
        </h4>
      </div>

      {/* Controls Container - Horizontal when space permits, vertical when constrained */}
      <div className={`relative z-10 flex ${vertical ? 'flex-col' : 'flex-wrap'} gap-3`}>
        
        {/* Picante Control */}
        <div className={`flex-grow flex-shrink-0 flex-1 ${vertical ? '' : 'min-w-[190px]'} rounded-lg border py-2 px-2.5 transition-colors ${
          split.picante > 0 ? 'border-flame/50 bg-flame/10' : 'border-white/5 bg-white/5'
        }`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-ember select-none">Picante</span>
            <div className="flex items-center gap-1.5 bg-void/50 rounded-lg p-0.5 border border-white/5 shrink-0">
              <button
                type="button"
                className="size-7 flex items-center justify-center rounded-md bg-white/5 text-cream hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 text-sm font-bold"
                onClick={() => handleDecrement('picante')}
                disabled={split.picante === 0 || sum <= minSum}
              >
                -
              </button>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={picanteStr}
                onChange={(e) => handleTextChange('picante', e.target.value)}
                onBlur={() => handleBlur('picante')}
                className="w-8 text-center font-bold text-cream text-sm bg-transparent outline-none border-b border-transparent focus:border-flame/45 py-0.5"
              />
              <button
                type="button"
                className="size-7 flex items-center justify-center rounded-md bg-flame/20 text-flame hover:bg-flame/30 hover:text-gold transition-all active:scale-95 text-sm font-bold"
                onClick={() => handleIncrement('picante')}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Tradicional Control */}
        <div className={`flex-grow flex-shrink-0 flex-1 ${vertical ? '' : 'min-w-[190px]'} rounded-lg border py-2 px-2.5 transition-colors ${
          split.tradicional > 0 ? 'border-gold/50 bg-gold/10' : 'border-white/5 bg-white/5'
        }`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-amber-200 select-none">Tradicional</span>
            <div className="flex items-center gap-1.5 bg-void/50 rounded-lg p-0.5 border border-white/5 shrink-0">
              <button
                type="button"
                className="size-7 flex items-center justify-center rounded-md bg-white/5 text-cream hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 text-sm font-bold"
                onClick={() => handleDecrement('tradicional')}
                disabled={split.tradicional === 0 || sum <= minSum}
              >
                -
              </button>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={tradicionalStr}
                onChange={(e) => handleTextChange('tradicional', e.target.value)}
                onBlur={() => handleBlur('tradicional')}
                className="w-8 text-center font-bold text-cream text-sm bg-transparent outline-none border-b border-transparent focus:border-gold/45 py-0.5"
              />
              <button
                type="button"
                className="size-7 flex items-center justify-center rounded-md bg-gold/20 text-gold hover:bg-gold/30 hover:text-yellow-200 transition-all active:scale-95 text-sm font-bold"
                onClick={() => handleIncrement('tradicional')}
              >
                +
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
