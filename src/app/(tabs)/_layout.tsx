import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useState } from 'react';
import AddTaskModal from '@/components/AddTaskModal';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import Toast from '@/components/Toast';
import CustomText from '@/components/CustomText';

export default function TabsLayout() {
  const [modalVisible, setModalVisible] = useState(false);
  const { addTask, editModalVisible, taskToEdit, closeEditModal, updateTask } = useApp();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textMuted,
          tabBarStyle: [styles.tabBar, { backgroundColor: theme.surface }],
          tabBarItemStyle: styles.tabBarItem,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarLabel: ({ color, focused }) => (
              <CustomText 
                style={{ color, fontSize: 10, marginTop: 2 }} 
                variant={focused ? 'bold' : 'semibold'}
              >
                Inicio
              </CustomText>
            ),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons 
                name={focused ? "home" : "home-outline"} 
                size={size - 2} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="today"
          options={{
            title: 'Hoy',
            tabBarLabel: ({ color, focused }) => (
              <CustomText 
                style={{ color, fontSize: 10, marginTop: 2 }} 
                variant={focused ? 'bold' : 'semibold'}
              >
                Hoy
              </CustomText>
            ),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons 
                name={focused ? "checkbox" : "checkbox-outline"} 
                size={size - 2} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: '',
            tabBarButton: (props) => (
              <TouchableOpacity
                {...props as any}
                style={[props.style, styles.addButtonContainer]}
                activeOpacity={0.8}
                onPress={() => setModalVisible(true)}
              >
                <View style={[styles.addButton, { backgroundColor: theme.primary, shadowColor: theme.primary }]}>
                  <Ionicons name="add" size={30} color={theme.white} />
                </View>
              </TouchableOpacity>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setModalVisible(true);
            },
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'Historial',
            tabBarLabel: ({ color, focused }) => (
              <CustomText 
                style={{ color, fontSize: 10, marginTop: 2 }} 
                variant={focused ? 'bold' : 'semibold'}
              >
                Historial
              </CustomText>
            ),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons 
                name={focused ? "stats-chart" : "stats-chart-outline"} 
                size={size - 2} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarLabel: ({ color, focused }) => (
              <CustomText 
                style={{ color, fontSize: 10, marginTop: 2 }} 
                variant={focused ? 'bold' : 'semibold'}
              >
                Perfil
              </CustomText>
            ),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons 
                name={focused ? "person" : "person-outline"} 
                size={size - 2} 
                color={color} 
              />
            ),
          }}
        />
      </Tabs>

      <AddTaskModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={(title, desc, level, tipo, diasRecurrentes, fechaLimite) => {
          addTask(title, desc, level, tipo, diasRecurrentes, fechaLimite);
          setModalVisible(false);
        }}
      />

      <AddTaskModal
        visible={editModalVisible}
        onClose={closeEditModal}
        taskToEdit={taskToEdit}
        onSave={(title, desc, level, tipo, diasRecurrentes, fechaLimite) => {
          if (taskToEdit) {
            updateTask(taskToEdit.id, title, desc, level, tipo, diasRecurrentes, fechaLimite);
          }
        }}
      />

      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: 74,
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
    paddingBottom: Platform.OS === 'ios' ? 14 : 10,
    paddingTop: 10,
  },
  tabBarItem: {
    height: 52,
  },
  addButtonContainer: {
    top: -16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 4,
  },
});
