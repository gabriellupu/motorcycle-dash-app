import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './src/navigation/RootNavigator';
import { useAppStore } from './src/state/appStore';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { getTheme } from './src/theme/themes';

export default function App() {
  const themeId = useAppStore((s) => s.settings.themeId);
  const dark = getTheme(themeId).dark;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBar style={dark ? 'light' : 'dark'} hidden />
          <RootNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
