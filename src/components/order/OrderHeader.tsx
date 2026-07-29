import { SCHEDULE_LABEL } from "../../lib/constants";
import type { ShopStatus } from "../../types/shop";

interface OrderHeaderProps {
  shop: ShopStatus | null;
  ownerWhatsApp: string;
  instagramUrl: string;
}

export default function OrderHeader({
  shop,
  ownerWhatsApp,
  instagramUrl,
}: OrderHeaderProps) {
  return (
    <header className="mb-8 text-center flex flex-col items-center animate-in fade-in duration-500">
      <div className="relative mb-4 group select-none">
        {/* Subtle background fire glow under the logo */}
        <div className="absolute -inset-1 bg-gradient-to-r from-ember via-flame to-gold rounded-full blur-xl opacity-20 group-hover:opacity-35 transition duration-500"></div>
        <img
          src="/logo.jpg"
          alt="Callejeros Logo"
          className="relative size-32 md:size-40 rounded-full border border-white/10 object-cover shadow-2xl shadow-flame/15 group-hover:scale-105 transition-all duration-300"
        />
      </div>
      <p className="mt-2 text-sm md:text-base text-smoke font-semibold uppercase tracking-wider">
        Sabor brutal directo al fuego
      </p>
      <p className="mt-1 text-xs md:text-sm text-smoke/70">
        Horario habitual: {shop?.scheduleLabel ?? SCHEDULE_LABEL}
      </p>

      {/* Botón de WhatsApp y de Instagram con diseño premium */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <a
          href={`https://wa.me/${ownerWhatsApp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-emerald-950/20 group/wa"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="transition-transform group-hover/wa:rotate-12"
          >
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.528 2.01 14.069.99 11.45 1.004c-5.436 0-9.866 4.372-9.87 9.802 0 1.972.517 3.896 1.501 5.623L2.096 20.39l4.551-1.236zm12.502-6.525c-.347-.174-2.054-1.014-2.37-1.129-.317-.116-.548-.174-.78.174-.23.347-.893 1.129-1.095 1.36-.202.23-.404.26-.75.087-.348-.174-1.468-.542-2.798-1.728-1.034-.922-1.733-2.06-1.936-2.407-.202-.347-.022-.534.152-.708.157-.156.347-.405.52-.608.174-.203.23-.347.347-.579.117-.23.058-.433-.03-.608-.088-.174-.78-1.88-1.069-2.575-.283-.68-.567-.587-.78-.598-.201-.01-.433-.012-.664-.012-.23 0-.607.087-.923.434-.317.347-1.21 1.186-1.21 2.894 0 1.708 1.24 3.359 1.413 3.59.173.23 2.44 3.725 5.912 5.228.825.357 1.47.57 1.97.73.83.264 1.585.227 2.182.138.665-.1 2.054-.84 2.343-1.652.289-.812.289-1.506.202-1.652-.087-.145-.317-.23-.664-.405z" />
          </svg>
          <span>WhatsApp</span>
        </a>

        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center p-2.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 hover:border-pink-500/40 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-pink-950/10 group/ig"
          aria-label="Instagram"
          title="Instagram"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform group-hover/ig:rotate-6"
          >
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
        </a>
      </div>
    </header>
  );
}
