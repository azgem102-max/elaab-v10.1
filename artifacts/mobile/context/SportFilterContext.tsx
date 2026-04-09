import React, { createContext, useContext, useState, useCallback } from "react";
import type { SportType } from "@/context/AppContext";

interface SportFilterContextValue {
  activeSport: SportType | null;
  setActiveSport: (sport: SportType | null) => void;
}

const SportFilterContext = createContext<SportFilterContextValue>({
  activeSport: null,
  setActiveSport: () => {},
});

export function SportFilterProvider({ children }: { children: React.ReactNode }) {
  const [activeSport, setActiveSportRaw] = useState<SportType | null>(null);

  const setActiveSport = useCallback((sport: SportType | null) => {
    setActiveSportRaw(sport);
  }, []);

  return (
    <SportFilterContext.Provider value={{ activeSport, setActiveSport }}>
      {children}
    </SportFilterContext.Provider>
  );
}

export function useActiveSport() {
  return useContext(SportFilterContext);
}
