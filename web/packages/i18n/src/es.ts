import type { Translations } from "./types";

/**
 * Spanish strings. Typed as `Translations`, so a key that `en` has and this
 * file lacks — or a key misspelled here — fails `pnpm typecheck`.
 *
 * `common`, `sidebar.tagline` and the `settings.language*` keys are ported
 * verbatim from the desktop app's Spanish block.
 */
const es: Translations = {
  common: {
    back: "Atrás",
    cancel: "Cancelar",
    save: "Guardar",
    loading: "Cargando…",
  },
  sidebar: {
    tagline: "Asistente del Maestro",
  },
  settings: {
    language: "Idioma",
    languageEnglish: "Inglés",
    languageSpanish: "Español",
  },
  auth: {
    signUpTitle: "Crea tu cuenta",
    signUpSubtitle: "Un espacio privado para tus clases.",
    signInTitle: "Bienvenido de nuevo",
    signInSubtitle: "Inicia sesión en tu espacio.",
    email: "Correo electrónico",
    password: "Contraseña",
    displayName: "Tu nombre",
    signUp: "Registrarse",
    signIn: "Iniciar sesión",
    signOut: "Cerrar sesión",
    toSignIn: "¿Ya tienes una cuenta? Inicia sesión",
    toSignUp: "¿Necesitas una cuenta? Regístrate",
    submitting: "Por favor espera…",
    passwordHint: "Al menos {min} caracteres.",
    errorInvalidCredentials: "Esa combinación de correo y contraseña no es válida.",
    errorEmailFormat: "Introduce un correo electrónico válido.",
    errorEmailRequired: "El correo electrónico es obligatorio.",
    errorEmailTooLong: "Ese correo electrónico es demasiado largo.",
    errorPasswordRequired: "La contraseña es obligatoria.",
    errorPasswordTooShort: "La contraseña debe tener al menos {min} caracteres.",
    errorPasswordTooLong: "Esa contraseña es demasiado larga.",
    errorDisplayNameRequired: "Por favor introduce tu nombre.",
    errorDisplayNameTooLong: "Ese nombre es demasiado largo.",
    errorLocaleUnsupported: "Ese idioma no es compatible.",
    errorUnexpected: "Algo salió mal. Inténtalo de nuevo.",
  },
  home: {
    title: "Tu espacio de trabajo",
    signedInAs: "Sesión iniciada como {name}",
    workspaceNotice:
      "Este espacio es privado. Las clases, evaluaciones, calificaciones y notas llegarán en una etapa posterior.",
    teacherId: "ID de maestro",
  },
};

export default es;
