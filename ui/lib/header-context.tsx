'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface HeaderCtx {
  left: React.ReactNode;
  setLeft: (node: React.ReactNode) => void;
}

const Ctx = createContext<HeaderCtx>({ left: null, setLeft: () => {} });

export function HeaderProvider({ children }: { children: React.ReactNode }) {
  const [left, setLeftState] = useState<React.ReactNode>(null);
  const setLeft = useCallback((node: React.ReactNode) => setLeftState(node), []);
  return <Ctx.Provider value={{ left, setLeft }}>{children}</Ctx.Provider>;
}

export const useHeaderSlot = () => useContext(Ctx);
