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

export function useSignup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SignupRequest) => api.signup(input),
    onSuccess: async () => {
      // Signup's response deliberately carries no teacher — it is identical
      // whether or not the address was already taken, so there is nothing here
      // to seed the cache with. Ask the server who we are instead. If the
      // address was already registered the cookie was never set, `/api/me`
      // answers 401, and the app stays on the signed-out screens.
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
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
