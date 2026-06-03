import { useMemo } from 'react';

type Props = {
  className?: string;
};

// Stable pseudo-random data to prevent layout thrashing and flickering on re-renders
const EMBER_PARTICLES = [...Array(14)].map((_, i) => {
  const size = ((i * 3) % 4) + 2.5; // size between 2.5px and 5.5px
  const left = (i * 7.7) % 100; // pseudo-random distribution
  const duration = 4 + ((i * 1.3) % 4); // duration between 4s and 8s
  const delay = -1 * ((i * 2.3) % 8); // delay between -8s and 0s
  const color = i % 3 === 0 ? 'bg-gold' : i % 3 === 1 ? 'bg-flame' : 'bg-ember';
  
  return {
    size,
    left,
    duration,
    delay,
    color,
  };
});

export default function FireBackground({ className = "" }: Props) {
  return (
    <div className={`absolute inset-0 pointer-events-none z-0 overflow-hidden ${className}`}>
      {/* Flame glow and gradient overlays - slightly boosted for visibility on smaller containers */}
      <div className="absolute inset-0 bg-gradient-to-t from-ember/45 via-flame/18 to-transparent blur-md"></div>
      <div className="absolute bottom-0 left-0 right-0 h-full bg-gradient-to-t from-flame/45 via-gold/18 to-transparent opacity-70 mix-blend-screen filter blur-xs animate-pulse duration-[2.5s]"></div>
      
      {/* Floating ember particles */}
      {EMBER_PARTICLES.map((particle, i) => (
        <div
          key={i}
          className={`absolute bottom-0 rounded-full opacity-0 animate-ember ${particle.color}`}
          style={{
            left: `${particle.left}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
            filter: 'blur(0.5px)',
          }}
        />
      ))}
    </div>
  );
}
