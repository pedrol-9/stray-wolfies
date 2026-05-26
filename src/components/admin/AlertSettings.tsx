import { setPushEnabled, setSoundEnabled } from "../../lib/admin-notify-prefs";

interface AlertSettingsProps {
  soundOn: boolean;
  setSoundOn: (val: boolean) => void;
  pushOn: boolean;
  setPushOn: (val: boolean) => void;
  pushPermission: NotificationPermission;
  enablePush: () => Promise<void>;
  testAlertSound: () => void;
}

export default function AlertSettings({
  soundOn,
  setSoundOn,
  pushOn,
  setPushOn,
  pushPermission,
  enablePush,
  testAlertSound,
}: AlertSettingsProps) {
  return (
    <section className="card-ash flex flex-col gap-3 p-4 text-left text-sm">
      <p className="font-semibold text-cream">Alertas de pedidos nuevos</p>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={soundOn}
          onChange={(e) => {
            setSoundOn(e.target.checked);
            setSoundEnabled(e.target.checked);
          }}
          className="accent-flame"
        />
        Sonido en el panel
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={pushOn}
          onChange={(e) => {
            setPushOn(e.target.checked);
            setPushEnabled(e.target.checked);
          }}
          className="accent-flame"
        />
        Notificación del navegador
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs transition hover:border-cream/30"
          onClick={testAlertSound}
        >
          Probar sonido
        </button>
        {pushPermission !== "granted" && (
          <button
            type="button"
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs transition hover:border-cream/30"
            onClick={enablePush}
          >
            Activar avisos
          </button>
        )}
      </div>
      <p className="text-xs text-smoke">
        Deja esta pestaña abierta en el celular de cocina. El sonido suena al
        detectar pedidos nuevos (estado “por aceptar”).
      </p>
    </section>
  );
}
