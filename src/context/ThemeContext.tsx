import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { obtenerUsuario, actualizarTemaUsuario } from '@/services/database';

export interface Theme {
  isDarkMode: boolean;
  background: string;
  surface: string;
  primary: string;
  primaryLight: string;
  text: string;
  textMuted: string;
  border: string;
  white: string;
  overlay: string;
  progressBg: string;
  progressFill: string;
  xpGold: string;
  importance: {
    Importante: { bg: string; text: string };
    Interesante: { bg: string; text: string };
    Poca: { bg: string; text: string };
  };
}

interface ThemeContextType {
  isDarkMode: boolean;
  primaryColor: string;
  theme: Theme;
  setDarkMode: (value: boolean) => void;
  setPrimaryColor: (value: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme presets map to beautiful predefined light/dark background colors
export const THEME_PRESETS: Record<string, { name: string; light: string; dark: string }> = {
  '#4E46B4': { name: 'Lavanda', light: '#EEECFB', dark: '#22204E' },
  '#0D9488': { name: 'Teal', light: '#E6F4F1', dark: '#133936' },
  '#10B981': { name: 'Menta', light: '#E6F7F0', dark: '#153D2E' },
  '#EC4899': { name: 'Rosa', light: '#FDF2F8', dark: '#401F31' },
  '#F97316': { name: 'Naranja', light: '#FFF7ED', dark: '#412210' },
};

export function isValidHex(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

function getPrimaryLight(hex: string, isDarkMode: boolean): string {
  if (THEME_PRESETS[hex]) {
    return isDarkMode ? THEME_PRESETS[hex].dark : THEME_PRESETS[hex].light;
  }
  // Dynamic fallback for custom colors: add alpha channel in hex
  // Clean custom hex first (remove # if present, make sure it is 6 chars or expand 3 to 6)
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  return `#${cleanHex}${isDarkMode ? '20' : '15'}`;
}

export function generatePalette(isDarkMode: boolean, primaryColor: string): Theme {
  const accentColor = isValidHex(primaryColor) ? primaryColor : '#4E46B4';
  const primaryLight = getPrimaryLight(accentColor, isDarkMode);

  if (isDarkMode) {
    return {
      isDarkMode: true,
      background: '#0F0E17',
      surface: '#1A1824',
      primary: accentColor,
      primaryLight: primaryLight,
      text: '#FFFFFF',
      textMuted: '#A1A0BD',
      border: '#2A2837',
      white: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.6)',
      progressBg: '#2A2837',
      progressFill: accentColor,
      xpGold: '#F59E0B',
      importance: {
        Importante: {
          bg: '#451A1A',
          text: '#F87171',
        },
        Interesante: {
          bg: '#453015',
          text: '#FBBF24',
        },
        Poca: {
          bg: '#152E40',
          text: '#38BDF8',
        },
      },
    };
  } else {
    return {
      isDarkMode: false,
      background: '#F5F6FC',
      surface: '#FFFFFF',
      primary: accentColor,
      primaryLight: primaryLight,
      text: '#1C1B2E',
      textMuted: '#7D7C98',
      border: '#E6E5FA',
      white: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.4)',
      progressBg: primaryLight,
      progressFill: accentColor,
      xpGold: '#F59E0B',
      importance: {
        Importante: {
          bg: '#FEE2E2',
          text: '#EF4444',
        },
        Interesante: {
          bg: '#FEF3C7',
          text: '#D97706',
        },
        Poca: {
          bg: '#E0F2FE',
          text: '#0284C7',
        },
      },
    };
  }
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDarkMode, setDarkMode] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#4E46B4');

  // Load theme settings from SQLite on mount
  useEffect(() => {
    async function loadThemeSettings() {
      try {
        const user = await obtenerUsuario();
        if (user) {
          setDarkMode(user.is_dark_mode === 1);
          setPrimaryColor(user.primary_color_hex);
        }
      } catch (err) {
        console.log('Error loading theme settings in ThemeProvider:', err);
      }
    }
    loadThemeSettings();
  }, []);

  const handleSetDarkMode = async (value: boolean) => {
    setDarkMode(value);
    try {
      await actualizarTemaUsuario(value, primaryColor);
    } catch (err) {
      console.log('Error saving dark mode in DB:', err);
    }
  };

  const handleSetPrimaryColor = async (value: string) => {
    setPrimaryColor(value);
    try {
      await actualizarTemaUsuario(isDarkMode, value);
    } catch (err) {
      console.log('Error saving primary color in DB:', err);
    }
  };

  const theme = generatePalette(isDarkMode, primaryColor);

  return (
    <ThemeContext.Provider value={{ isDarkMode, primaryColor, theme, setDarkMode: handleSetDarkMode, setPrimaryColor: handleSetPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
