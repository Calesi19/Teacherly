import { MIN_PASSWORD_LENGTH } from "@teacherly/core";
import { interpolate } from "@teacherly/i18n";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { ApiError } from "../api/client";
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
  const [inviteCode, setInviteCode] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    // The locale the visitor is reading the form in becomes their stored one.
    signup.mutate({ email, password, displayName, locale, inviteCode });
  }

  /**
   * One message for every uniform outcome.
   *
   * `useSignup` posts signup and then logs in, so the failure that arrives
   * here for an address that was already taken *and* for a wrong invite code
   * is the login's `401 invalid_credentials` — the three cases are
   * indistinguishable to the client because they are indistinguishable on the
   * wire, which is the property that closed the oracle. Its sign-in wording
   * ("that email and password combination is not valid") would be actively
   * misleading to someone who just chose that password, so the sign-up form
   * substitutes its own. Everything else — validation, 429, signup disabled —
   * says what it is.
   */
  function errorText(error: unknown): string {
    if (error instanceof ApiError && error.code === "invalid_credentials") {
      return t.auth.errorSignUpFailed;
    }
    return describeApiError(error, t);
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

        <label htmlFor="inviteCode">{t.auth.inviteCode}</label>
        <input
          id="inviteCode"
          name="inviteCode"
          autoComplete="off"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
        />
        <p className="hint">{t.auth.inviteCodeHint}</p>

        {/*
          One branch now, where there used to be two. Sign-up's `201` is a
          uniform answer rather than a result, so the mutation no longer
          "succeeds" with no session for the page to notice: `useSignup`
          follows it with a login, and that login is what fails. A real
          sign-up ends with `App` swapping this page out.
        */}
        {signup.isError ? (
          <p className="error" role="alert">
            {errorText(signup.error)}
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
