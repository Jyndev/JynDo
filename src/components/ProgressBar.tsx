import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import CustomText from './CustomText';

interface ProgressBarProps {
  progress: number; // Value between 0 and 1
}

export default function ProgressBar({ progress }: ProgressBarProps) {
  const { theme } = useTheme();
  const percentage = Math.round(progress * 100);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <CustomText style={[styles.label, { color: theme.textMuted }]} variant="semibold">Progreso del día</CustomText>
        <CustomText style={[styles.value, { color: theme.primary }]} variant="bold">{percentage}%</CustomText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.progressBg }]}>
        <View style={[styles.fill, { width: `${percentage}%`, backgroundColor: theme.progressFill }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 15,
  },
  track: {
    height: 10,
    borderRadius: 5,
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
});
