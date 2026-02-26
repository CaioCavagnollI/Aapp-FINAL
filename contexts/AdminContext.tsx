import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

const ADMIN_TOKEN_KEY = "fitversum_admin_token";

interface AdminContextValue {
  isLoggedIn: boolean;
  token: string | null;
  isLoading: boolean;
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(ADMIN_TOKEN_KEY)
      .then((stored) => { if (stored) setToken(stored); })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        return { success: false, error: data.error || "Senha incorreta" };
      }
      const data = await res.json() as { token: string };
      await AsyncStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setToken(data.token);
      return { success: true };
    } catch {
      return { success: false, error: "Erro de conexão com o servidor" };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
  };

  const value = useMemo(() => ({
    isLoggedIn: !!token,
    token,
    isLoading,
    login,
    logout,
  }), [token, isLoading]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
