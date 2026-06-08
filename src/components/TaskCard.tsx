import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Task } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import CustomText from './CustomText';
import ConfirmationModal from './ConfirmationModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 90;

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
}

export default function TaskCard({ task, onToggle }: TaskCardProps) {
  const { theme } = useTheme();
  const badgeColors = theme.importance[task.level];
  const translateX = useSharedValue(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    isDestructive: false,
    onConfirm: () => {},
  });

  const handleComplete = () => {
    setModalConfig({
      title: 'Completar Tarea',
      message: `¿Deseas marcar "${task.title}" como completada y reclamar +${task.xpValue} XP?`,
      confirmText: 'Completar',
      cancelText: 'Cancelar',
      isDestructive: false,
      onConfirm: () => {
        setModalVisible(false);
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 200 }, (finished) => {
          if (finished) {
            runOnJS(onToggle)(task.id);
            translateX.value = 0; // Reset
          }
        });
      },
    });
    setModalVisible(true);
  };

  const handleUncomplete = () => {
    setModalConfig({
      title: 'Desmarcar Tarea',
      message: `¡Atención! Si desmarcas esta tarea, perderás los +${task.xpValue} XP ganados por completarla. ¿Deseas continuar?`,
      confirmText: 'Desmarcar',
      cancelText: 'Cancelar',
      isDestructive: true,
      onConfirm: () => {
        setModalVisible(false);
        runOnJS(onToggle)(task.id);
        translateX.value = withSpring(0);
      },
    });
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
    translateX.value = withSpring(0);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10]) // Avoid vertical scroll conflict
    .onUpdate((event) => {
      // Only allow swipe right if not completed
      if (!task.completed && event.translationX > 0) {
        translateX.value = event.translationX;
      }
      // Only allow swipe left if completed
      if (task.completed && event.translationX < 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (!task.completed && translateX.value > SWIPE_THRESHOLD) {
        runOnJS(handleComplete)();
      } else if (task.completed && translateX.value < -SWIPE_THRESHOLD) {
        runOnJS(handleUncomplete)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const underlayStyle = useAnimatedStyle(() => {
    return {
      opacity: Math.min(1, Math.abs(translateX.value) / SWIPE_THRESHOLD),
    };
  });

  return (
    <View style={styles.container}>
      {/* Swipe Underlays */}
      {!task.completed && (
        <Animated.View style={[styles.underlay, styles.underlayLeft, underlayStyle]}>
          <Ionicons name="checkmark-done" size={24} color={theme.white} />
          <CustomText style={styles.underlayText} variant="bold">Completar</CustomText>
        </Animated.View>
      )}

      {task.completed && (
        <Animated.View style={[styles.underlay, styles.underlayRight, underlayStyle]}>
          <Ionicons name="arrow-undo" size={24} color={theme.white} />
          <CustomText style={styles.underlayText} variant="bold">Desmarcar</CustomText>
        </Animated.View>
      )}

      {/* Slideable Task Card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.primary }, task.completed && (theme.isDarkMode ? styles.cardCompletedDark : styles.cardCompletedLight), animatedStyle]}>
          <TouchableOpacity
            style={[styles.checkbox, { borderColor: theme.primary }, task.completed && { backgroundColor: theme.primary, borderColor: theme.primary }]}
            activeOpacity={0.7}
            onPress={() => {
              if (task.completed) {
                handleUncomplete();
              } else {
                handleComplete();
              }
            }}
          >
            {task.completed && (
              <Ionicons name="checkmark-sharp" size={14} color={theme.white} />
            )}
          </TouchableOpacity>

          <View style={styles.content}>
            <CustomText style={[styles.title, { color: theme.text }, task.completed && styles.textCompleted]} variant="bold">
              {task.title}
            </CustomText>
            {task.description ? (
              <CustomText style={[styles.description, { color: theme.textMuted }, task.completed && styles.textCompleted]} variant="regular">
                {task.description}
              </CustomText>
            ) : null}
            
            <View style={styles.footer}>
              <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
                <CustomText style={[styles.badgeText, { color: badgeColors.text }]} variant="bold">
                  {task.level}
                </CustomText>
              </View>
              <View style={styles.xpContainer}>
                <Ionicons name="flash" size={12} color={theme.xpGold} />
                <CustomText style={[styles.xpText, { color: theme.xpGold }]} variant="bold">+{task.xpValue} XP</CustomText>
              </View>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>

      <ConfirmationModal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        isDestructive={modalConfig.isDestructive}
        onConfirm={modalConfig.onConfirm}
        onCancel={handleCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 12,
  },
  underlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8,
    width: '100%',
  },
  underlayLeft: {
    backgroundColor: '#10B981', // Emerald success green
    justifyContent: 'flex-start',
  },
  underlayRight: {
    backgroundColor: '#EF4444', // Warning red
    justifyContent: 'flex-end',
  },
  underlayText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    borderWidth: 1,
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'flex-start',
  },
  cardCompletedLight: {
    opacity: 0.6,
    backgroundColor: '#FAF9FE',
  },
  cardCompletedDark: {
    opacity: 0.6,
    backgroundColor: '#1F1E2E',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  textCompleted: {
    textDecorationLine: 'line-through',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  xpText: {
    fontSize: 11,
    marginLeft: 2,
  },
});
