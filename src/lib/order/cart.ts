import type { MenuItem } from '../../types/menu';
import type { CartLine, SelectedModifiers } from '../../types/order';

export function calcLineTotal(
  item: MenuItem,
  quantity: number,
  modifiers: SelectedModifiers,
): number {
  let extra = 0;
  for (const group of item.modifierGroups ?? []) {
    const selected = modifiers[group.id] ?? [];
    for (const optId of selected) {
      const opt = group.options.find((o) => o.id === optId);
      if (opt) extra += opt.price;
    }
  }
  return (item.price + extra) * quantity;
}

export function modifierLabels(
  item: MenuItem,
  modifiers: SelectedModifiers,
): string[] {
  const labels: string[] = [];
  for (const group of item.modifierGroups ?? []) {
    const selected = modifiers[group.id] ?? [];
    for (const optId of selected) {
      const opt = group.options.find((o) => o.id === optId);
      if (opt) labels.push(opt.label);
    }
  }
  return labels;
}

/** Grupos que no son el reparto picante/tradicional por cantidad */
export function hasNonMeatModifiers(item: MenuItem): boolean {
  return (item.modifierGroups ?? []).some((g) => g.id !== 'estilo');
}

export function newCartLine(
  item: MenuItem,
  quantity: number,
  modifiers: SelectedModifiers,
): CartLine {
  const mods = modifierLabels(item, modifiers);
  return {
    id: crypto.randomUUID(),
    menuItemId: item.id,
    name: item.name,
    unitPrice: item.price,
    quantity,
    modifiers,
    modifierLabels: mods,
    lineTotal: calcLineTotal(item, quantity, modifiers),
  };
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.lineTotal, 0);
}
