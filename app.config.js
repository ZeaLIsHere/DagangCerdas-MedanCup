module.exports = {
  expo: {
    name: "DagangCerdas",
    slug: "DagangCerdas",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "dagangcerdas",
    userInterfaceStyle: "light",
    android: {
      adaptiveIcon: {
        backgroundColor: "#2196F3",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      package: "com.dagangcerdas.app",
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
      ],
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#2196F3"
        }
      ],
      "expo-sqlite",
      "expo-secure-store",
      "expo-updates",
      [
        "expo-camera",
        {
          "cameraPermission": "DagangCerdas memerlukan akses kamera untuk memindai barcode produk."
        }
      ],
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "DagangCerdas memerlukan lokasi untuk fitur Belanja Kolektif."
        }
      ],
      "@react-native-community/datetimepicker"
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      groqApiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY,
      router: {},
      eas: {
        projectId: "69253383-e417-460b-b668-ad0458d21571"
      }
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    updates: {
      url: "https://u.expo.dev/69253383-e417-460b-b668-ad0458d21571"
    },
    ios: {},
  },
};
