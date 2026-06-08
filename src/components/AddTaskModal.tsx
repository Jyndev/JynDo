import { useTheme } from '@/context/ThemeContext';
import { ImportanceLevel } from '@/types';
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
} from 'react-native';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import CustomText from './CustomText';

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (title: string, description: string, level: ImportanceLevel) => void;
}

export default function AddTaskModal({ visible, onClose, onSave }: AddTaskModalProps) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<ImportanceLevel>('Interesante');
  
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

  const handleSave = () => {
    if (!title.trim()) return;
    onSave(title.trim(), description.trim(), level);
    setTitle('');
    setDescription('');
    setLevel('Interesante');
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setLevel('Interesante');
    onClose();
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
          behavior="padding"
          style={styles.keyboardContainer}
          pointerEvents="box-none"
        >
          {/* Sliding Sheet (only translates vertically) */}
          <Animated.View style={[styles.sheet, { backgroundColor: theme.surface, shadowColor: theme.primary }, sheetStyle]}>
            <View style={styles.header}>
              <CustomText style={[styles.headerTitle, { color: theme.text }]} variant="extrabold">Nueva Tarea</CustomText>
              <TouchableOpacity onPress={handleClose} style={[styles.closeButton, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <CustomText style={[styles.label, { color: theme.text }]} variant="bold">Título de la tarea</CustomText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                placeholder="Escribe tu próxima victoria..."
                placeholderTextColor={theme.textMuted}
                value={title}
                onChangeText={setTitle}
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

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: theme.primary, shadowColor: theme.primary },
                  !title.trim() && [styles.saveButtonDisabled, { backgroundColor: theme.textMuted }]
                ]}
                onPress={handleSave}
                disabled={!title.trim()}
              >
                <CustomText style={styles.saveButtonText} variant="bold">Guardar Tarea</CustomText>
              </TouchableOpacity>
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
});
