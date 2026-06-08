import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import CustomText from './CustomText';

const { width } = Dimensions.get('window');

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, { duration: 220 });
    } else {
      progress.value = withTiming(0, { duration: 180 }, (finished) => {
        if (finished) {
          runOnJS(setMounted)(false);
        }
      });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value * 0.5,
    };
  });

  const cardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: 0.92 + progress.value * 0.08 },
      ],
      opacity: progress.value,
    };
  });

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent={true}
      animationType="none"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={onCancel}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </TouchableWithoutFeedback>

        {/* Centered Dialog Card */}
        <Animated.View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.primary }, cardStyle]}>
          <CustomText style={[styles.title, { color: theme.text }]} variant="extrabold">
            {title}
          </CustomText>
          <CustomText style={[styles.message, { color: theme.textMuted }]} variant="regular">
            {message}
          </CustomText>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: theme.primaryLight }]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <CustomText style={[styles.cancelText, { color: theme.primary }]} variant="bold">
                {cancelText}
              </CustomText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                isDestructive ? styles.confirmBtnDestructive : [styles.confirmBtnPrimary, { backgroundColor: theme.primary, shadowColor: theme.primary }],
              ]}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <CustomText style={styles.confirmText} variant="bold">
                {confirmText}
              </CustomText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
  },
  card: {
    borderRadius: 28,
    padding: 24,
    width: width - 48,
    alignItems: 'center',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(78, 70, 180, 0.05)',
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnPrimary: {
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  confirmBtnDestructive: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});
