import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { allMenuItems } from '../data/menu.ts';
import {
  buildCartLinesForItem,
  defaultMeatSplit,
  previewItemTotal,
  validateMeatSplit,
} from './meat-style.ts';

describe('meat style split', () => {
  const choriarepa = allMenuItems.find((i) => i.id === 'choriarepa')!;
  const extraCarne = allMenuItems.find((i) => i.id === 'extra-chorizo-carne')!;

  it('splits 2 choriarepas into separate cart lines', () => {
    const lines = buildCartLinesForItem(choriarepa, 2, {
      picante: 1,
      tradicional: 1,
    });
    assert.equal(lines.length, 2);
    assert.equal(
      lines.find((l) => l.modifierLabels.includes('Picante'))?.quantity,
      1,
    );
    assert.equal(
      lines.find((l) => l.modifierLabels.includes('Tradicional'))?.quantity,
      1,
    );
    assert.equal(previewItemTotal(choriarepa, 2, { picante: 1, tradicional: 1 }), 20_000);
  });

  it('allows 3 picantes for extra chorizo', () => {
    const lines = buildCartLinesForItem(extraCarne, 3, {
      picante: 3,
      tradicional: 0,
    });
    assert.equal(lines.length, 1);
    assert.equal(lines[0].quantity, 3);
    assert.equal(lines[0].lineTotal, 21_000);
  });

  it('rejects invalid split', () => {
    assert.ok(validateMeatSplit(2, { picante: 1, tradicional: 0 }));
    assert.equal(validateMeatSplit(2, { picante: 1, tradicional: 1 }), null);
  });
});
