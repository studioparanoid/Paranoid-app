export type NavigationIcon =
  | "calendar"
  | "spark"
  | "map"
  | "ticket"
  | "store"
  | "bookmark"
  | "compass"
  | "orders"
  | "plus"
  | "events"
  | "organizer"
  | "artist"
  | "venue"
  | "visibility"
  | "admin"
  | "settings"
  | "logout"
  | "monitor"
  | "moon"
  | "sun"
  | "check";

export type NavigationItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: NavigationIcon;
};

export const mainNavigation: NavigationItem[] = [
  { href: "/agenda", label: "Agenda", icon: "calendar" },
  { href: "/para-ti", label: "Para ti", icon: "spark" },
  { href: "/mapa", label: "Mapa", icon: "map" },
  { href: "/bilhetes", label: "Bilhetes", icon: "ticket" },
  { href: "/loja", label: "Loja", icon: "store" },
];

export const mobileNavigation: NavigationItem[] = [
  { href: "/agenda", label: "Agenda", icon: "calendar" },
  { href: "/mapa", label: "Mapa", icon: "map" },
  { href: "/bilhetes", label: "Bilhetes", icon: "ticket" },
  { href: "/loja", label: "Loja", icon: "store" },
];

export const profileActivityNavigation: NavigationItem[] = [
  { href: "/guardados", label: "Guardados", icon: "bookmark" },
  { href: "/descobrir", label: "Rede Cultural", icon: "compass" },
];

export const profilePurchaseNavigation: NavigationItem[] = [
  { href: "/bilhetes", label: "Os meus bilhetes", icon: "ticket" },
  { href: "/loja", label: "Encomendas da loja", icon: "orders" },
];

export const creatorNavigation: NavigationItem[] = [
  { href: "/submeter", label: "Submeter evento", icon: "plus" },
  { href: "/organizador", label: "Área do organizador", icon: "organizer" },
  { href: "/organizador/destaques", label: "Destaques e Frequency", icon: "visibility" },
  { href: "/organizador/loja", label: "Loja do organizador", icon: "store" },
];

export const adminNavigation = [
  {
    label: "Conteúdo",
    items: [
      { href: "/admin", label: "Eventos e submissões", icon: "events" },
      { href: "/admin/rede", label: "Artistas, organizadores e espaços", icon: "compass" },
      { href: "/admin/qualidade-dados", label: "Qualidade de dados", icon: "check" },
    ],
  },
  {
    label: "Utilizadores",
    items: [
      { href: "/admin/perfis", label: "Perfis e validações", icon: "settings" },
    ],
  },
  {
    label: "Comercial",
    items: [
      { href: "/admin/pagamentos", label: "Pagamentos", icon: "orders" },
      { href: "/admin/destaques", label: "Destaques", icon: "visibility" },
      { href: "/admin/planos", label: "Frequency", icon: "spark" },
      { href: "/admin/parceiros", label: "Parceiros", icon: "organizer" },
    ],
  },
  {
    label: "Loja",
    items: [
      { href: "/admin/loja", label: "Produtos, encomendas e payouts", icon: "store" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/localizacoes", label: "Localizações", icon: "map" },
      { href: "/admin/bilhetes", label: "Bilhetes e validação", icon: "ticket" },
    ],
  },
] satisfies Array<{ label: string; items: NavigationItem[] }>;

export function isNavigationActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
