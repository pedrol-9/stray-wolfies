interface AdminLoginScreenProps {
  pin: string;
  onPinChange: (pin: string) => void;
  onLogin: () => void;
  loading: boolean;
  error: string;
}

export default function AdminLoginScreen({
  pin,
  onPinChange,
  onLogin,
  loading,
  error,
}: AdminLoginScreenProps) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6 text-center">
      <h1 className="font-display text-3xl text-fire animate-in fade-in duration-300">
        Callejero Administrador
      </h1>
      <p className="text-sm text-smoke">Pedidos, producción y tienda.</p>
      <input
        type="password"
        inputMode="numeric"
        placeholder="PIN de admin"
        value={pin}
        onChange={(e) => onPinChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && pin) {
            onLogin();
          }
        }}
        className="rounded-xl border border-white/15 bg-ash px-4 py-3 text-cream outline-none focus:border-flame focus:ring-2 focus:ring-flame/15 transition text-center text-lg tracking-widest font-bold"
      />
      {error && (
        <p className="text-sm font-semibold text-ember animate-shake">{error}</p>
      )}
      <button
        type="button"
        className="btn-fire py-3 text-sm font-semibold cursor-pointer"
        disabled={loading}
        onClick={onLogin}
      >
        {loading ? 'Entrando…' : 'Entrar'}
      </button>
    </div>
  );
}
