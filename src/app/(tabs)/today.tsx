import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import TaskCard from '@/components/TaskCard';
import { ImportanceLevel } from '@/types';
import CustomText from '@/components/CustomText';

type StatusFilter = 'Todas' | 'Pendientes' | 'Completadas';
type PriorityFilter = 'Todas' | ImportanceLevel;

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { todayTasks, toggleTask, pendingXp } = useApp();
  const { theme } = useTheme();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todas');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('Todas');
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();

      const hours = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
      const minutes = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));
      const seconds = Math.max(0, Math.floor((diff % (1000 * 60)) / 1000));

      const pad = (num: number) => num.toString().padStart(2, '0');
      setTimeRemaining(`${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Priority weights for sorting
  const priorityWeights = { Importante: 3, Interesante: 2, Poca: 1 };

  // Filter tasks
  const filteredTasks = todayTasks
    .filter((task) => {
      // Status filter
      if (statusFilter === 'Pendientes') return !task.completed;
      if (statusFilter === 'Completadas') return task.completed;
      return true;
    })
    .filter((task) => {
      // Priority filter
      if (priorityFilter !== 'Todas') return task.level === priorityFilter;
      return true;
    })
    .sort((a, b) => {
      // Uncompleted tasks first, then by priority weight descending
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      return priorityWeights[b.level] - priorityWeights[a.level];
    });

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + 20 }]}>
      <View style={styles.header}>
        <CustomText style={[styles.title, { color: theme.text }]} variant="extrabold">Tareas de Hoy</CustomText>
        <CustomText style={[styles.subtitle, { color: theme.textMuted }]} variant="regular">Gestiona tus retos diarios</CustomText>
      </View>

      {/* Filter Tabs (Status) */}
      <View style={[styles.filterTabsContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {(['Todas', 'Pendientes', 'Completadas'] as StatusFilter[]).map((tab) => {
          const isActive = statusFilter === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, isActive && [styles.filterTabActive, { backgroundColor: theme.primaryLight }]]}
              onPress={() => setStatusFilter(tab)}
              activeOpacity={0.7}
            >
              <CustomText
                style={[
                  styles.filterTabText,
                  { color: theme.textMuted },
                  isActive && { color: theme.primary },
                ]}
                variant={isActive ? "bold" : "semibold"}
              >
                {tab}
              </CustomText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Filter Badges (Priority) */}
      <View style={styles.priorityBadgesContainer}>
        <CustomText style={[styles.priorityLabel, { color: theme.text }]} variant="semibold">Prioridad:</CustomText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.priorityScroll}>
          {(['Todas', 'Importante', 'Interesante', 'Poca'] as PriorityFilter[]).map((p) => {
            const isActive = priorityFilter === p;
            const colors = p !== 'Todas' ? theme.importance[p] : { bg: theme.primaryLight, text: theme.primary };
            
            return (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityBadgeBtn,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  isActive && {
                    backgroundColor: p !== 'Todas' ? colors.bg : theme.primary,
                    borderColor: p !== 'Todas' ? colors.text : theme.primary,
                    borderWidth: 1.5,
                  },
                ]}
                onPress={() => setPriorityFilter(p)}
                activeOpacity={0.7}
              >
                <CustomText
                  style={[
                    styles.priorityBadgeText,
                    { color: isActive ? (p !== 'Todas' ? colors.text : theme.white) : theme.textMuted },
                  ]}
                  variant="semibold"
                >
                  {p}
                </CustomText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 110 }
        ]}
      >
        {/* Countdown & Pending XP Card */}
        <View style={[styles.crossoverCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardRow}>
            {/* Left section: Pending XP */}
            <View style={styles.xpBox}>
              <View style={[styles.xpIconBadge, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="flash" size={20} color={theme.xpGold} />
              </View>
              <View style={styles.xpTextWrapper}>
                <CustomText style={[styles.xpTitle, { color: theme.textMuted }]} variant="semibold">XP Acumulado Hoy</CustomText>
                <CustomText style={[styles.xpValueText, { color: theme.text }]} variant="extrabold">+{pendingXp} XP</CustomText>
              </View>
            </View>

            {/* Right section: Countdown */}
            <View style={styles.timerBox}>
              <Ionicons name="time-outline" size={16} color={theme.primary} style={styles.timerIcon} />
              <View>
                <CustomText style={[styles.timerTitle, { color: theme.textMuted }]} variant="semibold">Próximo Corte</CustomText>
                <CustomText style={[styles.timerValue, { color: theme.primary }]} variant="bold">{timeRemaining}</CustomText>
              </View>
            </View>
          </View>

          {/* Subtext description */}
          <CustomText style={[styles.infoSubtext, { color: theme.textMuted }]} variant="regular">
            Tus puntos de hoy se consolidarán de forma automática en tu perfil a la medianoche.
          </CustomText>

        </View>

        {filteredTasks.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="clipboard-outline" size={44} color={theme.textMuted} />
            <CustomText style={[styles.emptyText, { color: theme.text }]} variant="semibold">No hay tareas coincidentes</CustomText>
            <CustomText style={[styles.emptySubtext, { color: theme.textMuted }]} variant="regular">Cambia los filtros o añade una nueva tarea</CustomText>
          </View>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={toggleTask}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  filterTabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    marginBottom: 14,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  filterTabActive: {
    // Background color set dynamically
  },
  filterTabText: {
    fontSize: 13,
  },
  priorityBadgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 24,
    marginBottom: 16,
  },
  priorityLabel: {
    fontSize: 13,
    marginRight: 10,
  },
  priorityScroll: {
    gap: 8,
    paddingRight: 24,
  },
  priorityBadgeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  priorityBadgeText: {
    fontSize: 12,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    borderRadius: 24,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 15,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 4,
  },
  crossoverCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  xpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1.1,
  },
  xpIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  xpTextWrapper: {
    flex: 1,
  },
  xpTitle: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  xpValueText: {
    fontSize: 18,
    lineHeight: 22,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 0.9,
    justifyContent: 'flex-end',
  },
  timerIcon: {
    marginTop: 1,
  },
  timerTitle: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'right',
  },
  timerValue: {
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'right',
  },
  infoSubtext: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 14,
  },
  simButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 10,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  simButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
});
