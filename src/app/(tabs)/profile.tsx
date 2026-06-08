import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import CustomText from '@/components/CustomText';
import { DEFAULT_AVATAR_URL } from '@/services/database';


function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHue(hex: string): number {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  
  if (max !== min) {
    const d = max - min;
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return Math.round(h * 360);
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, updateProfileName, updateProfileAvatar, showToast } = useApp();
  const { theme, isDarkMode, setDarkMode, primaryColor, setPrimaryColor } = useTheme();
  
  const [tempName, setTempName] = useState(profile.name);
  const [selectedAvatar, setSelectedAvatar] = useState(profile.avatarUrl);
  const [isEditing, setIsEditing] = useState(false);
  const [sliderWidth, setSliderWidth] = useState(200);

  useEffect(() => {
    setTempName(profile.name);
    setSelectedAvatar(profile.avatarUrl);
  }, [profile.name, profile.avatarUrl]);

  // Gamification stats
  const level = Math.floor(profile.xp / 1000) + 1;
  const currentLevelMin = (level - 1) * 1000;
  const xpInCurrentLevel = profile.xp - currentLevelMin;
  const nextLevelXpNeeded = 1000;
  const levelProgress = xpInCurrentLevel / nextLevelXpNeeded;

  const handleSave = () => {
    if (!tempName.trim()) {
      showToast('⚠️ El nombre no puede estar vacío');
      return;
    }
    updateProfileName(tempName.trim());
    setIsEditing(false);
    showToast('👤 ¡Perfil actualizado con éxito!');
  };

  const handleSelectAvatar = (url: string) => {
    setSelectedAvatar(url);
    updateProfileAvatar(url);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('⚠️ Se requieren permisos para seleccionar imágenes');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedUri = result.assets[0].uri;
      setSelectedAvatar(selectedUri);
      updateProfileAvatar(selectedUri);
      showToast('📸 ¡Foto de perfil actualizada!');
    }
  };


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 110 }
        ]}
      >
        <CustomText style={[styles.title, { color: theme.text }]} variant="extrabold">Mi Perfil</CustomText>
        
        {/* Level and XP Dashboard Card */}
        <View style={[styles.gamificationCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.badgeContainer}>
            <View style={[styles.levelBadge, { backgroundColor: theme.primary, shadowColor: theme.primary }]}>
              <CustomText style={styles.levelNumber} variant="extrabold">{level}</CustomText>
              <CustomText style={styles.levelLabel} variant="bold">Nivel</CustomText>
            </View>
          </View>
          
          <View style={styles.progressSection}>
            <View style={styles.xpInfo}>
              <CustomText style={[styles.xpScore, { color: theme.text }]} variant="bold">{profile.xp} XP acumulados</CustomText>
              <CustomText style={[styles.xpTarget, { color: theme.textMuted }]} variant="semibold">{xpInCurrentLevel} / {nextLevelXpNeeded} XP</CustomText>
            </View>
            
            {/* Level progress bar */}
            <View style={[styles.progressBarTrack, { backgroundColor: theme.primaryLight }]}>
              <View style={[styles.progressBarFill, { backgroundColor: theme.primary, width: `${levelProgress * 100}%` }]} />
            </View>
            
            <CustomText style={[styles.levelUpText, { color: theme.textMuted }]} variant="semibold">
              Faltan {nextLevelXpNeeded - xpInCurrentLevel} XP para el Nivel {level + 1}
            </CustomText>
          </View>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Avatar selector */}
          <CustomText style={[styles.sectionLabel, { color: theme.text }]} variant="bold">Foto de Perfil</CustomText>
          
          <View style={styles.avatarContainer}>
            <View style={[styles.largeAvatarWrapper, { borderColor: theme.primary }]}>
              <Image source={{ uri: selectedAvatar }} style={styles.largeAvatar} />
            </View>
            
            <View style={styles.avatarActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                onPress={pickImage}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={16} color="#FFFFFF" />
                <CustomText style={styles.actionBtnText} variant="bold">Subir Foto</CustomText>
              </TouchableOpacity>
              
              {selectedAvatar !== DEFAULT_AVATAR_URL && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteActionBtn, { backgroundColor: theme.isDarkMode ? '#3B1E1E' : '#FEE2E2' }]}
                  onPress={() => handleSelectAvatar(DEFAULT_AVATAR_URL)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <CustomText style={[styles.actionBtnText, { color: '#EF4444' }]} variant="bold">Quitar Foto</CustomText>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Form */}
          <CustomText style={[styles.sectionLabel, { color: theme.text }]} variant="bold">Nombre de usuario</CustomText>
          {isEditing ? (
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.primary }]}
                value={tempName}
                onChangeText={setTempName}
                autoFocus
                maxLength={15}
              />
              <View style={styles.editActions}>
                <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => { setTempName(profile.name); setIsEditing(false); }}>
                  <Ionicons name="close" size={20} color={theme.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary, shadowColor: theme.primary }]} onPress={handleSave}>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.displayContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <CustomText style={[styles.displayName, { color: theme.text }]} variant="bold">{profile.name}</CustomText>
              <TouchableOpacity
                style={[styles.editBtn, { backgroundColor: theme.primaryLight }]}
                onPress={() => setIsEditing(true)}
              >
                <Ionicons name="pencil-sharp" size={16} color={theme.primary} />
                <CustomText style={[styles.editBtnText, { color: theme.primary }]} variant="bold">Editar</CustomText>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Personalization Section */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 20 }]}>
          <CustomText style={[styles.sectionLabel, { color: theme.text }]} variant="bold">Personalización</CustomText>
          
          {/* Dark Mode Row */}
          <View style={styles.themeRow}>
            <View style={styles.themeLabelContainer}>
              <Ionicons name={isDarkMode ? "moon" : "sunny"} size={20} color={theme.primary} />
              <CustomText style={[styles.themeLabel, { color: theme.text }]} variant="semibold">Modo Oscuro</CustomText>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: theme.border, true: theme.primaryLight }}
              thumbColor={isDarkMode ? theme.primary : '#f4f3f4'}
              ios_backgroundColor={theme.border}
            />
          </View>

          {/* Accent Color Section */}
          <CustomText style={[styles.sectionLabel, { color: theme.text, marginTop: 16 }]} variant="bold">Color de Acento</CustomText>
          <View style={styles.colorPresetRow}>
            {['#4E46B4', '#0D9488', '#10B981', '#EC4899', '#F97316'].map((color) => {
              const isSelected = primaryColor.toLowerCase() === color.toLowerCase();
              return (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color },
                    isSelected && { borderColor: theme.text, borderWidth: 3 }
                  ]}
                  onPress={() => {
                    setPrimaryColor(color);
                  }}
                  activeOpacity={0.8}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom HSL Hue Slider */}
          <CustomText style={[styles.sectionLabel, { color: theme.text, marginTop: 16 }]} variant="semibold">Selector de Color Personalizado</CustomText>
          <View style={styles.pickerContainer}>
            {/* The Rainbow Track Wrapper */}
            <View 
              style={[styles.sliderTrackWrapper, { borderColor: theme.border }]}
              onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                const x = Math.max(0, Math.min(sliderWidth, e.nativeEvent.locationX));
                const newHue = Math.round((x / sliderWidth) * 360);
                const newHex = hslToHex(newHue, 70, 55);
                setPrimaryColor(newHex);
              }}
              onResponderMove={(e) => {
                const x = Math.max(0, Math.min(sliderWidth, e.nativeEvent.locationX));
                const newHue = Math.round((x / sliderWidth) * 360);
                const newHex = hslToHex(newHue, 70, 55);
                setPrimaryColor(newHex);
              }}
            >
              {/* Rainbow Strip */}
              <View style={styles.gradientTrack} pointerEvents="none">
                {Array.from({ length: 36 }, (_, i) => {
                  const h = (i * 360) / 36;
                  return (
                    <View
                      key={i}
                      style={{
                        flex: 1,
                        height: 12,
                        backgroundColor: `hsl(${h}, 85%, 55%)`,
                      }}
                    />
                  );
                })}
              </View>
              
              {/* Thumb */}
              <View 
                pointerEvents="none"
                style={[
                  styles.sliderThumb, 
                  { 
                    left: Math.max(0, Math.min(sliderWidth - 24, (hexToHue(primaryColor) / 360) * sliderWidth - 12)),
                    borderColor: primaryColor 
                  }
                ]} 
              />
            </View>

            {/* Preview and HEX label */}
            <View style={styles.previewContainer}>
              <View style={[styles.previewColorCircle, { backgroundColor: primaryColor }]} />
              <CustomText style={[styles.previewText, { color: theme.text }]} variant="bold">
                {primaryColor.toUpperCase()}
              </CustomText>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 26,
    marginBottom: 20,
  },
  gamificationCard: {
    borderRadius: 28,
    padding: 22,
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  badgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  levelNumber: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  levelLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  progressSection: {
    flex: 1,
  },
  xpInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  xpScore: {
    fontSize: 14,
  },
  xpTarget: {
    fontSize: 11,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  levelUpText: {
    fontSize: 11,
  },
  profileCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 1.5,
  },
  sectionLabel: {
    fontSize: 14,
    marginBottom: 12,
    marginTop: 8,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 20,
    marginTop: 8,
  },
  largeAvatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  avatarActions: {
    flex: 1,
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  deleteActionBtn: {
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  displayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  displayName: {
    fontSize: 16,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  editBtnText: {
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1.5,
    fontFamily: 'Poppins_600SemiBold',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  saveBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  themeLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeLabel: {
    fontSize: 15,
  },
  colorPresetRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 4,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    marginTop: 8,
    width: '100%',
  },
  sliderTrackWrapper: {
    height: 32,
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  gradientTrack: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    width: '100%',
  },
  sliderThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    justifyContent: 'center',
  },
  previewColorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  previewText: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
