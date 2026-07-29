import { useState } from 'react';
import { createPortal } from 'react-dom';

interface ShiftCloseModalProps {
  loading: boolean;
  onConfirm: (downloadCsv: boolean) => Promise<void>;
  onCancel: () => void;
}

export default function ShiftCloseModal({
  loading,
  onConfirm,
  onCancel,
}: ShiftCloseModalProps) {
  const [downloadCsv, setDownloadCsv] = useState(true);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-void/85 p-4 backdrop-blur-md">
      <div className="card-ash w-full max-w-sm flex flex-col gap-4 p-6 shadow-2xl border border-flame/30">
        <h3 className="font-display text-lg text-fire text-center">
          Confirmar Cierre de Caja
        </h3>
        <p className="text-sm text-smoke text-center leading-relaxed">
          ¿Estás seguro de que deseas cerrar el turno activo y cambiar el estado de la
          tienda a cerrada?
        </p>

        <label className="flex items-center justify-center gap-2 cursor-pointer py-2 text-sm text-cream hover:text-gold transition">
          <input
            type="checkbox"
            checked={downloadCsv}
            onChange={(e) => setDownloadCsv(e.target.checked)}
            className="accent-flame w-4 h-4 cursor-pointer"
          />
          Descargar reporte balance en CSV
        </label>

        <div className="flex gap-2 mt-2">
          <button
            type="button"
            className="btn-fire flex-1 py-2.5 text-sm"
            onClick={() => onConfirm(downloadCsv)}
            disabled={loading}
          >
            {loading ? 'Cerrando…' : 'Confirmar y Cerrar'}
          </button>
          <button
            type="button"
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-smoke hover:text-cream transition flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
