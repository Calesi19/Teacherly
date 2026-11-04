import { MIN_PASSWORD_LENGTH } from "@teacherly/core";
import { interpolate } from "@teacherly/i18n";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { useSignup } from "../auth/useSession";
import { describeApiError } from "../i18n/error-messages";
import { useLocale } from "../i18n/locale-context";
import { LocaleToggle } from "./LocaleToggle";

export function SignUpPage(): ReactNode {
  const { t, locale } = useLocale();
  const signup = useSignup();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    // The locale the visitor is reading the form in becomes their stored one.
    signup.mutate({ email, password, displayName, locale });
  }

  return (
    <main className="auth-card">
      <LocaleToggle />
      <h1>{t.auth.signUpTitle}</h1>
      <p className="subtitle">{t.auth.signUpSubtitle}</p>

      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="displayName">{t.auth.displayName}</label>
        <input
          id="displayName"
          name="displayName"
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="hint">
          {interpolate(t.auth.passwordHint, { min: MIN_PASSWORD_LENGTH })}
        </p>

        {/*
          Two different failures, one of which does not look like a failure to
          react-query. A rejected request (validation, 415, 429) lands in
          `isError`. An address that is already registered does not: the server
          deliberately answers `201 {"ok":true}` either way, so the mutation
          succeeds and only the follow-up `GET /api/me` reveals that no session
          was issued — which, because `App` would have swapped this page out
          for the signed-in tree, is exactly "still rendering while isSuccess".
        */}
        {signup.isError ? (
          <p className="error" role="alert">
            {describeApiError(signup.error, t)}
          </p>
        ) : signup.isSuccess ? (
          <p className="error" role="alert">
            {t.auth.errorSignUpFailed}
          </p>
        ) : null}

        <button type="submit" disabled={signup.isPending}>
          {signup.isPending ? t.auth.submitting : t.auth.signUp}
        </button>
      </form>

      <Link to="/sign-in">{t.auth.toSignIn}</Link>
    </main>
  );
}
