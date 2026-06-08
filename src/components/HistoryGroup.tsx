import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { DayHistory } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import CustomText from './CustomText';

interface HistoryGroupProps {
  day: DayHistory;
  onDelete: (id: string) => void;
}

export default function HistoryGroup({ day, onDelete }: HistoryGroupProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.groupContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <CustomText style={[styles.dateText, { color: theme.text }]} variant="bold">{day.date}</CustomText>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(day.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={14} color={theme.textMuted} />
          <CustomText style={[styles.deleteButtonText, { color: theme.textMuted }]} variant="semibold">Eliminar día</CustomText>
        </TouchableOpacity>
      </View>

      <View style={styles.taskList}>
        {day.tasks.map((task) => {
          const badgeColors = theme.importance[task.level];
          return (
            <View key={task.id} style={styles.taskItem}>
              <View style={styles.checkIndicator}>
                <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
              </View>
              <View style={styles.taskContent}>
                <CustomText style={[styles.taskTitle, { color: theme.text }]} variant="bold">{task.title}</CustomText>
                {task.description ? (
                  <CustomText style={[styles.taskDescription, { color: theme.textMuted }]} variant="regular">{task.description}</CustomText>
                ) : null}
                <View style={styles.taskFooter}>
                  <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
                    <CustomText style={[styles.badgeText, { color: badgeColors.text }]} variant="bold">
                      {task.level}
                    </CustomText>
                  </View>
                  <View style={styles.xpBadge}>
                    <Ionicons name="flash" size={10} color={theme.xpGold} />
                    <CustomText style={[styles.xpText, { color: theme.xpGold }]} variant="bold">+{task.xpValue} XP</CustomText>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  groupContainer: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  dateText: {
    fontSize: 15,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteButtonText: {
    fontSize: 12,
  },
  taskList: {
    gap: 16,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkIndicator: {
    marginRight: 10,
    marginTop: 1,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
  },
  taskDescription: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  xpText: {
    fontSize: 10,
    marginLeft: 2,
  },
});
