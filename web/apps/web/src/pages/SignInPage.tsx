import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { useLogin } from "../auth/useSession";
import { describeApiError } from "../i18n/error-messages";
import { useLocale } from "../i18n/locale-context";
import { LocaleToggle } from "./LocaleToggle";

export function SignInPage(): ReactNode {
  const { t } = useLocale();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    login.mutate({ email, password });
  }

  return (
    <main className="auth-card">
      <LocaleToggle />
      <h1>{t.auth.signInTitle}</h1>
      <p className="subtitle">{t.auth.signInSubtitle}</p>

      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="email">{t.auth.email}</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="password">{t.auth.password}</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {login.isError ? (
          <p className="error" role="alert">
            {describeApiError(login.error, t)}
          </p>
        ) : null}

        <button type="submit" disabled={login.isPending}>
          {login.isPending ? t.auth.submitting : t.auth.signIn}
        </button>
      </form>

      <Link to="/sign-up">{t.auth.toSignUp}</Link>
    </main>
  );
}
