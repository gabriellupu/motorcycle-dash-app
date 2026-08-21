import React, { createContext, useContext, useMemo } from 'react';

import { useAppStore } from '../state/appStore';

import { getTheme } from './themes';
import { Theme } from './types';

const ThemeContext = createContext<Theme>(getTheme(undefined));

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeId = useAppStore((s) => s.settings.themeId);
  // customTheme is part of the dependency list so re-editing a custom theme
  // re-reads it from the registry after `registerTheme`.
  const customTheme = useAppStore((s) => s.settings.customTheme);

  const theme = useMemo(() => getTheme(themeId), [themeId, customTheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
