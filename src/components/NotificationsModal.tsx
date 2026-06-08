import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import CustomText from './CustomText';
import { 
  obtenerNotificaciones, 
  marcarNotificacionesComoLeidas, 
  limpiarNotificaciones 
} from '@/services/database';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

function formatNotificationDate(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const timeStr = `${hours}:${minutes}`;

  if (d.toDateString() === now.toDateString()) {
    return `Hoy, ${timeStr}`;
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Ayer, ${timeStr}`;
  }
  
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${d.getDate()} de ${months[d.getMonth()]}, ${timeStr}`;
}

export default function NotificationsModal({ visible, onClose }: NotificationsModalProps) {
  const { theme } = useTheme();
  
  // Custom transition state management
  const [mounted, setMounted] = useState(false);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, { duration: 300 });
      
      const prepareModal = async () => {
        try {
          await marcarNotificacionesComoLeidas();
          const datos = await obtenerNotificaciones();
          setNotificaciones(datos);
        } catch (error) {
          console.log('Error cargando notificaciones:', error);
        }
      };
      prepareModal();
    } else {
      progress.value = withTiming(0, { duration: 250 }, (finished) => {
        if (finished) {
          runOnJS(setMounted)(false);
        }
      });
    }
  }, [visible]);

  const handleClose = () => {
    onClose();
  };

  const handleClear = async () => {
    await limpiarNotificaciones();
    setNotificaciones([]);
  };

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value * 0.5,
    };
  });

  const sheetStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: (1 - progress.value) * (SCREEN_HEIGHT * 0.75),
        },
      ],
    };
  });

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </TouchableWithoutFeedback>

        {/* Sliding Notification Sheet */}
        <Animated.View 
          style={[
            styles.sheet, 
            { backgroundColor: theme.surface, shadowColor: theme.primary }, 
            sheetStyle
          ]}
        >
          {/* Header Indicator / Pill */}
          <View style={[styles.dragPill, { backgroundColor: theme.border }]} />

          {/* Header Title */}
          <View style={styles.header}>
            <View>
              <CustomText style={[styles.headerTitle, { color: theme.text }]} variant="extrabold">Notificaciones</CustomText>
              <CustomText style={[styles.headerSubtitle, { color: theme.textMuted }]} variant="semibold">Centro de actividades de tu perfil</CustomText>
            </View>
            <TouchableOpacity onPress={handleClose} style={[styles.closeButton, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="close" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* Scroll List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {notificaciones.length === 0 ? (
              <View style={[styles.emptyContainer, { borderColor: theme.border }]}>
                <View style={[styles.emptyIconWrapper, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name="notifications-off-outline" size={40} color={theme.primary} />
                </View>
                <CustomText style={[styles.emptyTitle, { color: theme.text }]} variant="bold">Bandeja vacía</CustomText>
                <CustomText style={[styles.emptySubtitle, { color: theme.textMuted }]} variant="regular">
                  No tienes notificaciones por ahora
                </CustomText>
              </View>
            ) : (
              notificaciones.map((item) => {
                // Determine icon based on message content
                const isSimulation = item.title.includes('Simulación');
                const iconName = isSimulation ? "flash" : "moon";
                const iconColor = isSimulation ? theme.xpGold : theme.primary;
                
                return (
                  <View 
                    key={item.id} 
                    style={[
                      styles.card, 
                      { 
                        backgroundColor: theme.background, 
                        borderColor: theme.border,
                      },
                      !item.read && { borderColor: theme.primary, borderWidth: 1 }
                    ]}
                  >
                    {/* Unread indicator dot */}
                    {!item.read && (
                      <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
                    )}

                    <View style={[styles.iconWrapper, { backgroundColor: theme.primaryLight }]}>
                      <Ionicons name={iconName} size={20} color={iconColor} />
                    </View>

                    <View style={styles.cardContent}>
                      <View style={styles.cardHeader}>
                        <CustomText style={[styles.cardTitle, { color: theme.text }]} variant="bold">
                          {item.title}
                        </CustomText>
                        <CustomText style={[styles.cardTime, { color: theme.textMuted }]} variant="semibold">
                          {formatNotificationDate(item.timestamp)}
                        </CustomText>
                      </View>
                      <CustomText style={[styles.cardBody, { color: theme.textMuted }]} variant="regular">
                        {item.message}
                      </CustomText>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Footer Actions */}
          {notificaciones.length > 0 && (
            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.footerBtn, { backgroundColor: theme.primaryLight }]}
                onPress={handleClear}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={16} color={theme.primary} />
                <CustomText style={[styles.footerBtnText, { color: theme.primary }]} variant="bold">
                  Limpiar historial
                </CustomText>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    paddingTop: 12,
    height: SCREEN_HEIGHT * 0.75,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 15,
    elevation: 10,
  },
  dragPill: {
    width: 38,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    lineHeight: 28,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingHorizontal: 24,
    marginTop: 20,
  },
  emptyIconWrapper: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    flex: 1,
  },
  cardTime: {
    fontSize: 10,
  },
  cardBody: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  footerBtnText: {
    fontSize: 13,
  },
});
