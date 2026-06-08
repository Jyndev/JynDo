import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface CustomTextProps extends TextProps {
  variant?: 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';
}

export default function CustomText({ variant = 'regular', style, children, ...props }: CustomTextProps) {
  const { theme } = useTheme();
  const fontStyle = styles[variant];
  return (
    <RNText style={[{ color: theme.text }, fontStyle, style]} {...props}>
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  regular: {
    fontFamily: 'Poppins_400Regular',
  },
  medium: {
    fontFamily: 'Poppins_500Medium',
  },
  semibold: {
    fontFamily: 'Poppins_600SemiBold',
  },
  bold: {
    fontFamily: 'Poppins_700Bold',
  },
  extrabold: {
    fontFamily: 'Poppins_800ExtraBold',
  },
});
