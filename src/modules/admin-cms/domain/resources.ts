export const ADMIN_RESOURCE_KEYS = [
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

export type AdminResourceKey = (typeof ADMIN_RESOURCE_KEYS)[number];

export interface AdminResourceDefinition {
  key: AdminResourceKey;
  label: string;
  description: string;
  href: string;
}

export const ADMIN_RESOURCES: readonly AdminResourceDefinition[] = [
  {
    key: "organizations",
    label: "Организации",
    description: "Клиентские организации и их проектный контур.",
    href: "/admin/organizations/",
  },
  {
    key: "memberships",
    label: "Доступ пользователей",
    description: "Memberships и tenant scope пользователей.",
    href: "/admin/memberships/",
  },
  {
    key: "projects",
    label: "Проекты",
    description: "Проекты, статусы и связанные профили.",
    href: "/admin/projects/",
  },
  {
    key: "sites",
    label: "Сайты",
    description: "URL, timezone и включение сайтов в сбор данных.",
    href: "/admin/sites/",
  },
  {
    key: "providers",
    label: "Подключения источников",
    description: "Только nonsecret mapping и безопасные настройки providers.",
    href: "/admin/providers/",
  },
  {
    key: "goals",
    label: "Цели",
    description: "Allowlist целей и правила SEO-конверсии.",
    href: "/admin/goals/",
  },
  {
    key: "tracked-queries",
    label: "Отслеживаемые запросы",
    description: "Утверждённые ядра, baseline и активные запросы.",
    href: "/admin/tracked-queries/",
  },
  {
    key: "profiles",
    label: "Пороги и кластеры",
    description: "Версионируемые профили аналитических правил.",
    href: "/admin/profiles/",
  },
  {
    key: "operations",
    label: "Синхронизация и задания",
    description: "Sync runs, outbox и безопасный запуск синхронизации.",
    href: "/admin/operations/",
  },
];

export function isAdminResourceKey(value: string): value is AdminResourceKey {
  return ADMIN_RESOURCE_KEYS.some((key) => key === value);
}

export function getAdminResourceDefinition(key: AdminResourceKey): AdminResourceDefinition {
  const resource = ADMIN_RESOURCES.find((candidate) => candidate.key === key);
  if (!resource) {
    throw new Error(`Unknown admin resource: ${key}`);
  }
  return resource;
}
