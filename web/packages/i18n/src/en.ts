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
    signUp: "Sign up",
    signIn: "Sign in",
    signOut: "Sign out",
    toSignIn: "Already have an account? Sign in",
    toSignUp: "Need an account? Sign up",
    submitting: "Please wait…",
    passwordHint: "At least {min} characters.",
    errorInvalidCredentials: "That email and password combination is not valid.",
    errorEmailFormat: "Enter a valid email address.",
    errorEmailRequired: "Email is required.",
    errorEmailTooLong: "That email address is too long.",
    errorPasswordRequired: "Password is required.",
    errorPasswordTooShort: "Password must be at least {min} characters.",
    errorPasswordTooLong: "That password is too long.",
    errorDisplayNameRequired: "Please enter your name.",
    errorDisplayNameTooLong: "That name is too long.",
    errorLocaleUnsupported: "That language is not supported.",
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
