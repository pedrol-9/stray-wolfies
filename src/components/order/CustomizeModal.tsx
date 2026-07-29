import { getAdicionalesFor } from "../../data/menu";
import { formatCOP } from "../../lib/format";
import {
  defaultMeatSplit,
  itemNeedsMeatStyle,
  previewItemTotal,
  type MeatStyleSplit,
} from "../../lib/meat-style";
import type { MenuItem } from "../../types/menu";
import FireBackground from "./FireBackground";
import PremiumMeatStyleSelector from "./PremiumMeatStyleSelector";
import QuantityStepper from "./QuantityStepper";

function meatSplitSumSafe(split?: MeatStyleSplit) {
  if (!split) return 0;
  return split.picante + split.tradicional;
}

interface CustomizeModalProps {
  editing: MenuItem;
  quantity: number;
  mainMeatSplit: MeatStyleSplit;
  addonQuantities: Record<string, number>;
  addonMeatSplits: Record<string, MeatStyleSplit>;
  expandedAddons: Record<string, boolean>;
  customizePreviewTotal: number;
  onClose: () => void;
  onMainQuantityChange: (qty: number) => void;
  onMainMeatSplitChange: (split: MeatStyleSplit) => void;
  onAddonQuantityChange: (addon: MenuItem, qty: number) => void;
  onAddonMeatSplitChange: (addonId: string, split: MeatStyleSplit) => void;
  onToggleExpandAddon: (addonId: string) => void;
  onConfirm: () => void;
}

export default function CustomizeModal({
  editing,
  quantity,
  mainMeatSplit,
  addonQuantities,
  addonMeatSplits,
  expandedAddons,
  customizePreviewTotal,
  onClose,
  onMainQuantityChange,
  onMainMeatSplitChange,
  onAddonQuantityChange,
  onAddonMeatSplitChange,
  onToggleExpandAddon,
  onConfirm,
}: CustomizeModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md animate-in fade-in duration-200 md:bg-void/85"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg card-ash p-4 sm:p-5 md:p-6 shadow-2xl shadow-flame/15 max-h-[90vh] overflow-y-auto scrollbar-thin animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
          <h3 className="font-display text-xl text-gold">Personalizar</h3>
          <button
            type="button"
            className="text-smoke hover:text-cream text-lg font-bold size-8 flex items-center justify-center rounded-full hover:bg-white/5 transition cursor-pointer"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div
          id="selected-product-card"
          className={`relative overflow-hidden flex flex-col gap-4 bg-void/30 p-3.5 rounded-xl border border-white/5 mb-4 transition-all duration-300 ${
            quantity > 0 ? "bg-void/60 shadow-lg shadow-flame/10" : "bg-void/40"
          }`}
        >
          {quantity > 0 && <FireBackground />}
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-lg md:text-xl text-cream">
                {editing.name}
              </h2>
              <p className="font-semibold text-gold text-sm">
                {formatCOP(editing.price)} c/u
              </p>
            </div>
            {itemNeedsMeatStyle(editing) ? (
              <div className="text-right">
                <div className="text-xs text-smoke uppercase tracking-wider mb-1">
                  Cantidad
                </div>
                <div className="text-2xl font-display text-gold">{quantity}</div>
              </div>
            ) : (
              <QuantityStepper
                min={1}
                value={quantity}
                onChange={onMainQuantityChange}
              />
            )}
          </div>

          {itemNeedsMeatStyle(editing) && (
            <div className="mt-2 pt-4 border-t border-white/5 relative z-10 w-full">
              <PremiumMeatStyleSelector
                id="main-meat-style-selector"
                split={mainMeatSplit}
                onChange={(split) => {
                  onMainMeatSplitChange(split);
                }}
                minSum={1}
                plain={true}
              />
            </div>
          )}
        </div>

        <div className="space-y-4">
          {editing.category === "plato" && (
            <fieldset className="rounded-xl border border-white/5 bg-void/20 p-3 sm:p-4 animate-in fade-in duration-200">
              <legend className="px-2 text-xs font-semibold text-cream uppercase tracking-wider">
                Adicionales (Opcional)
              </legend>
              <div className="flex flex-col gap-2.5 mt-2">
                {getAdicionalesFor(editing.id).map((addon) => {
                  const qty = addonQuantities[addon.id] ?? 0;
                  const active = qty > 0;
                  const addonSplit =
                    addonMeatSplits[addon.id] ?? defaultMeatSplit(0);

                  const isMeatStyleAddon = itemNeedsMeatStyle(addon);
                  const expanded =
                    !isMeatStyleAddon || (expandedAddons[addon.id] ?? false);

                  return (
                    <div
                      key={addon.id}
                      id={
                        isMeatStyleAddon ? `addon-card-${addon.id}` : undefined
                      }
                      className={`relative overflow-hidden rounded-lg border transition-all duration-200 ${
                        active
                          ? "border-flame bg-void/60 shadow-lg shadow-flame/10"
                          : "border-white/5 bg-ash/50 hover:border-white/15"
                      }`}
                    >
                      <div
                        id={
                          isMeatStyleAddon
                            ? `addon-toggle-trigger-${addon.id}`
                            : undefined
                        }
                        onClick={
                          isMeatStyleAddon
                            ? () => onToggleExpandAddon(addon.id)
                            : undefined
                        }
                        className={`flex items-center justify-between gap-2 p-2.5 relative z-10 ${
                          isMeatStyleAddon
                            ? "cursor-pointer select-none hover:bg-white/5 transition-colors"
                            : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-cream flex items-center gap-1.5">
                            {addon.name}
                            {isMeatStyleAddon && (
                              <span className="text-xs text-smoke font-normal transition-transform duration-200">
                                {expanded ? "▲" : "▼"}
                              </span>
                            )}
                          </p>
                          <p className="text-xs font-semibold text-gold mt-0.5">
                            +{formatCOP(addon.price)} c/u
                            {qty > 0 && (
                              <span className="ml-2 text-cream font-normal">
                                ={" "}
                                {formatCOP(
                                  previewItemTotal(addon, qty, addonSplit),
                                )}
                              </span>
                            )}
                          </p>
                        </div>
                        {!itemNeedsMeatStyle(addon) && (
                          <QuantityStepper
                            size="sm"
                            min={0}
                            value={qty}
                            onChange={(v) => onAddonQuantityChange(addon, v)}
                          />
                        )}
                      </div>

                      {itemNeedsMeatStyle(addon) && expanded && (
                        <div className="px-3 pb-3 border-t border-white/5 relative z-10 animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="mt-3">
                            <PremiumMeatStyleSelector
                              id={
                                isMeatStyleAddon
                                  ? `addon-selector-${addon.id}`
                                  : undefined
                              }
                              split={addonSplit}
                              onChange={(split) => {
                                onAddonMeatSplitChange(addon.id, split);
                                onAddonQuantityChange(
                                  addon,
                                  meatSplitSumSafe(split),
                                );
                              }}
                              minSum={0}
                              plain={true}
                              vertical={true}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          )}
        </div>

        <div className="mt-6 border-t border-white/5 pt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-smoke">Subtotal de este plato:</span>
            <span className="font-bold text-gold text-lg">
              {formatCOP(customizePreviewTotal)}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 rounded-xl border border-white/10 bg-ash/50 py-3 text-sm font-semibold text-cream transition hover:bg-white/5 cursor-pointer"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="flex-2 btn-fire py-3 text-sm font-semibold cursor-pointer"
              onClick={onConfirm}
            >
              Agregar — {formatCOP(customizePreviewTotal)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
