import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import CustomText from './CustomText';

const { width } = Dimensions.get('window');

export default function Toast() {
  const { toastMessage, hideToast } = useApp();
  const { theme } = useTheme();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (toastMessage) {
      // Reset values
      translateY.value = -100;
      opacity.value = 0;

      // Animate entry: slide down to safety inset and fade in
      translateY.value = withSpring(Platform.OS === 'ios' ? 54 : 36, { damping: 12 });
      opacity.value = withTiming(1, { duration: 200 });

      // Animate exit after 2.5 seconds
      const timer = setTimeout(() => {
        translateY.value = withTiming(-100, { duration: 250 });
        opacity.value = withTiming(0, { duration: 250 }, (finished) => {
          if (finished) {
            runOnJS(hideToast)();
          }
        });
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  if (!toastMessage) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="none">
      <View style={[styles.toast, { shadowColor: theme.primary, backgroundColor: theme.isDarkMode ? 'rgba(30, 28, 48, 0.95)' : 'rgba(28, 27, 46, 0.95)' }]}>
        <CustomText style={styles.text} variant="semibold">
          {toastMessage}
        </CustomText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10000,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  toast: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    width: width - 48,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    textAlign: 'center',
  },
});
