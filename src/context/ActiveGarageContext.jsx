import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "admin_active_garage";

const ActiveGarageContext = createContext(null);

function readFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function ActiveGarageProvider({ children }) {
  const [active, setActive] = useState(() => readFromStorage());

  useEffect(() => {
    // Sync across tabs.
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      setActive(readFromStorage());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setActiveGarage = useCallback((garage) => {
    if (!garage?.id) {
      localStorage.removeItem(STORAGE_KEY);
      setActive(null);
      return;
    }
    const next = { id: garage.id, garageName: garage.garageName || "" };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setActive(next);
  }, []);

  const value = useMemo(
    () => ({
      activeGarageId: active?.id || null,
      activeGarageName: active?.garageName || "",
      setActiveGarage,
    }),
    [active, setActiveGarage],
  );

  return (
    <ActiveGarageContext.Provider value={value}>
      {children}
    </ActiveGarageContext.Provider>
  );
}

export function useActiveGarage() {
  const ctx = useContext(ActiveGarageContext);
  if (!ctx) {
    throw new Error("useActiveGarage must be used inside <ActiveGarageProvider>");
  }
  return ctx;
}
