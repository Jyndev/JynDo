import React, { useState, useEffect } from 'react';
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
import { useApp } from '@/context/AppContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 90;

const getRecurrentDaysString = (days?: number[]) => {
  if (!days || days.length === 0) return '';
  const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return days.map(d => dayLabels[d]).join(', ');
};

const getCountdownString = (deadlineStr?: string) => {
  if (!deadlineStr) return '';
  const now = new Date();
  const deadline = new Date(deadlineStr + 'T00:00:00');
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return 'Vence: Hoy';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `Vence: en ${days}d ${hours}h`;
  }
  return `Vence: en ${hours}h`;
};

interface TaskCardProps {
  task: Task;
  onToggle?: (id: string) => void;
  isFuture?: boolean;
}

export default function TaskCard({ task, onToggle = () => {}, isFuture = false }: TaskCardProps) {
  const { theme } = useTheme();
  const { deleteTask, openEditModal } = useApp();
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

  const [countdown, setCountdown] = useState(() => getCountdownString(task.fecha_limite));

  useEffect(() => {
    if (!isFuture || task.tipo !== 'fecha_limite') return;
    setCountdown(getCountdownString(task.fecha_limite));
    const interval = setInterval(() => {
      setCountdown(getCountdownString(task.fecha_limite));
    }, 60000); // update every minute
    return () => clearInterval(interval);
  }, [task.fecha_limite, isFuture]);

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

  const handleDeletePress = () => {
    const todayDay = new Date().getDay();
    const hasPenalty = task.tipo === 'unica' || task.tipo === 'fecha_limite' || (task.tipo === 'recurrente' && task.dias_recurrentes?.includes(todayDay));
    setModalConfig({
      title: 'Eliminar Tarea',
      message: hasPenalty
        ? '¿Estás seguro de eliminar esta tarea? Esto restará irreversiblemente 20 XP de tu progreso total global.'
        : '¿Estás seguro de eliminar esta rutina? Al ser desde la pestaña de Rutinas en un día no programado, no se aplicará ninguna penalización de XP.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      isDestructive: true,
      onConfirm: () => {
        setModalVisible(false);
        deleteTask(task.id);
      },
    });
    setModalVisible(true);
  };

  const panGesture = Gesture.Pan()
    .enabled(!isFuture)
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
          {!isFuture && (
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
          )}

          <View style={styles.content}>
            <CustomText style={[styles.title, { color: theme.text }, task.completed && styles.textCompleted]} variant="bold">
              {task.title}
            </CustomText>
            {task.description ? (
              <CustomText style={[styles.description, { color: theme.textMuted }, task.completed && styles.textCompleted]} variant="regular">
                {task.description}
              </CustomText>
            ) : null}
            
            {/* Future details like countdown or recurrence days */}
            {isFuture && task.tipo === 'fecha_limite' && (
              <CustomText style={{ color: theme.primary, fontSize: 13, marginBottom: 8 }} variant="bold">
                ⏳ {countdown}
              </CustomText>
            )}
            {isFuture && task.tipo === 'recurrente' && (
              <CustomText style={{ color: theme.primary, fontSize: 13, marginBottom: 8 }} variant="bold">
                🔁 Repite: {getRecurrentDaysString(task.dias_recurrentes)}
              </CustomText>
            )}

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
              {task.tipo && task.tipo !== 'unica' && (
                <View style={[styles.typeBadge, { backgroundColor: theme.primaryLight }]}>
                  <CustomText style={[styles.typeBadgeText, { color: theme.primary }]} variant="bold">
                    {task.tipo === 'recurrente' ? 'Recurrente' : 'Plazo'}
                  </CustomText>
                </View>
              )}
            </View>
          </View>

          {/* Action buttons (Edit & Delete) */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => openEditModal(task)}
              style={[styles.actionBtn, { backgroundColor: theme.primaryLight }]}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-outline" size={14} color={theme.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleDeletePress}
              style={[styles.actionBtn, styles.deleteBtn]}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={14} color="#EF4444" />
            </TouchableOpacity>
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
  actions: {
    flexDirection: 'column',
    alignSelf: 'center',
    gap: 8,
    marginLeft: 10,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
  },
});
