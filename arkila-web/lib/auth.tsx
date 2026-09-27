"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import AxiosConfig, {
  getToken,
  setSession,
  clearSession,
  getStoredUser,
} from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import type { Role, User, AuthResponse } from "@/lib/types";
import type { AxiosError, AxiosResponse } from "axios";

interface ApiErrorBody {
  success: false;
  message: string;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: "customer" | "owner";
  idFiles?: File[];
}

interface AuthCtx {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);

export const useAuth = () => useContext(Ctx);

export const homeFor = (r?: Role) => {
  if (r === "admin") return "/admin/dashboard";
  if (r === "owner") return "/owner/dashboard";
  return "/cars";
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  // Load session using AxiosConfig helpers on initial client mount
  useEffect(() => {
    try {
      const storedUser = getStoredUser<User>();
      if (storedUser) {
        setUserState(storedUser);
      }
    } catch {
      // Corrupted storage value: remain signed out
    } finally {
      setReady(true);
    }
  }, []);

  const save = (token: string, u: User) => {
    setSession(token, u);
    setUserState(u);
  };

  const login = async (email: string, password: string) => {
    try {
      const response: AxiosResponse<AuthResponse> = await AxiosConfig.post(
        API_ENDPOINTS.LOGIN,
        { email, password }
      );

      if (response.status === 200 && response.data) {
        const { token, user: userData } = response.data;
        save(token, userData);
        router.push(homeFor(userData.role));
      }
    } catch (x) {
      const axiosErr = x as AxiosError<ApiErrorBody>;
      throw new Error(
        axiosErr.response?.data?.message || (x as Error).message || "Login failed"
      );
    }
  };

  const register = async (payload: RegisterPayload) => {
    try {
      const form = new FormData();
      form.append("name", payload.name);
      form.append("email", payload.email);
      form.append("password", payload.password);
      if (payload.phone) form.append("phone", payload.phone);
      form.append("role", payload.role);

      if (payload.role === "owner" && payload.idFiles) {
        payload.idFiles.forEach((f) => form.append("idImages", f));
      }

      const response: AxiosResponse<AuthResponse> = await AxiosConfig.post(
        API_ENDPOINTS.REGISTER,
        form
      );

      if (response.status === 201 && response.data) {
        const { token, user: userData } = response.data;
        save(token, userData);
        router.push(homeFor(userData.role));
      }
    } catch (x) {
      const axiosErr = x as AxiosError<ApiErrorBody>;
      throw new Error(
        axiosErr.response?.data?.message || (x as Error).message || "Registration failed"
      );
    }
  };

  const refresh = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response: AxiosResponse = await AxiosConfig.get(API_ENDPOINTS.GET_MY_INFO);
      if (response.status === 200) {
        const updatedUser: User = response.data.user || response.data;
        save(token, updatedUser);
      }
    } catch {
    }
  };

  const logout = () => {
    clearSession();
    setUserState(null);
    router.push("/");
  };

  const value: AuthCtx = {
    user,
    ready,
    login,
    register,
    refresh,
    setUser: (u) => {
      const token = getToken();
      if (token) save(token, u);
    },
    logout,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}