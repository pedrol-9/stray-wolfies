interface OrderSuccessScreenProps {
  orderCode: string;
  onReset: () => void;
}

export default function OrderSuccessScreen({
  orderCode,
  onReset,
}: OrderSuccessScreenProps) {
  return (
    <div className="mx-auto w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="card-ash flex flex-col items-center gap-6 p-8 text-center shadow-xl shadow-flame/5 border-flame/20">
        <div className="relative size-24 md:size-28 rounded-full border-2 border-gold/40 shadow-lg shadow-flame/10 overflow-hidden animate-bounce select-none">
          <img
            src="/logo.jpg"
            alt="Callejeros Success"
            className="size-full object-cover"
          />
        </div>
        <h2 className="font-display text-3xl text-fire">¡Pedido recibido!</h2>
        <div className="w-full rounded-xl bg-void/50 border border-white/5 py-4 px-6">
          <p className="text-xs text-smoke uppercase tracking-wider">Tu código de pedido</p>
          <p className="text-3xl font-mono font-bold text-gold mt-1">{orderCode}</p>
        </div>
        <p className="text-sm leading-relaxed text-smoke">
          Guarda tu código. El equipo se comunicará contigo al WhatsApp que dejaste para confirmar el tiempo estimado de entrega o recogida.
        </p>
        <button
          type="button"
          className="btn-fire w-full cursor-pointer"
          onClick={onReset}
        >
          Hacer otro pedido
        </button>
      </div>
    </div>
  );
}
