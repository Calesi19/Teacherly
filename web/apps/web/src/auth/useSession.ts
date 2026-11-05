import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useEffect } from "react";

import { api, type LoginRequest, type SignupRequest, type TeacherDto } from "../api/client";
import { useLocale } from "../i18n/locale-context";

export const SESSION_QUERY_KEY = ["session"] as const;

type SessionResult = UseQueryResult<{ teacher: TeacherDto } | null>;

/**
 * The single source of truth for "who am I". Always answered by `GET /api/me`,
 * never by anything the client stored at login — so a session revoked on the
 * server (another tab logging out, expiry) is reflected on the next refetch.
 */
export function useSession(): SessionResult {
  const session = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: api.me,
    // Don't retry a clean "not signed in"; it is an answer, not a failure.
    retry: false,
    staleTime: 30_000,
  });

  const { locale, setLocale } = useLocale();
  const teacherLocale = session.data?.teacher.locale;

  // Once a teacher is known, their stored locale wins over the local guess.
  useEffect(() => {
    if (teacherLocale !== undefined && teacherLocale !== locale) setLocale(teacherLocale);
  }, [teacherLocale, locale, setLocale]);

  return session;
}

/**
 * Sign up, then sign in with the same credentials.
 *
 * Two requests, because signup deliberately issues no session: its response is
 * identical for a real registration, an address that was already taken and a
 * wrong invite code, and a `Set-Cookie` on only the first of those was exactly
 * the signal that made it an oracle. The server cannot both answer uniformly
 * and hand back a session, so the client does the second step.
 *
 * The login is what decides the outcome the teacher sees. If the signup did
 * not actually happen — taken address, wrong code — the login fails with
 * `invalid_credentials`, and the sign-up form shows its one uniform message.
 * The mutation therefore fails in that case rather than "succeeding" with no
 * session, which is what the page used to have to infer.
 */
export function useSignup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SignupRequest) => {
      await api.signup(input);
      return api.login({ email: input.email, password: input.password });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, data);
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginRequest) => api.login(input),
    onSuccess: (data) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, data);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.logout(),
    onSuccess: async () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
      // Drop everything else too: the next teacher to sign in on this browser
      // must not see a byte of the last one's cached data.
      await queryClient.resetQueries();
    },
  });
}
