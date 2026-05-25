import type { MenuSection } from '../types/menu';

/** Picante / tradicional — obligatorio en platos con chorizo o carne */
export const MEAT_STYLE_GROUP = {
  id: 'estilo',
  label: 'Estilo del chorizo / carne',
  required: true,
  min: 1,
  max: 1,
  options: [
    { id: 'picante', label: 'Picante', price: 0 },
    { id: 'tradicional', label: 'Tradicional', price: 0 },
  ],
} as const;

export const menu: MenuSection[] = [
  {
    id: 'platos',
    title: 'Platos',
    items: [
      {
        id: 'choriarepa',
        name: 'Choriarepa',
        tagline: 'Clásico que nunca falla',
        description:
          'Chorizo picante o tradicional (16 cm) + arepa blanca con queso + limón.',
        price: 8000,
        category: 'plato',
        modifierGroups: [MEAT_STYLE_GROUP],
      },
      {
        id: 'choriperro',
        name: 'Choriperro',
        tagline: 'El perro callejero más salvaje de la manada',
        description:
          'Chorizo picante o tradicional (16 cm) + pan brioche + papa fosforito + cebolla caramelizada + queso + salsas de la casa.',
        price: 12000,
        category: 'plato',
        modifierGroups: [MEAT_STYLE_GROUP],
      },
      {
        id: 'hamburguesa',
        name: 'Hamburguesa',
        tagline: 'La bestia que viene a devorarlo todo',
        description:
          '160 g de carne de chorizo picante o tradicional + pan brioche a la plancha + doble queso + cebolla caramelizada + tomate verde + salsas de la casa.',
        price: 14000,
        category: 'plato',
        modifierGroups: [MEAT_STYLE_GROUP],
      },
    ],
  },
  {
    id: 'adicionales',
    title: 'Adicionales',
    items: [
      {
        id: 'extra-chorizo-carne',
        name: 'Adicional chorizo o carne',
        description: 'Picante o tradicional. Para hamburguesa o platos con chorizo.',
        price: 7000,
        category: 'adicional',
        modifierGroups: [MEAT_STYLE_GROUP],
        appliesTo: ['choriarepa', 'choriperro', 'hamburguesa'],
      },
      {
        id: 'extra-queso',
        name: 'Adicional de queso',
        price: 1000,
        category: 'adicional',
        appliesTo: ['choriarepa', 'choriperro', 'hamburguesa'],
      },
      {
        id: 'enchula-choriarepa',
        name: 'Enchula tu Choriarepa',
        description:
          'Queso, papa fosforito, cebolla caramelizada y salsas de la casa.',
        price: 2000,
        category: 'adicional',
        appliesTo: ['choriarepa'],
      },
    ],
  },
  {
    id: 'bebidas',
    title: 'Gaseosas',
    items: [
      { id: 'agua-pequena', name: 'Agua pequeña', price: 1000, category: 'bebida' },
      {
        id: 'agua-personal',
        name: 'Agua personal',
        description: 'Natural o con gas',
        price: 2500,
        category: 'bebida',
      },
      { id: 'jugo-hit', name: 'Jugo Hit', price: 3500, category: 'bebida' },
      { id: 'coca-personal', name: 'Coca-Cola personal', price: 3500, category: 'bebida' },
      { id: 'quatro-personal', name: 'Quatro personal', price: 3500, category: 'bebida' },
      { id: 'coca-1l', name: 'Coca-Cola 1 L', price: 6000, category: 'bebida' },
      { id: 'coca-1-5l', name: 'Coca-Cola 1,5 L', price: 8000, category: 'bebida' },
    ],
  },
];

export const allMenuItems = menu.flatMap((s) => s.items);

export function getMenuItem(id: string) {
  return allMenuItems.find((i) => i.id === id);
}

export function getAdicionalesFor(platoId: string) {
  return menu
    .find((s) => s.id === 'adicionales')!
    .items.filter((a) => !a.appliesTo || a.appliesTo.includes(platoId));
}
