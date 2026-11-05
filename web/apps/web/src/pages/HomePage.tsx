import { interpolate } from "@teacherly/i18n";
import type { ReactNode } from "react";

import type { TeacherDto } from "../api/client";
import { useLogout } from "../auth/useSession";
import { useLocale } from "../i18n/locale-context";

/**
 * The only signed-in screen in this chunk. It renders the identity the server
 * returned from `/api/me` — which is how the two-account Playwright test can
 * see, from the UI alone, that each browser context gets its own workspace.
 */
export function HomePage({ teacher }: { teacher: TeacherDto }): ReactNode {
  const { t } = useLocale();
  const logout = useLogout();

  return (
    <main className="home">
      <header>
        <p className="tagline">{t.sidebar.tagline}</p>
        <h1>{t.home.title}</h1>
      </header>

      <p data-testid="signed-in-as">
        {interpolate(t.home.signedInAs, { name: teacher.displayName })}
      </p>
      <dl>
        <dt>{t.auth.email}</dt>
        <dd data-testid="teacher-email">{teacher.email}</dd>
        <dt>{t.home.teacherId}</dt>
        <dd data-testid="teacher-id">{teacher.id}</dd>
      </dl>

      <p className="notice">{t.home.workspaceNotice}</p>

      <button type="button" onClick={() => logout.mutate()} disabled={logout.isPending}>
        {logout.isPending ? t.auth.submitting : t.auth.signOut}
      </button>
    </main>
  );
}
