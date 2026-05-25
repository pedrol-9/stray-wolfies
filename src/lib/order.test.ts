import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAdicionalesFor, allMenuItems } from '../data/menu.ts';
import { calcLineTotal, cartSubtotal, newCartLine } from './order.ts';

describe('order totals', () => {
  const choriarepa = allMenuItems.find((i) => i.id === 'choriarepa')!;
  const extraQueso = allMenuItems.find((i) => i.id === 'extra-queso')!;
  const mods = { estilo: ['picante'] };

  it('multiplies main dish price by quantity', () => {
    assert.equal(calcLineTotal(choriarepa, 2, mods), 16_000);
  });

  it('multiplies addon price by quantity', () => {
    assert.equal(calcLineTotal(extraQueso, 3, {}), 3_000);
  });

  it('sums cart lines including multiple addon qty', () => {
    const lines = [
      newCartLine(choriarepa, 1, mods),
      newCartLine(extraQueso, 2, mods),
    ];
    assert.equal(cartSubtotal(lines), 10_000);
  });

  it('adicionales list respects plato', () => {
    const forChori = getAdicionalesFor('choriarepa');
    assert.ok(forChori.some((a) => a.id === 'enchula-choriarepa'));
    assert.ok(forChori.length >= 3);
  });
});
