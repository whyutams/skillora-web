"use client";

import * as React from "react";

interface BreadcrumbContextType {
  customTitle: string | null;
  setCustomTitle: (title: string | null) => void;
}

const BreadcrumbContext = React.createContext<BreadcrumbContextType>({
  customTitle: null,
  setCustomTitle: () => {},
});

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [customTitle, setCustomTitle] = React.useState<string | null>(null);

  return (
    <BreadcrumbContext.Provider value={{ customTitle, setCustomTitle }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumb() {
  return React.useContext(BreadcrumbContext);
}

