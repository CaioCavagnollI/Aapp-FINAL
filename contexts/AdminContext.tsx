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

const ADMIN_TOKEN_KEY = "nexusatlas_admin_token";
const ADMIN_DEFAULT_USERNAME = "admin@nexus221177";
const ADMIN_DEFAULT_PASSWORD = "admin2211777_";

interface AdminContextValue {
  isLoggedIn: boolean;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; userToken?: string; user?: any }>;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const doLogin = async (username: string, password: string) => {
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { token: string; userToken?: string; user?: any };
      return data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const stored = await AsyncStorage.getItem(ADMIN_TOKEN_KEY);
        if (stored) {
          setToken(stored);
          setIsLoading(false);
          return;
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string; userToken?: string; user?: any }> => {
    try {
      const data = await doLogin(username, password);
      if (!data) return { success: false, error: "Credenciais inválidas" };
      await AsyncStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setToken(data.token);
      return { success: true, userToken: data.userToken, user: data.user };
    } catch {
      return { success: false, error: "Erro de conexão com o servidor" };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
  };

  const value = useMemo(
    () => ({ isLoggedIn: !!token, token, isLoading, login, logout }),
    [token, isLoading],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
