import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider } from '@/context/AppContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { 
  useFonts, 
  Poppins_400Regular, 
  Poppins_500Medium,
  Poppins_600SemiBold, 
  Poppins_700Bold, 
  Poppins_800ExtraBold 
} from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { initializeDatabase } from '@/services/database';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const { theme } = useTheme();
  return (
    <SafeAreaProvider>
      <StatusBar style={theme.isDarkMode ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [loaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  // Initialize SQLite Database
  useEffect(() => {
    async function initDb() {
      try {
        await initializeDatabase();
      } catch (err) {
        console.log('Error initializing SQLite db:', err);
      } finally {
        setDbReady(true);
      }
    }
    initDb();
  }, []);

  useEffect(() => {
    if ((loaded || error) && dbReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error, dbReady]);

  if ((!loaded && !error) || !dbReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <ThemeProvider>
          <RootLayoutContent />
        </ThemeProvider>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
