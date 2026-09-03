import type { AdminCommandName } from "../domain/commands";
import type { AdminFormOptions } from "../application/ports/admin-repository";
import type { AdminResourceKey } from "../domain/resources";

export interface AdminFieldDefinition {
  name: string;
  label: string;
  type: "text" | "url" | "number" | "checkbox" | "select" | "textarea";
  required?: boolean;
  placeholder?: string;
  helper?: string;
  options?: { value: string; label: string }[];
  defaultValue?: string | boolean;
}

export interface AdminFormDefinition {
  command: AdminCommandName;
  title: string;
  description: string;
  submitLabel: string;
  fields: AdminFieldDefinition[];
}

const statusOptions = [
  { value: "ACTIVE", label: "Активен" },
  { value: "PLANNED", label: "План" },
  { value: "DISABLED", label: "Отключён" },
];

export function getAdminForms(resource: AdminResourceKey, options: AdminFormOptions): AdminFormDefinition[] {
  switch (resource) {
    case "organizations":
      return [
        {
          command: "saveOrganization",
          title: "Организация",
          description: "Создайте организацию или укажите ID существующей для обновления.",
          submitLabel: "Сохранить организацию",
          fields: [
            { name: "id", label: "ID для обновления", type: "text", placeholder: "Оставьте пустым для создания" },
            { name: "name", label: "Название", type: "text", required: true },
            { name: "slug", label: "Slug", type: "text", required: true, placeholder: "client-name" },
          ],
        },
      ];
    case "memberships":
      return [
        {
          command: "saveMembership",
          title: "Доступ пользователя",
          description: "Membership немедленно определяет tenant scope пользователя.",
          submitLabel: "Сохранить доступ",
          fields: [
            { name: "organizationId", label: "Организация", type: "select", required: true, options: options.organizations },
            { name: "userId", label: "Пользователь", type: "select", required: true, options: options.users },
            { name: "role", label: "Роль в организации", type: "text", required: true, defaultValue: "member" },
          ],
        },
        {
          command: "removeMembership",
          title: "Отозвать доступ",
          description: "Удаление membership немедленно убирает tenant scope при следующем запросе.",
          submitLabel: "Отозвать доступ",
          fields: [
            { name: "organizationId", label: "Организация", type: "select", required: true, options: options.organizations },
            { name: "userId", label: "Пользователь", type: "select", required: true, options: options.users },
          ],
        },
      ];
    case "projects":
      return [{
        command: "saveProject",
        title: "Проект",
        description: "Связанные профили обязательны. ID включает режим обновления.",
        submitLabel: "Сохранить проект",
        fields: [
          { name: "id", label: "ID для обновления", type: "text", placeholder: "Оставьте пустым для создания" },
          { name: "organizationId", label: "Организация", type: "select", required: true, options: options.organizations },
          { name: "name", label: "Название", type: "text", required: true },
          { name: "slug", label: "Slug", type: "text", required: true },
          { name: "status", label: "Статус", type: "select", required: true, options: statusOptions, defaultValue: "PLANNED" },
          { name: "thresholdProfileId", label: "Пороговый профиль", type: "select", required: true, options: options.thresholdProfiles },
          { name: "clusterProfileId", label: "Профиль кластеров", type: "select", required: true, options: options.clusterProfiles },
        ],
      }];
    case "sites":
      return [{
        command: "saveSite",
        title: "Сайт",
        description: "Отключение сохраняет всю историю и прекращает provider calls.",
        submitLabel: "Сохранить сайт",
        fields: [
          { name: "id", label: "ID для обновления", type: "text", placeholder: "Оставьте пустым для создания" },
          { name: "projectId", label: "Проект", type: "select", required: true, options: options.projects },
          { name: "name", label: "Название", type: "text", required: true },
          { name: "slug", label: "Slug", type: "text", required: true },
          { name: "url", label: "URL", type: "url", required: true, placeholder: "https://example.ru" },
          { name: "timezone", label: "Timezone", type: "text", required: true, defaultValue: "Europe/Moscow" },
          { name: "enabled", label: "Сбор данных включён", type: "checkbox", defaultValue: true },
        ],
      }];
    case "providers":
      return [{
        command: "saveProviderConnection",
        title: "Подключение источника",
        description: "Секреты сюда не вводятся. Только external mapping и nonsecret JSON.",
        submitLabel: "Сохранить подключение",
        fields: [
          { name: "siteId", label: "Сайт", type: "select", required: true, options: options.sites },
          { name: "provider", label: "Источник", type: "select", required: true, options: [
            { value: "YANDEX_WEBMASTER", label: "Яндекс.Вебмастер" },
            { value: "YANDEX_METRIKA", label: "Яндекс.Метрика" },
            { value: "TOPVISOR", label: "Topvisor" },
          ] },
          { name: "externalId", label: "External ID", type: "text" },
          { name: "settingsJson", label: "Nonsecret settings JSON", type: "textarea", defaultValue: "{}", helper: "Только плоский JSON-объект без токенов и паролей." },
          { name: "enabled", label: "Источник включён", type: "checkbox", defaultValue: true },
        ],
      }];
    case "goals":
      return [{
        command: "saveGoal",
        title: "Цель Метрики",
        description: "Команда создаёт или обновляет цель по project + external ID.",
        submitLabel: "Сохранить цель",
        fields: [
          { name: "projectId", label: "Проект", type: "select", required: true, options: options.projects },
          { name: "externalGoalId", label: "External goal ID", type: "text", required: true },
          { name: "label", label: "Название", type: "text", required: true },
          { name: "category", label: "Категория", type: "select", required: true, options: ["LEAD_SUBMIT", "PHONE_CLICK", "MESSENGER_CLICK", "FORM_START", "FILE_DOWNLOAD", "OTHER"].map((value) => ({ value, label: value })) },
          { name: "direction", label: "Направление", type: "select", required: true, options: [{ value: "PRIMARY", label: "Основная" }, { value: "SECONDARY", label: "Вторичная" }] },
          { name: "includeInSeoConversion", label: "Учитывать в SEO-конверсии", type: "checkbox", defaultValue: true },
        ],
      }];
    case "tracked-queries":
      return [{
        command: "replaceTrackedQuerySet",
        title: "Ядро запросов",
        description: "Полная безопасная замена набора сайта. Один запрос на строку.",
        submitLabel: "Заменить ядро",
        fields: [
          { name: "siteId", label: "Сайт", type: "select", required: true, options: options.sites },
          { name: "source", label: "Baseline source", type: "select", required: true, options: [{ value: "OWNER_PROVIDED", label: "Owner provided" }, { value: "TOPVISOR", label: "Topvisor" }] },
          { name: "baselineLabel", label: "Baseline label", type: "text", required: true },
          { name: "queries", label: "Запросы", type: "textarea", required: true, placeholder: "seo продвижение\nseo аудит" },
        ],
      }];
    case "profiles":
      return [
        {
          command: "saveThresholdProfile",
          title: "Пороговый профиль",
          description: "Создание или обновление по slug.",
          submitLabel: "Сохранить пороги",
          fields: [
            { name: "slug", label: "Slug", type: "text", required: true },
            { name: "minimumShows", label: "Минимум показов", type: "number", required: true, defaultValue: "10" },
            ...["maximumCtrPercent", "maximumAveragePosition", "showsDropPercent", "clicksDropPercent", "positionWorsenedDelta", "pagesInSearchDropPercent", "organicVisitsDropPercent", "goalConversionDropPercent"].map((name) => ({ name, label: name, type: "number" as const, required: true, defaultValue: "0" })),
          ],
        },
        {
          command: "saveClusterProfile",
          title: "Профиль кластеров",
          description: "Создание или полная замена групп по slug.",
          submitLabel: "Сохранить кластеры",
          fields: [
            { name: "slug", label: "Slug", type: "text", required: true },
            { name: "name", label: "Название", type: "text", required: true },
            { name: "groupsJson", label: "Группы JSON", type: "textarea", required: true, defaultValue: "[]", helper: "Массив: slug, label, order, brandTerms[], terms[]." },
          ],
        },
      ];
    case "operations":
      return [{
        command: "requestProjectSync",
        title: "Запустить синхронизацию",
        description: "Команда создаёт idempotency key, AuditEvent и OutboxEvent в одной transaction.",
        submitLabel: "Поставить в очередь",
        fields: [
          { name: "projectSlug", label: "Project slug", type: "text", required: true },
          { name: "idempotencyKey", label: "Ключ идемпотентности", type: "text", required: true, placeholder: "manual-2026-09-03-bastion" },
        ],
      }];
  }
}
