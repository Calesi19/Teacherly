import { expect, test } from "@playwright/test";

import { fetchMe, newTeacher } from "./fixtures";

/**
 * `packages/i18n` is only worth having if both languages reach the screen, so
 * this drives the whole round trip: pick Spanish before signing up, and the
 * locale is stored on the teacher and read back on the next request.
 */
test("the UI renders in Spanish and the choice is stored on the teacher", async ({
  page,
  context,
}) => {
  const teacher = newTeacher("espanol");

  await page.goto("/sign-up");
  await expect(page.getByRole("heading")).toHaveText("Create your account");

  await page.getByRole("button", { name: "Spanish" }).click();
  await expect(page.getByRole("heading")).toHaveText("Crea tu cuenta");

  await page.getByLabel("Tu nombre").fill(teacher.displayName);
  await page.getByLabel("Correo electrónico").fill(teacher.email);
  await page.getByLabel("Contraseña").fill(teacher.password);
  await page.getByRole("button", { name: "Registrarse" }).click();

  // The signed-in screen is Spanish too, from the same dictionary.
  await expect(page.getByTestId("signed-in-as")).toHaveText(
    `Sesión iniciada como ${teacher.displayName}`,
  );
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();

  // And the server persisted it, rather than the client merely remembering.
  const me = await fetchMe(context);
  expect(me.teacher?.locale).toBe("es");
});
