export type MoneyCOP = number;

export type ModifierOption = {
  id: string;
  label: string;
  price: MoneyCOP;
};

export type ModifierGroup = {
  id: string;
  label: string;
  required?: boolean;
  min?: number;
  max?: number;
  options: ModifierOption[];
};

export type MenuItem = {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  price: MoneyCOP;
  category: 'plato' | 'bebida' | 'adicional';
  image?: string;
  modifierGroups?: ModifierGroup[];
  /** Solo aplica a un plato (ej. enchula choriarepa) */
  appliesTo?: string[];
};

export type MenuSection = {
  id: string;
  title: string;
  items: MenuItem[];
};
