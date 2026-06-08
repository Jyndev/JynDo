# JynDo 🚀 (To-Do App)

Aplicación móvil de gestión de tareas y productividad personal desarrollada con **React Native** y **Expo**. 

Esta aplicación está configurada específicamente para compilarse localmente en entornos **Arch Linux** de forma **100% nativa**, sin requerir la suite de Android Studio ni depender de servidores en la nube (EAS Cloud).

---

## 🎨 Especificaciones de Identidad Visual

* **Nombre de la App:** JynDo
* **Desarrollador:** JynDev
* **Estilo Visual:** Dark / Minimalista / Terminal de Comandos (`>_`)
* **Color Base Unificado (Hex):** `#0A0F1D` *(Sincronizado en el icono adaptativo y el fondo de la Splash Screen para garantizar transiciones fluidas en el arranque).*

---

## 🛠️ 1. Requisitos Previos del Sistema (Arch Linux)

Debido al ciclo de actualización *rolling release* de Arch Linux, las versiones de Java globales del sistema suelen ser incompatibles con el entorno nativo de Android (causando errores semánticos como *Unsupported class file major version*). Gradle requiere estrictamente **Java 17**.

Instala las herramientas base del sistema ejecutando:

```bash
sudo pacman -Syu git openjdk17-src base-devel wget unzip android-udev nodejs npm

```

> 💡 **Nota:** Asegúrate de que `android-udev` esté presente para habilitar la detección de dispositivos físicos por USB más adelante.

---

## 📦 2. Clonación del Repositorio

Descarga el código fuente directamente desde tu repositorio de GitHub e ingresa a la carpeta raíz de la aplicación:

```bash
git clone https://github.com/Jyndev/JynDo.git
cd jyndo

```

---

## 🤖 3. Preparación Local del SDK de Android

Para evitar conflictos de privilegios y tener el control total en tu espacio de usuario, instalaremos el SDK directamente en tu carpeta Home:

```bash
# 1. Crear la estructura de directorios necesaria para la indexación de Gradle
mkdir -p ~/Android/Sdk/cmdline-tools
cd ~/Android/Sdk/cmdline-tools

# 2. Descargar el paquete oficial de herramientas de comandos de Google
wget [https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip](https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip)

# 3. Descomprimir y renombrar la carpeta interna para compatibilidad de rutas
unzip commandlinetools-linux-*_latest.zip
rm commandlinetools-linux-*_latest.zip
mv cmdline-tools latest

# 4. Regresar a la carpeta raíz de tu proyecto
cd -

```

---

## ⚙️ 4. Configuración de Variables de Entorno

Debes indicarle a tu shell actual cómo enrutar las herramientas del SDK y forzar el uso de Java 17 en la terminal.

Abre el archivo de configuración de tu terminal (`nano ~/.bashrc` si usas Bash, o `nano ~/.zshrc` si usas Zsh) y agrega las siguientes líneas al final del archivo:

```bash
# Variables de entorno del SDK de Android
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator

# Forzar el entorno de compilación a Java 17
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
export PATH=$JAVA_HOME/bin:$PATH

```

Guarda los cambios (`Ctrl+O`, `Enter`, `Ctrl+X`) y recarga tu configuración de terminal:

```bash
source ~/.bashrc  # O source ~/.zshrc según corresponda

```

Acepta formalmente los términos de licenciamiento de Google antes de iniciar el prebuild:

```bash
sdkmanager --licenses

```

---

## 🔧 5. Archivo de Configuración Global (`app.json`)

Para evitar errores de recursos huérfanos con la Splash Screen limpia (`resource drawable/splashscreen_logo not found`), utiliza una imagen transparente de 1x1 píxeles guardada en `./assets/images/transparent.png` para silenciar el logo de Expo.

El archivo `app.json` en la raíz debe estructurarse exactamente así:

```json
{
  "expo": {
    "name": "JynDo",
    "slug": "jyndo",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "jyndo",
    "userInterfaceStyle": "dark",
    "ios": {
      "icon": "./assets/images/icon.png"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#0A0F1D",
        "foregroundImage": "./assets/images/icon.png"
      },
      "predictiveBackGestureEnabled": false,
      "package": "com.jyndev.jyndo"
    },
    "web": {
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#0A0F1D",
          "android": {
            "image": "./assets/images/transparent.png",
            "imageWidth": 10
          }
        }
      ],
      "expo-font",
      "expo-web-browser",
      "expo-sqlite"
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    },
    "extra": {
      "router": {},
      "eas": {
        "projectId": "175784cc-742a-4c88-a76e-a4af0edce87b"
      }
    }
  }
}

```

---

## 🔧 6. Preparación y Parches Críticos de Compilación

Sigue este flujo secuencial estricto cada vez que descargues el proyecto de cero, limpies el almacenamiento o agregues nuevas librerías nativas:

### Paso A: Instalar los paquetes de Node

> ⚠️ **Importante:** Asegúrate de que tu logotipo circular transparente en formato PNG de 1024x1024 px esté guardado como `icon.png` en `./assets/images/icon.png` antes de continuar.

```bash
npm install

```

### Paso B: Ejecutar el Prebuild de Expo

Este comando inyectará las configuraciones de tu `app.json` y generará la carpeta nativa `/android`:

```bash
npx expo prebuild --platform android

```

### Paso C: Aplicación de Parches de Bajo Nivel

Dado que el demonio de Gradle se ejecuta de forma aislada en segundo plano y puede perder el rastro de la terminal de Arch, debemos fijar las rutas de forma estática dentro del directorio nativo generado:

1. **Parche de Java:** Abre el archivo `android/gradle.properties` y añade al final de todo la siguiente línea:
```properties
org.gradle.java.home=/usr/lib/jvm/java-17-openjdk

```


2. **Parche de Rutas de Node:** Abre el archivo `android/settings.gradle` y reemplaza el bloque inicial completo de `pluginManagement` por el siguiente código (esto evita que Gradle falle al intentar resolver los plugins de Facebook y Expo de manera dinámica):
```groovy
pluginManagement {
  def reactNativeGradlePlugin = "${rootDir}/../node_modules/@react-native/gradle-plugin"
  includeBuild(reactNativeGradlePlugin)

  def expoPluginsPath = "${rootDir}/../node_modules/expo-modules-autolinking/android/expo-gradle-plugin"
  includeBuild(expoPluginsPath)
}

plugins {
  id("com.facebook.react.settings")
  id("expo-autolinking-settings")
}

```



---

## 🚀 7. Compilación Local del APK de Producción

Con los parches aplicados y las variables de entorno activas, limpia cualquier rastro residual e inicializa el empaquetador nativo de Gradle:

```bash
cd android
./gradlew --stop
./gradlew clean
./gradlew assembleRelease

```

Cuando el proceso de compilación termine con éxito (`BUILD SUCCESSFUL`), tu archivo binario APK optimizado para instalarse directamente en tu smartphone estará disponible en la ruta:

📁 **`android/app/build/outputs/apk/release/app-release.apk`**

---

Desarrollado por **JynDev**.
