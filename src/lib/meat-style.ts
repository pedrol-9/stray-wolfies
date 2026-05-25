import type { MenuItem } from '../types/menu';
import type { CartLine, SelectedModifiers } from '../types/order';
import { newCartLine } from './order.ts';

export const MEAT_STYLE_GROUP_ID = 'estilo';

export type MeatStyleSplit = {
  picante: number;
  tradicional: number;
};

export function meatSplitSum(split: MeatStyleSplit): number {
  return split.picante + split.tradicional;
}

export function defaultMeatSplit(total: number): MeatStyleSplit {
  return { picante: total, tradicional: 0 };
}

export function itemNeedsMeatStyle(item: MenuItem): boolean {
  return (item.modifierGroups ?? []).some(
    (g) => g.id === MEAT_STYLE_GROUP_ID && g.required,
  );
}

/** Mantiene picante + tradicional = total al cambiar la cantidad del ítem */
export function adjustMeatSplitToTotal(
  split: MeatStyleSplit,
  total: number,
): MeatStyleSplit {
  const sum = meatSplitSum(split);
  if (sum === total) return split;
  if (sum < total) {
    return { ...split, picante: split.picante + (total - sum) };
  }
  let picante = split.picante;
  let tradicional = split.tradicional;
  let remove = sum - total;
  while (remove > 0 && picante > 0) {
    picante--;
    remove--;
  }
  while (remove > 0 && tradicional > 0) {
    tradicional--;
    remove--;
  }
  return { picante, tradicional };
}

export function validateMeatSplit(
  total: number,
  split: MeatStyleSplit,
): string | null {
  if (total <= 0) return null;
  const sum = meatSplitSum(split);
  if (sum === 0) return 'Indica cuántas picantes y cuántas tradicionales.';
  if (sum !== total) {
    return `Deben sumar ${total} (tienes ${sum}: ${split.picante} picante, ${split.tradicional} tradicional).`;
  }
  return null;
}

/** Una línea de carrito por estilo (cocina ve picante/tradicional separado) */
export function buildCartLinesForItem(
  item: MenuItem,
  totalQty: number,
  meatSplit: MeatStyleSplit | null,
  otherModifiers: SelectedModifiers = {},
): CartLine[] {
  if (totalQty <= 0) return [];

  if (itemNeedsMeatStyle(item)) {
    const split = meatSplit ?? defaultMeatSplit(0);
    const lines: CartLine[] = [];
    if (split.picante > 0) {
      lines.push(
        newCartLine(item, split.picante, {
          ...otherModifiers,
          [MEAT_STYLE_GROUP_ID]: ['picante'],
        }),
      );
    }
    if (split.tradicional > 0) {
      lines.push(
        newCartLine(item, split.tradicional, {
          ...otherModifiers,
          [MEAT_STYLE_GROUP_ID]: ['tradicional'],
        }),
      );
    }
    return lines;
  }

  return [newCartLine(item, totalQty, otherModifiers)];
}

export function previewItemTotal(
  item: MenuItem,
  totalQty: number,
  meatSplit: MeatStyleSplit | null,
): number {
  return buildCartLinesForItem(item, totalQty, meatSplit).reduce(
    (sum, line) => sum + line.lineTotal,
    0,
  );
}
