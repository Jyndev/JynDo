import { useTheme } from '@/context/ThemeContext';
import { ImportanceLevel, TaskType, Task } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    ScrollView,
    Dimensions,
} from 'react-native';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import CustomText from './CustomText';

const formatDate = (d: Date) => {
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const getTomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (
    title: string,
    description: string,
    level: ImportanceLevel,
    tipo?: TaskType,
    diasRecurrentes?: number[],
    fechaLimite?: string
  ) => void;
  taskToEdit?: Task | null;
}

export default function AddTaskModal({ visible, onClose, onSave, taskToEdit }: AddTaskModalProps) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<ImportanceLevel>('Interesante');
  const [tipo, setTipo] = useState<TaskType>('unica');
  const [diasRecurrentes, setDiasRecurrentes] = useState<number[]>([]);
  const [date, setDate] = useState<Date>(() => getTomorrow());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom transition state management
  const [mounted, setMounted] = useState(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, { duration: 280 });
    } else {
      progress.value = withTiming(0, { duration: 220 }, (finished) => {
        if (finished) {
          runOnJS(setMounted)(false);
        }
      });
    }
  }, [visible]);

  useEffect(() => {
    setError(null);
    if (visible && taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setLevel(taskToEdit.level);
      setTipo(taskToEdit.tipo || 'unica');
      setDiasRecurrentes(taskToEdit.dias_recurrentes || []);
      const tomorrow = getTomorrow();
      let initialDate = taskToEdit.fecha_limite ? new Date(taskToEdit.fecha_limite + 'T00:00:00') : tomorrow;
      if (initialDate < tomorrow) {
        initialDate = tomorrow;
      }
      setDate(initialDate);
    } else if (visible) {
      setTitle('');
      setDescription('');
      setLevel('Interesante');
      setTipo('unica');
      setDiasRecurrentes([]);
      setDate(getTomorrow());
    }
  }, [taskToEdit, visible]);

  const handleSave = () => {
    if (!title.trim()) return;
    if (tipo === 'recurrente' && diasRecurrentes.length === 0) return;

    if (tipo === 'fecha_limite') {
      const tomorrow = getTomorrow();
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      if (checkDate < tomorrow) {
        setError("La fecha límite debe ser como mínimo el día de mañana.");
        return;
      }
    }

    const dateStr = tipo === 'fecha_limite' ? formatDate(date) : undefined;

    onSave(
      title.trim(),
      description.trim(),
      level,
      tipo,
      tipo === 'recurrente' ? diasRecurrentes : undefined,
      dateStr
    );

    setTitle('');
    setDescription('');
    setLevel('Interesante');
    setTipo('unica');
    setDiasRecurrentes([]);
    setDate(getTomorrow());
    setShowDatePicker(false);
    setError(null);
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setLevel('Interesante');
    setTipo('unica');
    setDiasRecurrentes([]);
    setDate(getTomorrow());
    setShowDatePicker(false);
    setError(null);
    onClose();
  };

  const onChangeDate = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const priorities: ImportanceLevel[] = ['Poca', 'Interesante', 'Importante'];

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value * 0.5,
    };
  });

  const sheetStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: (1 - progress.value) * 480,
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
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        {/* Absolute Backdrop (only fades opacity) */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </TouchableWithoutFeedback>

        {/* Keyboard Avoiding Container */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
          pointerEvents="box-none"
        >
          {/* Sliding Sheet (only translates vertically) */}
          <Animated.View style={[styles.sheet, { backgroundColor: theme.surface, shadowColor: theme.primary }, sheetStyle]}>
            <View style={styles.header}>
              <CustomText style={[styles.headerTitle, { color: theme.text }]} variant="extrabold">
                {taskToEdit ? 'Editar Tarea' : 'Nueva Tarea'}
              </CustomText>
              <TouchableOpacity onPress={handleClose} style={[styles.closeButton, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.scrollForm}
                keyboardShouldPersistTaps="handled"
              >
                <CustomText style={[styles.label, { color: theme.text }]} variant="bold">Título de la tarea</CustomText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="Escribe tu próxima victoria..."
                  placeholderTextColor={theme.textMuted}
                  value={title}
                  onChangeText={(val) => {
                    setTitle(val);
                    setError(null);
                  }}
                />

                <CustomText style={[styles.label, { color: theme.text }]} variant="bold">Descripción (Opcional)</CustomText>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="Añade drama o detalles aburridos aquí..."
                  placeholderTextColor={theme.textMuted}
                  multiline={true}
                  numberOfLines={3}
                  value={description}
                  onChangeText={setDescription}
                />

                <CustomText style={[styles.label, { color: theme.text }]} variant="bold">Importancia / Prioridad</CustomText>
                <View style={styles.priorityGroup}>
                  {priorities.map((p) => {
                    const isSelected = level === p;
                    const badgeColors = theme.importance[p];
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.priorityOption,
                          { backgroundColor: theme.background, borderColor: theme.border },
                          isSelected && {
                            backgroundColor: badgeColors.bg,
                            borderColor: badgeColors.text,
                            borderWidth: 1.5,
                          },
                        ]}
                        onPress={() => setLevel(p)}
                      >
                        <CustomText
                          style={[
                            styles.priorityText,
                            { color: isSelected ? badgeColors.text : theme.textMuted },
                          ]}
                          variant="bold"
                        >
                          {p}
                        </CustomText>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Task Type Selection */}
                <CustomText style={[styles.label, { color: theme.text }]} variant="bold">Tipo de Tarea</CustomText>
                <View style={styles.typeGroup}>
                  {(['unica', 'recurrente', 'fecha_limite'] as TaskType[]).map((t) => {
                    const isSelected = tipo === t;
                    const label = t === 'unica' ? 'Única' : t === 'recurrente' ? 'Recurrente' : 'Fecha Límite';
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.typeOption,
                          { backgroundColor: theme.background, borderColor: theme.border },
                          isSelected && {
                            backgroundColor: theme.primaryLight,
                            borderColor: theme.primary,
                            borderWidth: 1.5,
                          },
                        ]}
                        onPress={() => {
                          setTipo(t);
                          setShowDatePicker(false);
                          setError(null);
                        }}
                      >
                        <CustomText
                          style={[
                            styles.typeText,
                            { color: isSelected ? theme.primary : theme.textMuted },
                          ]}
                          variant="bold"
                        >
                          {label}
                        </CustomText>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Conditional Recurrence Weekdays Selection */}
                {tipo === 'recurrente' && (
                  <View style={styles.recurrenceSection}>
                    <CustomText style={[styles.label, { color: theme.text }]} variant="bold">Repetir los días</CustomText>
                    <View style={styles.daysContainer}>
                      {[
                        { label: 'D', value: 0 },
                        { label: 'L', value: 1 },
                        { label: 'M', value: 2 },
                        { label: 'M', value: 3 },
                        { label: 'J', value: 4 },
                        { label: 'V', value: 5 },
                        { label: 'S', value: 6 }
                      ].map((day) => {
                        const isSelected = diasRecurrentes.includes(day.value);
                        return (
                          <TouchableOpacity
                            key={day.value}
                            style={[
                              styles.dayCircle,
                              { backgroundColor: theme.background, borderColor: theme.border },
                              isSelected && {
                                backgroundColor: theme.primary,
                                borderColor: theme.primary,
                              },
                            ]}
                            onPress={() => {
                              const todayDay = new Date().getDay();
                              const isOriginalDayToday = taskToEdit && taskToEdit.tipo === 'recurrente' && taskToEdit.dias_recurrentes?.includes(todayDay);
                              if (isOriginalDayToday && day.value === todayDay && diasRecurrentes.includes(day.value)) {
                                setError("No puedes desmarcar el día de hoy de una rutina activa para evitar la penalización.");
                                return;
                              }
                              setError(null);
                              if (diasRecurrentes.includes(day.value)) {
                                setDiasRecurrentes(diasRecurrentes.filter((d) => d !== day.value));
                              } else {
                                setDiasRecurrentes([...diasRecurrentes, day.value].sort());
                              }
                            }}
                          >
                            <CustomText
                              style={[
                                styles.dayCircleText,
                                { color: isSelected ? theme.white : theme.textMuted },
                              ]}
                              variant="bold"
                            >
                              {day.label}
                            </CustomText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Conditional Deadline Date Selection */}
                {tipo === 'fecha_limite' && (
                  <View style={styles.deadlineSection}>
                    <CustomText style={[styles.label, { color: theme.text }]} variant="bold">Fecha de Vencimiento</CustomText>
                    <TouchableOpacity
                      style={[styles.dateButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                      onPress={() => setShowDatePicker(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                      <CustomText style={[styles.dateButtonText, { color: theme.text }]} variant="semibold">
                        {formatDate(date)}
                      </CustomText>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        minimumDate={getTomorrow()}
                        onChange={onChangeDate}
                      />
                    )}
                    <CustomText style={{ color: theme.textMuted, fontSize: 12, marginTop: 8, fontStyle: 'italic' }} variant="regular">
                      Las fechas límite vencen al inicio del día seleccionado para permitir el transcurso completo del día actual.
                    </CustomText>
                  </View>
                )}

                {/* Inline Error Message */}
                {error && (
                  <View style={[styles.errorContainer, { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}>
                    <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                    <CustomText style={styles.errorText} variant="semibold">
                      {error}
                    </CustomText>
                  </View>
                )}
              </ScrollView>

              {/* Save Button */}
              {(() => {
                const isSaveDisabled = !title.trim() || (tipo === 'recurrente' && diasRecurrentes.length === 0);
                return (
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      { backgroundColor: theme.primary, shadowColor: theme.primary },
                      isSaveDisabled && [styles.saveButtonDisabled, { backgroundColor: theme.textMuted }]
                    ]}
                    onPress={handleSave}
                    disabled={isSaveDisabled}
                  >
                    <CustomText style={styles.saveButtonText} variant="bold">Guardar Tarea</CustomText>
                  </TouchableOpacity>
                );
              })()}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
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
  keyboardContainer: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 20,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 15,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    fontFamily: 'Poppins_600SemiBold',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  priorityGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 13,
  },
  saveButton: {
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  typeGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
    gap: 8,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  typeText: {
    fontSize: 13,
  },
  recurrenceSection: {
    marginTop: 8,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  dayCircleText: {
    fontSize: 12,
  },
  deadlineSection: {
    marginTop: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
  },
  dateButtonText: {
    fontSize: 15,
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    gap: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    flex: 1,
  },
  scrollForm: {
    maxHeight: SCREEN_HEIGHT * 0.52,
  },
});
