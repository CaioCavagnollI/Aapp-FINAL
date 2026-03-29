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
const ADMIN_DEFAULT_USERNAME = "admin@nexus.atlas221177";
const ADMIN_DEFAULT_PASSWORD = "admin2211777_";

interface AdminContextValue {
  isLoggedIn: boolean;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const doLogin = async (username: string, password: string): Promise<string | null> => {
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { token: string };
      return data.token;
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
        // Auto-login with default admin credentials
        const newToken = await doLogin(ADMIN_DEFAULT_USERNAME, ADMIN_DEFAULT_PASSWORD);
        if (newToken) {
          await AsyncStorage.setItem(ADMIN_TOKEN_KEY, newToken);
          setToken(newToken);
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = async (
    username: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const newToken = await doLogin(username, password);
      if (!newToken) return { success: false, error: "Credenciais inválidas" };
      await AsyncStorage.setItem(ADMIN_TOKEN_KEY, newToken);
      setToken(newToken);
      return { success: true };
    } catch {
      return { success: false, error: "Erro de conexão com o servidor" };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
  };

  const value = useMemo(
    () => ({
      isLoggedIn: !!token,
      token,
      isLoading,
      login,
      logout,
    }),
    [token, isLoading],
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
