"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface AdminDevModeContextValue {
  devMode: boolean;
  setDevMode: (value: boolean) => void;
}

const AdminDevModeContext = createContext<AdminDevModeContextValue | undefined>(undefined);

export function AdminDevModeProvider({ children }: { children: React.ReactNode }) {
  const [devMode, setDevModeState] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("admin.devMode");
    setDevModeState(stored === "1");
  }, []);

  const setDevMode = useCallback((value: boolean) => {
    setDevModeState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("admin.devMode", value ? "1" : "0");
    }
  }, []);

  const contextValue = useMemo(() => ({ devMode, setDevMode }), [devMode, setDevMode]);

  return (
    <AdminDevModeContext.Provider value={contextValue}>
      {children}
    </AdminDevModeContext.Provider>
  );
}

export function useAdminDevMode() {
  const context = useContext(AdminDevModeContext);
  if (!context) {
    throw new Error("useAdminDevMode must be used within AdminDevModeProvider");
  }
  return context;
}
