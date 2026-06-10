import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import CustomText from '@/components/CustomText';
import NotificationsModal from '@/components/NotificationsModal';
import { 
  obtenerTareasHoy, 
  obtenerUsuario, 
  obtenerPuntosUltimosDias,
  contarNotificacionesNoLeidas,
  getLocalDateString
} from '@/services/database';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48 - 16) / 2; // 2 columns grid with 16dp gap and 24dp horizontal padding

/** Returns how many hours and minutes remain until midnight */
function hoursUntilMidnight(): { hours: number; minutes: number } {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const diffMs = midnight.getTime() - now.getTime();
  const totalMinutes = Math.floor(diffMs / 60000);
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile, pendingXp, unreadNotificationsCount } = useApp();
  const { theme } = useTheme();
  const [notificationsVisible, setNotificationsVisible] = useState(false);

  // Live data loaded directly from SQLite on focus
  const [countHoy, setCountHoy] = useState(0);
  const [countCompletadas, setCountCompletadas] = useState(0);
  const [countPendientes, setCountPendientes] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userXp, setUserXp] = useState(0);
  const [chartData, setChartData] = useState<{ day: string; xp: number }[]>([]);

  // Hours until midnight (refreshed on every focus)
  const [timeLeft, setTimeLeft] = useState(hoursUntilMidnight());

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadData = async () => {
        try {
          const all = await obtenerTareasHoy('Todas');
          const usuario = await obtenerUsuario();
          const historiales = await obtenerPuntosUltimosDias();

          if (!active) return;
          
          // 1. Tareas
          const completed = all.filter((t) => t.completed).length;
          setCountHoy(all.length);
          setCountCompletadas(completed);
          setCountPendientes(all.length - completed);

          // 2. XP Global
          if (usuario) {
            setUserXp(usuario.puntos_acumulados);
          }

          // 3. Gráfica de últimos 5 días
          const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
          const today = new Date();
          const last5Days: { day: string; xp: number }[] = [];
          
          for (let i = 4; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = getLocalDateString(d);
            const dayLabel = i === 0 ? 'Hoy' : weekdays[d.getDay()];
            
            const foundLog = historiales.find(h => h.date === dateStr);
            last5Days.push({
              day: dayLabel,
              xp: foundLog ? foundLog.xp : 0
            });
          }
          
          setChartData(last5Days);
          
          // 4. Notificaciones no leídas
          const noLeidas = await contarNotificacionesNoLeidas();
          if (active) setUnreadCount(noLeidas);

        } catch (_) {
          // Silently fail – keep default zeros
        }
      };

      loadData();
      setTimeLeft(hoursUntilMidnight());

      return () => {
        active = false;
      };
    }, [])
  );

  // Find max XP for scaling the bar chart
  const maxXp = Math.max(...chartData.map((d) => d.xp), 1);

  // Completion percentage for today
  const completionPercent = countHoy > 0 ? Math.round((countCompletadas / countHoy) * 100) : 0;

  // Dashboard stat cards
  const dashboardStats = [
    {
      id: '1',
      title: 'Tareas de Hoy',
      count: countHoy.toString().padStart(2, '0'),
      icon: 'calendar-outline',
    },
    {
      id: '2',
      title: 'Completadas',
      count: countCompletadas.toString().padStart(2, '0'),
      icon: 'checkmark-circle-outline',
    },
    {
      id: '3',
      title: 'Pendientes',
      count: countPendientes.toString().padStart(2, '0'),
      icon: 'hourglass-outline',
    },
    {
      id: '4',
      title: '% Completado',
      count: `${completionPercent}%`,
      icon: 'stats-chart-outline',
    },
  ];

  const glassBg = theme.isDarkMode
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(255, 255, 255, 0.45)';
  const glassBorder = theme.isDarkMode
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(255, 255, 255, 0.25)';
  const chartBg = theme.isDarkMode
    ? 'rgba(255, 255, 255, 0.06)'
    : 'rgba(255, 255, 255, 0.55)';
  const chartBorder = theme.isDarkMode
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(255, 255, 255, 0.2)';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.isDarkMode ? theme.background : theme.primaryLight,
          paddingTop: insets.top + 16,
        },
      ]}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          <CustomText style={[styles.greeting, { color: theme.text }]} variant="semibold">
            ¡Hola, {profile.name}!
          </CustomText>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.iconButton,
              {
                backgroundColor: theme.isDarkMode
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(255, 255, 255, 0.75)',
              },
            ]}
            activeOpacity={0.7}
            onPress={() => setNotificationsVisible(true)}
          >
            <Ionicons name="notifications" size={20} color={theme.text} />
            {unreadCount > 0 && (
              <View style={styles.badgeDot}>
                <CustomText style={styles.badgeText} variant="bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </CustomText>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 110 },
        ]}
      >
        {/* ── Headline ── */}
        <View style={styles.headlineContainer}>
          <CustomText style={[styles.headline, { color: theme.text }]} variant="regular">
            Inicia las{' '}
            <CustomText
              style={[styles.headlineBold, { color: theme.text }]}
              variant="extrabold"
            >
              tareas
            </CustomText>
          </CustomText>
          <CustomText
            style={[styles.headlineBold, { color: theme.text }]}
            variant="extrabold"
          >
            de hoy.
          </CustomText>
        </View>

        {/* ── 2×2 Dashboard Grid ── */}
        <View style={styles.grid}>
          {dashboardStats.map((stat) => (
            <View
              key={stat.id}
              style={[
                styles.gridCard,
                { backgroundColor: glassBg, borderColor: glassBorder },
              ]}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.cardIconContainer,
                    {
                      backgroundColor: theme.isDarkMode
                        ? 'rgba(255, 255, 255, 0.12)'
                        : 'rgba(255, 255, 255, 0.5)',
                    },
                  ]}
                >
                  <Ionicons name={stat.icon as any} size={16} color={theme.primary} />
                </View>
                <CustomText
                  style={[styles.cardTitle, { color: theme.textMuted }]}
                  variant="semibold"
                >
                  {stat.title}
                </CustomText>
              </View>
              <View style={styles.cardBody}>
                <CustomText
                  style={[styles.cardCount, { color: theme.text }]}
                  variant="bold"
                >
                  {stat.count}
                </CustomText>
              </View>
            </View>
          ))}
        </View>

        {/* ── Pending XP Card ── */}
        <View
          style={[
            styles.pendingCard,
            { backgroundColor: glassBg, borderColor: glassBorder },
          ]}
        >
          {/* Left: XP info */}
          <View style={styles.pendingLeft}>
            <View style={styles.pendingLabelRow}>
              <Ionicons name="flash" size={16} color={theme.xpGold} />
              <CustomText
                style={[styles.pendingLabel, { color: theme.textMuted }]}
                variant="semibold"
              >
                XP acumulados hoy
              </CustomText>
            </View>
            <CustomText
              style={[styles.pendingXpValue, { color: theme.xpGold }]}
              variant="extrabold"
            >
              +{pendingXp} XP
            </CustomText>
            <CustomText
              style={[styles.pendingSubtext, { color: theme.textMuted }]}
              variant="regular"
            >
              Se asignarán a tu perfil a medianoche
            </CustomText>
          </View>

          {/* Right: Countdown */}
          <View
            style={[
              styles.countdownBadge,
              { backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(78,70,180,0.12)' },
            ]}
          >
            <Ionicons name="moon-outline" size={18} color={theme.primary} />
            <CustomText
              style={[styles.countdownTime, { color: theme.primary }]}
              variant="bold"
            >
              {timeLeft.hours}h {timeLeft.minutes}m
            </CustomText>
            <CustomText
              style={[styles.countdownLabel, { color: theme.textMuted }]}
              variant="regular"
            >
              para el corte
            </CustomText>
          </View>
        </View>

        {/* ── Bar Chart ── */}
        <View
          style={[
            styles.chartCard,
            { backgroundColor: chartBg, borderColor: chartBorder },
          ]}
        >
          <View style={styles.chartHeader}>
            <CustomText
              style={[styles.chartTitle, { color: theme.text }]}
              variant="bold"
            >
              Tu Rendimiento (XP)
            </CustomText>
            <View style={[styles.xpSummary, { backgroundColor: theme.surface }]}>
              <Ionicons name="flash" size={14} color={theme.xpGold} />
              <CustomText
                style={[styles.xpSummaryText, { color: theme.xpGold }]}
                variant="bold"
              >
                {userXp} XP
              </CustomText>
            </View>
          </View>

          <View style={styles.chartContainer}>
            {chartData.map((item, index) => {
                const rawPercent = (item.xp / maxXp) * 100;
                // Show a thin minimum bar for days with 0 XP (visual reference)
                const heightPercent = item.xp === 0 ? 3 : Math.min(100, Math.max(8, rawPercent));
                const isToday = item.day === 'Hoy';

                return (
                  <View key={index} style={styles.barColumn}>
                    <View
                      style={[
                        styles.barTrack,
                        {
                          backgroundColor: theme.isDarkMode
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(255, 255, 255, 0.35)',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${heightPercent}%` as any,
                            backgroundColor: theme.isDarkMode
                              ? 'rgba(255, 255, 255, 0.2)'
                              : 'rgba(78, 70, 180, 0.25)',
                          },
                          isToday && { backgroundColor: theme.primary },
                        ]}
                      />
                    </View>
                    <CustomText
                      style={[
                        styles.barLabel,
                        { color: theme.textMuted },
                        isToday && { color: theme.primary },
                      ]}
                      variant={isToday ? 'bold' : 'semibold'}
                    >
                      {item.day}
                    </CustomText>
                    <CustomText
                      style={[styles.barValue, { color: theme.textMuted }]}
                      variant="regular"
                    >
                      {item.xp}
                    </CustomText>
                  </View>
                );
              })}
          </View>
        </View>
      </ScrollView>

      <NotificationsModal
        visible={notificationsVisible}
        onClose={async () => {
          setNotificationsVisible(false);
          // Actualizar contador al cerrar
          const noLeidas = await contarNotificacionesNoLeidas();
          setUnreadCount(noLeidas);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  greeting: {
    fontSize: 15,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    lineHeight: 11,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  headlineContainer: {
    marginBottom: 26,
    marginTop: 6,
  },
  headline: {
    fontSize: 34,
    lineHeight: 40,
  },
  headlineBold: {
    fontSize: 34,
    lineHeight: 40,
  },
  // ── Grid ──
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  gridCard: {
    width: cardWidth,
    borderRadius: 24,
    padding: 16,
    height: 108,
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 11,
    flexShrink: 1,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  cardCount: {
    fontSize: 28,
  },
  // ── Pending XP card ──
  pendingCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  pendingLeft: {
    flex: 1,
    gap: 4,
  },
  pendingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pendingLabel: {
    fontSize: 12,
  },
  pendingXpValue: {
    fontSize: 26,
    lineHeight: 32,
  },
  pendingSubtext: {
    fontSize: 11,
    lineHeight: 16,
  },
  countdownBadge: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 3,
    minWidth: 80,
  },
  countdownTime: {
    fontSize: 15,
    textAlign: 'center',
  },
  countdownLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  // ── Bar Chart ──
  chartCard: {
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 15,
  },
  xpSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  xpSummaryText: {
    fontSize: 11,
    marginLeft: 3,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    paddingHorizontal: 8,
    paddingTop: 10,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    width: 22,
    height: 110,
    borderRadius: 11,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 11,
  },
  barLabel: {
    fontSize: 11,
    marginTop: 6,
  },
  barValue: {
    fontSize: 9,
    marginTop: 2,
  },
});
