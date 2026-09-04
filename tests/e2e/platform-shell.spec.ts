import { expect, test } from "@playwright/test";
import { adminAuthStatePath } from "./auth-state.ts";

test("preserves the public AMS IMPULSE surface", async ({ page, request }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Быстрое продвижение сайтов в SEO");
  await expect(
    page.getByRole("heading", { level: 1, name: "Быстрое продвижение сайтов в SEO" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /бесплатный тест-драйв/i })).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();

  const faviconResponse = await request.get("/ams-favicon.svg");
  expect(faviconResponse.status()).toBe(200);
  expect(faviconResponse.headers()["content-type"]).toContain("image/svg+xml");

  const healthResponse = await request.get("/api/health/live");
  expect(healthResponse.status()).toBe(200);
  const health = (await healthResponse.json()) as {
    status: string;
    releaseSha: string | null;
    correlationId: string;
  };
  expect(health).toMatchObject({ status: "ok", releaseSha: null });
  expect(health.correlationId).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  expect(healthResponse.headers()["x-correlation-id"]).toBe(health.correlationId);

  const authResponse = await request.get("/api/auth/get-session");
  expect(authResponse.status()).toBe(200);
  expect(await authResponse.json()).toBeNull();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("keeps private routes behind the login boundary", async ({ page }) => {
  await page.goto("/analyst/");

  await expect(page).toHaveURL(/\?login=1$/);
  await expect(page.getByRole("dialog", { name: "Вход в кабинет" })).toBeVisible();
  await expect(page.getByLabel("Логин")).toBeVisible();
  await expect(page.getByLabel("Пароль")).toBeVisible();
});

test("requires first-password completion before cabinet access", async ({ page }, testInfo) => {
  const onboardingUsernameByProject: Record<string, string> = {
    "mobile-375": "e2e.onboarding.mobile",
    "tablet-768": "e2e.onboarding.tablet",
    "desktop-1280": "e2e.onboarding.desktop1280",
    "desktop-1440": "e2e.onboarding.desktop1440",
  };
  const username = onboardingUsernameByProject[testInfo.project.name];
  if (!username) throw new Error(`Missing onboarding identity for ${testInfo.project.name}`);

  await page.goto("/?login=1");
  await page.getByLabel("Логин").fill(username);
  await page.getByLabel("Пароль").fill("E2e-local-only-2026!");
  await page
    .getByRole("dialog", { name: "Вход в кабинет" })
    .getByRole("button", { name: "Войти", exact: true })
    .click();
  await expect(page).toHaveURL(/\/onboarding\/password\/?$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Измените временный пароль" }),
  ).toBeVisible();
  await page.getByLabel("Текущий временный пароль").fill("E2e-local-only-2026!");
  await page.getByLabel("Новый пароль").fill(`Changed-${testInfo.project.name}-2026!`);
  await page.getByRole("button", { name: "Изменить пароль" }).click();
  await expect(page).toHaveURL(/\/dashboard\/?$/);
});

test.describe("Admin CMS", () => {
  test.use({ storageState: adminAuthStatePath });

  test("opens for a platform administrator", async ({ page }) => {
    await page.goto("/admin/organizations/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Организации" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Ресурсы администрирования" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Сохранить организацию" })).toBeVisible();
    await expect(page.getByText(/Всего:/)).toBeVisible();

    await page.goto("/admin/providers/");
    await page.getByLabel("Сайт").selectOption({ index: 1 });
    await page.getByRole("combobox", { name: "Источник*" }).selectOption("YANDEX_WEBMASTER");
    await page.getByLabel("Nonsecret settings JSON").fill('{"apiKey":"must-not-be-stored"}');
    await page.getByRole("button", { name: "Сохранить подключение" }).click();
    await expect(
      page.getByText(/Разрешён только плоский nonsecret JSON/),
    ).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("renders the Project reference slice with URL-owned filters", async ({ page }) => {
    await page.goto("/admin/projects/");
    await expect(page.getByRole("heading", { level: 1, name: "Проекты" })).toBeVisible();
    await expect(page.getByText("Создать проект")).toBeVisible();
    await page.getByLabel("Поиск").fill("REDACTED_CLIENT_DATA");
    await page.getByRole("button", { name: "Применить" }).click();
    await expect(page).toHaveURL(/search=REDACTED_CLIENT_DATA/);

    if ((page.viewportSize()?.width ?? 0) < 768) {
      const projectCard = page.locator("article").first();
      await expect(projectCard).toBeVisible();
      await expect(projectCard.getByRole("heading", { name: "REDACTED_CLIENT_DATA" })).toBeVisible();
    } else {
      const projectTable = page.getByRole("table");
      await expect(projectTable).toBeVisible();
      await expect(projectTable.getByText("REDACTED_CLIENT_DATA", { exact: true }).first()).toBeVisible();
      await projectTable.getByRole("link", { name: "Проект", exact: true }).click();
      await expect(page).toHaveURL(/sort=name/);
    }

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
