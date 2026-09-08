export const PLATFORM_ADMIN_RESOURCE_KEYS = [
  "organizations",
  "memberships",
  "projects",
  "sites",
  "providers",
  "goals",
  "tracked-queries",
  "profiles",
  "operations",
] as const;

export type PlatformAdminResourceKey = (typeof PLATFORM_ADMIN_RESOURCE_KEYS)[number];

export interface PlatformAdminResourceDefinition {
  key: PlatformAdminResourceKey;
  label: string;
  description: string;
  href: string;
}

export const PLATFORM_ADMIN_RESOURCES: readonly PlatformAdminResourceDefinition[] = [
  {
    key: "organizations",
    label: "Организации",
    description: "Клиенты, их проекты и пользователи с доступом.",
    href: "/admin/organizations/",
  },
  {
    key: "memberships",
    label: "Участники и доступ",
    description: "Пользователи, их роли и доступ к организациям.",
    href: "/admin/memberships/",
  },
  {
    key: "projects",
    label: "Проекты",
    description: "Проекты клиентов, их состояние и настройки аналитики.",
    href: "/admin/projects/",
  },
  {
    key: "sites",
    label: "Сайты",
    description: "Адреса сайтов, часовые пояса и участие в сборе данных.",
    href: "/admin/sites/",
  },
  {
    key: "providers",
    label: "Подключения источников",
    description: "Подключения Яндекс.Вебмастера, Метрики и сервисов позиций.",
    href: "/admin/providers/",
  },
  {
    key: "goals",
    label: "Цели",
    description: "Цели аналитики, которые учитываются в SEO-конверсиях.",
    href: "/admin/goals/",
  },
  {
    key: "tracked-queries",
    label: "Отслеживаемые запросы",
    description: "Поисковые запросы, контрольные значения и состояние отслеживания.",
    href: "/admin/tracked-queries/",
  },
  {
    key: "profiles",
    label: "Правила аналитики",
    description: "Пороговые значения и группы запросов для оценки результатов.",
    href: "/admin/profiles/",
  },
  {
    key: "operations",
    label: "Обновление данных",
    description: "Запуск синхронизации и состояние фоновых заданий.",
    href: "/admin/operations/",
  },
];

export const NON_PROJECT_PLATFORM_ADMIN_RESOURCES = PLATFORM_ADMIN_RESOURCES.filter(
  (resource) => resource.key !== "projects",
);

export function isPlatformAdminResourceKey(value: string): value is PlatformAdminResourceKey {
  return PLATFORM_ADMIN_RESOURCE_KEYS.some((key) => key === value);
}

export function getPlatformAdminResourceDefinition(
  key: PlatformAdminResourceKey,
): PlatformAdminResourceDefinition {
  const resource = PLATFORM_ADMIN_RESOURCES.find((candidate) => candidate.key === key);
  if (!resource) {
    throw new Error(`Unknown platform admin resource: ${key}`);
  }
  return resource;
}
