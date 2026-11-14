import { createAuthClient } from "better-auth/react";
import { managedAuthExpoClient } from "@runablehq/managed-auth/native";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

// Platform-managed identity: never edit `expo.extra` or `expo.scheme` in app.json.
const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string; applicationId?: string; runableAuthIssuer?: string };

export const isWeb = Platform.OS === "web";
const TOKEN_KEY = "earbass_bearer";

/** Server origin without trailing slash, e.g. https://earbass-….runable.site */
export const API_URL = String(extra.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export function getToken(): string {
  try {
    return SecureStore.getItem(TOKEN_KEY) ?? "";
  } catch {
    try {
      return localStorage.getItem(TOKEN_KEY) ?? "";
    } catch {
      return "";
    }
  }
}

export function setToken(token: string) {
  try {
    SecureStore.setItem(TOKEN_KEY, token);
  } catch {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* no storage */
    }
  }
}

export const authClient = createAuthClient({
  baseURL: API_URL,
  basePath: "/api/auth",
  plugins: [
    managedAuthExpoClient({
      applicationId: extra.applicationId ?? "",
      issuer: extra.runableAuthIssuer ?? "",
      storage: { getToken, setToken, clearToken: () => setToken("") },
    }),
  ],
  fetchOptions: {
    ...(isWeb ? { credentials: "omit" as const } : {}),
    auth: { type: "Bearer", token: () => getToken() },
    headers: isWeb ? {} : { "expo-origin": "mobile://" },
  },
});

/** Call in onSuccess of email signIn/signUp to capture the bearer token. */
export function captureToken(ctx: { response: Response }) {
  const token = ctx.response.headers.get("set-auth-token");
  if (token) setToken(token);
}

export async function signOut() {
  try {
    await authClient.signOut();
  } catch {
    /* ignore */
  }
  setToken("");
}
