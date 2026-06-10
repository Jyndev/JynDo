import React, { useState } from 'react';
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
import HistoryGroup from '@/components/HistoryGroup';
import TaskCard from '@/components/TaskCard';
import CustomText from '@/components/CustomText';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { historyDays, deleteHistoryDay, recurrentTasks, futureTasks } = useApp();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'history' | 'recurrent' | 'future'>('history');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const handleDeletePress = (id: string) => {
    setSelectedDayId(id);
    setModalVisible(true);
  };

  const handleConfirmDelete = () => {
    if (selectedDayId) {
      deleteHistoryDay(selectedDayId);
      setSelectedDayId(null);
    }
    setModalVisible(false);
  };

  const handleCancelDelete = () => {
    setSelectedDayId(null);
    setModalVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + 24 }]}>
      {/* Title */}
      <View style={styles.titleContainer}>
        <CustomText style={[styles.title, { color: theme.text }]} variant="extrabold">Tu Progreso</CustomText>
        <CustomText style={[styles.subtitle, { color: theme.textMuted }]} variant="medium">
          {activeTab === 'history' && 'Historial de días anteriores'}
          {activeTab === 'recurrent' && 'Administra tus tareas recurrentes'}
          {activeTab === 'future' && 'Próximas tareas programadas'}
        </CustomText>
      </View>

      {/* Tabs Selector */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'history' && { backgroundColor: theme.primary }
          ]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.8}
        >
          <CustomText
            style={[
              styles.tabText,
              { color: activeTab === 'history' ? theme.white : theme.textMuted }
            ]}
            variant="bold"
          >
            Historial
          </CustomText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'recurrent' && { backgroundColor: theme.primary }
          ]}
          onPress={() => setActiveTab('recurrent')}
          activeOpacity={0.8}
        >
          <CustomText
            style={[
              styles.tabText,
              { color: activeTab === 'recurrent' ? theme.white : theme.textMuted }
            ]}
            variant="bold"
          >
            Rutinas
          </CustomText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'future' && { backgroundColor: theme.primary }
          ]}
          onPress={() => setActiveTab('future')}
          activeOpacity={0.8}
        >
          <CustomText
            style={[
              styles.tabText,
              { color: activeTab === 'future' ? theme.white : theme.textMuted }
            ]}
            variant="bold"
          >
            Agenda
          </CustomText>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 110 } // Leave space for floating tab bar
        ]}
      >
        {activeTab === 'history' && (
          historyDays.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="calendar-outline" size={56} color={theme.textMuted} />
              <CustomText style={[styles.emptyText, { color: theme.text }]} variant="bold">El historial está vacío</CustomText>
              <CustomText style={[styles.emptySubtext, { color: theme.textMuted }]} variant="regular">
                Las tareas que completes en los próximos días aparecerán aquí.
              </CustomText>
            </View>
          ) : (
            historyDays.map((day) => (
              <HistoryGroup
                key={day.id}
                day={day}
                onDelete={handleDeletePress}
              />
            ))
          )
        )}

        {activeTab === 'recurrent' && (
          recurrentTasks.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="repeat-outline" size={56} color={theme.textMuted} />
              <CustomText style={[styles.emptyText, { color: theme.text }]} variant="bold">Sin rutinas configuradas</CustomText>
              <CustomText style={[styles.emptySubtext, { color: theme.textMuted }]} variant="regular">
                Crea tareas recurrentes para establecer tus hábitos diarios.
              </CustomText>
            </View>
          ) : (
            recurrentTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isFuture={true}
              />
            ))
          )
        )}

        {activeTab === 'future' && (
          futureTasks.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="alarm-outline" size={56} color={theme.textMuted} />
              <CustomText style={[styles.emptyText, { color: theme.text }]} variant="bold">Tu agenda está despejada</CustomText>
              <CustomText style={[styles.emptySubtext, { color: theme.textMuted }]} variant="regular">
                Aquí verás las tareas futuras con fecha límite y sus cuentas regresivas.
              </CustomText>
            </View>
          ) : (
            futureTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isFuture={true}
              />
            ))
          )
        )}
      </ScrollView>

      <ConfirmationModal
        visible={modalVisible}
        title="Eliminar Historial"
        message="¿Estás seguro de que deseas eliminar el historial de este día? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  tabText: {
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
