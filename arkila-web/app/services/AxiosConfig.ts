import axios from "axios";
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

import { BASE_URL } from "./ApiEndpoint";
import { User } from "@/lib/types";

// Every error response from the backend has this shape (see app/middleware/errorHandler.js)
interface ApiErrorBody {
  success: false;
  message: string;
}

const TOKEN_KEY = "arkila_token";
const USER_KEY = "arkila_user";

const AxiosConfig: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true", // <- Bypasses Ngrok warning page for API requests
  },
});

// session helpers (auth.tsx should use these instead of touching localStorage directly)
export const getToken = (): string | null => {
  if (typeof window === "undefined") return null; // SSR guard
  return localStorage.getItem(TOKEN_KEY);
};

export const setSession = (token: string, user: User): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getStoredUser = <T = unknown>(): T | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
};

// REQUEST INTERCEPTOR: attach the JWT the backend's `protect` middleware expects 
AxiosConfig.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError): Promise<AxiosError> => Promise.reject(error)
);

// RESPONSE INTERCEPTOR: react to auth failures 
AxiosConfig.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  (error: AxiosError<ApiErrorBody>): Promise<AxiosError> => {
    const url = error.config?.url || "";
    const isAuthEndpoint =
      url.includes("/login") || url.includes("/register") || url.includes("/bootstrap");

    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || "Something went wrong.";

      // 401 = token missing/invalid/expired (the `protect` middleware rejected it)
      if (status === 401 && !isAuthEndpoint) {
        console.warn("Unauthorized:", message, "-> clearing session");
        clearSession();

        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }

      // 500 = unexpected server error
      else if (status === 500) {
        console.error("Server error:", message);
      }
    } else if (error.code === "ECONNABORTED") {
      console.error("Request timed out.");
    } else if (error.message === "Network Error") {
      console.error("Cannot reach the backend. Is it running at", BASE_URL, "?");
    }

    return Promise.reject(error);
  }
);

export default AxiosConfig;