/** Efecto visual de brasas / chispas animadas para el fondo del panel admin */
export default function EmberBackground() {
  const embers = Array.from({ length: 20 }, (_, i) => ({
    size: Math.random() * 3 + 2,
    left: Math.random() * 100,
    duration: Math.random() * 4 + 4,
    delay: Math.random() * -8,
    color: i % 3 === 0 ? 'bg-gold' : i % 3 === 1 ? 'bg-flame' : 'bg-ember',
  }));

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[40vh] pointer-events-none overflow-hidden z-[-1] select-none">
      {/* Warm Grill Glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-ember/35 via-flame/15 to-transparent blur-md" />
      {/* Heat Wave Pulse */}
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-flame/40 via-gold/15 to-transparent opacity-60 mix-blend-screen filter blur-xs animate-pulse duration-[3s]" />
      {/* Sparks / Embers */}
      <div className="absolute inset-0">
        {embers.map((ember, i) => (
          <div
            key={i}
            className={`absolute bottom-0 rounded-full opacity-0 animate-ember ${ember.color}`}
            style={{
              left: `${ember.left}%`,
              width: `${ember.size}px`,
              height: `${ember.size}px`,
              animationDuration: `${ember.duration}s`,
              animationDelay: `${ember.delay}s`,
              filter: 'blur(0.5px)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
