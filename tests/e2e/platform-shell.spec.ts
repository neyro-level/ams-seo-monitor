import { expect, test } from "@playwright/test";
import { adminAuthStatePath } from "./auth-state";

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
});
