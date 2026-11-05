/**
 * English strings for the screens this chunk ships.
 *
 * `common`, `sidebar.tagline` and the `settings.language*` keys are ported
 * verbatim from the desktop app's `src/i18n/translations.ts`. The `auth` block
 * is new: the desktop app is offline and has no login, so it has no auth
 * strings to copy.
 *
 * Deliberately NOT `as const` — widening the values to `string` is what lets
 * `es` be typed as `Translations` and still hold different text, while a
 * missing or misspelled key stays a type error.
 */
const en = {
  common: {
    back: "Back",
    cancel: "Cancel",
    save: "Save",
    loading: "Loading…",
  },
  sidebar: {
    tagline: "Teacher's Helper",
  },
  settings: {
    language: "Language",
    languageEnglish: "English",
    languageSpanish: "Spanish",
  },
  auth: {
    signUpTitle: "Create your account",
    signUpSubtitle: "One private workspace for your classes.",
    signInTitle: "Welcome back",
    signInSubtitle: "Sign in to your workspace.",
    email: "Email",
    password: "Password",
    displayName: "Your name",
    inviteCode: "Invite code",
    inviteCodeHint: "Ask your school for the code. Sign-up is invite-only.",
    signUp: "Sign up",
    signIn: "Sign in",
    signOut: "Sign out",
    toSignIn: "Already have an account? Sign in",
    toSignUp: "Need an account? Sign up",
    submitting: "Please wait…",
    passwordHint: "At least {min} characters.",
    errorInvalidCredentials: "That email and password combination is not valid.",
    // Shown on the sign-up form only. The server answers every sign-up
    // identically, so the client cannot say *why* this failed — and this
    // wording must not imply it knows. It replaces the sign-in copy above,
    // which read as nonsense to someone creating a brand-new account.
    //
    // It now covers one more case than it did: a wrong invite code is answered
    // the same way as an address that was already taken, so this string has to
    // mention the code without claiming that is what went wrong.
    errorSignUpFailed:
      "We could not complete that sign-up. Check your invite code, or sign in if you already have an account.",
    // The server's 503 when it has no SIGNUP_INVITE_CODE configured. A
    // deployment fact, not a request failure, and there is nothing the visitor
    // can do about it — so it says so rather than suggesting they retry.
    errorSignupDisabled: "Sign-up is closed on this server. Ask your school for an account.",
    errorEmailFormat: "Enter a valid email address.",
    errorEmailRequired: "Email is required.",
    errorEmailTooLong: "That email address is too long.",
    errorPasswordRequired: "Password is required.",
    errorPasswordTooShort: "Password must be at least {min} characters.",
    errorPasswordTooLong: "That password is too long.",
    errorDisplayNameRequired: "Please enter your name.",
    errorDisplayNameTooLong: "That name is too long.",
    errorLocaleUnsupported: "That language is not supported.",
    // The auth rate limiter's 429. Worth its own string rather than falling
    // through to errorUnexpected: a teacher who mistyped a few times needs to
    // know that waiting fixes it and that retrying immediately will not.
    errorRateLimited: "Too many attempts. Please wait a few minutes and try again.",
    errorUnexpected: "Something went wrong. Please try again.",
  },
  home: {
    title: "Your workspace",
    signedInAs: "Signed in as {name}",
    workspaceNotice:
      "This workspace is private to you. Classes, assessments, grades and notes arrive in a later chunk.",
    teacherId: "Teacher ID",
  },
} satisfies Record<string, Record<string, string>>;

export default en;
