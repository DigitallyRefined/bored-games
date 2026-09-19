// Static config for the Expo app. app.config.ts lets us apply
// `experiments.baseUrl` only for the web export (GitHub Pages), since setting
// it unconditionally collides with the native build when it matches the app
// name. Set EXPO_BASE_URL to a leading-slash path (e.g. "/bored-games") during
// `expo export` to host the site under a subpath.
const baseUrl = process.env.EXPO_BASE_URL?.trim();

const normalizedBaseUrl = baseUrl
  ? `/${baseUrl.replace(/^\/+/, "").replace(/\/+$/, "")}`
  : undefined;

export default {
  name: "Bored Games",
  slug: "bored-games",
  version: "0.0.1",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "boredgames",
  userInterfaceStyle: "automatic",
  ios: {
    icon: "./assets/images/icon.png",
  },
  android: {
    package: "com.github.digitallyrefined.boredgames",
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: "#F0D9B5",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#8A5A2B",
        image: "./assets/images/splash-icon.png",
        imageWidth: 76,
      },
    ],
    "expo-font",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
    ...(normalizedBaseUrl ? { baseUrl: normalizedBaseUrl } : {}),
  },
};
