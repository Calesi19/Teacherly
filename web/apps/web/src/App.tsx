import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { useSession } from "./auth/useSession";
import { useLocale } from "./i18n/locale-context";
import { HomePage } from "./pages/HomePage";
import { SignInPage } from "./pages/SignInPage";
import { SignUpPage } from "./pages/SignUpPage";

export function App(): ReactNode {
  const { t } = useLocale();
  const session = useSession();

  // Until `/api/me` has answered we know nothing — rendering either the signed
  // -in or the signed-out tree here would flash the wrong one.
  if (session.isPending) {
    return (
      <main className="loading" aria-busy="true">
        {t.common.loading}
      </main>
    );
  }

  const teacher = session.data?.teacher ?? null;

  if (teacher === null) {
    return (
      <Routes>
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="*" element={<Navigate to="/sign-in" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage teacher={teacher} />} />
      {/* A signed-in teacher has no business on the auth screens. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
