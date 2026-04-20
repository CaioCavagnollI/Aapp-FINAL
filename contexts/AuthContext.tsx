import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
  useEffect,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

const AUTH_TOKEN_KEY = "nexusatlas_auth_token";
const AUTH_USER_KEY = "nexusatlas_auth_user";

export interface AuthUser {
  id: string;
  username: string;
  plan: string;
  is_admin: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  isPro: boolean;
  isStarter: boolean;
  isVitalicio: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setUserFromAdmin: (user: AuthUser, token: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(AUTH_TOKEN_KEY),
      AsyncStorage.getItem(AUTH_USER_KEY),
    ])
      .then(([storedToken, storedUser]) => {
        if (storedToken) setToken(storedToken);
        if (storedUser) {
          try { setUser(JSON.parse(storedUser)); } catch {}
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const refreshUser = async () => {
    if (!token) return;
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { user: AuthUser };
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
        setUser(data.user);
      }
    } catch {}
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { token?: string; user?: AuthUser; error?: string };
      if (!res.ok) return { success: false, error: data.error || "Erro ao fazer login" };
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token!);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
      setToken(data.token!);
      setUser(data.user!);
      return { success: true };
    } catch {
      return { success: false, error: "Erro de conexão com o servidor" };
    }
  };

  const register = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { token?: string; user?: AuthUser; error?: string };
      if (!res.ok) return { success: false, error: data.error || "Erro ao criar conta" };
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token!);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
      setToken(data.token!);
      setUser(data.user!);
      return { success: true };
    } catch {
      return { success: false, error: "Erro de conexão com o servidor" };
    }
  };

  const setUserFromAdmin = async (adminUser: AuthUser, userToken: string) => {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, userToken);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(adminUser));
    setToken(userToken);
    setUser(adminUser);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(AUTH_USER_KEY);
    setToken(null);
    setUser(null);
  };

  const isStarter = user?.plan === "starter_monthly" || user?.plan === "starter_annual" || user?.plan === "pro_monthly" || user?.plan === "pro_annual" || user?.plan === "vitalicio" || user?.is_admin === true;
  const isPro = user?.plan === "pro_monthly" || user?.plan === "pro_annual" || user?.plan === "vitalicio" || user?.is_admin === true;
  const isVitalicio = user?.plan === "vitalicio" || user?.is_admin === true;

  const value = useMemo(
    () => ({ user, token, isLoading, isLoggedIn: !!token, isPro, isStarter, isVitalicio, login, register, logout, setUserFromAdmin, refreshUser }),
    [user, token, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
