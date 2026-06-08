import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import HistoryGroup from '@/components/HistoryGroup';
import CustomText from '@/components/CustomText';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { historyDays, deleteHistoryDay } = useApp();
  const { theme } = useTheme();
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
        <CustomText style={[styles.subtitle, { color: theme.textMuted }]} variant="medium">Historial de días anteriores</CustomText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 110 } // Leave space for floating tab bar
        ]}
      >
        {historyDays.length === 0 ? (
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
