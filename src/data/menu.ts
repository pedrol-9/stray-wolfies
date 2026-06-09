import type { MenuSection, ModifierGroup } from '../types/menu';

/** Picante / tradicional — obligatorio en platos con chorizo o carne */
export const MEAT_STYLE_GROUP: ModifierGroup = {
  id: 'estilo',
  label: 'Estilo del chorizo / carne',
  required: true,
  min: 1,
  max: 1,
  options: [
    { id: 'picante', label: 'Picante', price: 0 },
    { id: 'tradicional', label: 'Tradicional', price: 0 },
  ],
};

export const menu: MenuSection[] = [
  {
    id: 'platos',
    title: 'Platos',
    items: [
      {
        id: 'chorizo-triste',
        name: 'Chorizo Triste',
        tagline: 'Simple pero potente',
        description: 'Un chorizo.',
        price: 7000,
        category: 'plato',
        modifierGroups: [MEAT_STYLE_GROUP],
      },
      {
        id: 'choriarepa',
        name: 'Epa La Arepa',
        tagline: 'El clásico de la calle',
        description: 'Chorizo, arepa y limón, nada más.',
        price: 10000,
        category: 'plato',
        modifierGroups: [MEAT_STYLE_GROUP],
      },
      {
        id: 'enchularepa',
        name: 'Enchularepa',
        tagline: 'Al estilo mexicano con sabor de calle',
        description:
          'Como un taco pero con arepa, chorizo, queso, cebolla caramelizada, ripio de papa y salsas.',
        price: 13000,
        category: 'plato',
        modifierGroups: [MEAT_STYLE_GROUP],
      },
      {
        id: 'choriperro',
        name: 'El Callejero',
        tagline: 'El propio perro callejero',
        description:
          'Viene con pan brioche, chorizo, cebolla caramelizada, ripio de papa, queso y salsas de la casa.',
        price: 13000,
        category: 'plato',
        modifierGroups: [MEAT_STYLE_GROUP],
      },
      {
        id: 'hamburguesa',
        name: 'La Vagabunda',
        tagline: 'La reina de la casa',
        description:
          'Prima del callejero, hamburguesa que viene con pan brioche, 160 gr de carne de cerdo, cebolla caramelizada, ripio de papa, mix de quesos, tomate verde y salsas de la casa.',
        price: 15000,
        category: 'plato',
        modifierGroups: [MEAT_STYLE_GROUP],
      },
      {
        id: 'burguearepa-vagabunda',
        name: 'Burguearepa Vagabunda',
        tagline: 'La versión más criolla',
        description:
          'Hermana de la vagabunda, es más criollita lo mismo que ella pero con arepa. Arepaburguer que viene con arepa, 160 gr de carne de cerdo, cebolla caramelizada, ripio de papa, mix de quesos, tomate verde y salsas de la casa.',
        price: 15000,
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
        id: 'extra-carne-hamburguesa',
        name: 'Adicional carne de hamburguesa',
        description: 'Picante o tradicional.',
        price: 7500,
        category: 'adicional',
        modifierGroups: [MEAT_STYLE_GROUP],
      },
      {
        id: 'extra-chorizo-carne',
        name: 'Adicional de chorizo',
        description: 'Picante o tradicional.',
        price: 7000,
        category: 'adicional',
        modifierGroups: [MEAT_STYLE_GROUP],
      },
      {
        id: 'extra-tocineta',
        name: 'Adicional de tocineta ahumada',
        price: 3000,
        category: 'adicional',
      },
      {
        id: 'extra-queso',
        name: 'Adicional de queso',
        price: 1500,
        category: 'adicional',
      },
      {
        id: 'extra-cebolla',
        name: 'Adicional de cebolla caramelizada',
        price: 1000,
        category: 'adicional',
      },
      {
        id: 'extra-pepinillos',
        name: 'Adicional de pepinillos agridulces',
        price: 1000,
        category: 'adicional',
      },
      {
        id: 'extra-jalapenos',
        name: 'Adicional de jalapeños',
        price: 1000,
        category: 'adicional',
      },
    ],
  },
  {
    id: 'bebidas',
    title: 'Gaseosas',
    items: [
      { id: 'coca-personal', name: 'Coca Pers', price: 3500, category: 'bebida' },
      { id: 'quatro-personal', name: 'Quatro Pers', price: 3500, category: 'bebida' },
      { id: 'coca-1-5l', name: 'Coca 1.5', price: 8000, category: 'bebida' },
      { id: 'coca-1l', name: 'Coca 1LTR', price: 6000, category: 'bebida' },
      { id: 'jugo-hit', name: 'Jugo Hit Mini', price: 2500, category: 'bebida' },
      { id: 'agua-con-gas', name: 'Agua con gas', price: 3000, category: 'bebida' },
      { id: 'agua-sin-gas', name: 'Agua sin gas', price: 2500, category: 'bebida' },
      { id: 'agua-mini', name: 'Agua mini', price: 1000, category: 'bebida' },
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
