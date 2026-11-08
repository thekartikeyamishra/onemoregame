import type { CapacitorConfig } from "@capacitor/cli";

/**
 * ONE MORE for Android and iOS.
 * The apps open the live game (https://onemoregame.me) so scores stay server-verified and every web update reaches
 * app players instantly; native plugins add haptics, the share sheet, system bars, splash and the Android back
 * button. With no connection the app shows www/offline.html: a playable offline Practice mode.
 */
const config: CapacitorConfig = {
  appId: "com.kartikeyamishra.onemore",
  appName: "ONE MORE",
  webDir: "www",
  appendUserAgent: "OneMoreApp/1.0",
  backgroundColor: "#0a0f1f",
  server: {
    url: "https://onemoregame.me/play?source=app",
    errorPath: "offline.html",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: "never",
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: { launchShowDuration: 2500, launchAutoHide: true, backgroundColor: "#0a0f1f", showSpinner: false, androidScaleType: "CENTER_CROP" },
    StatusBar: { style: "DARK", backgroundColor: "#0a0f1f", overlaysWebView: false },
  },
};

export default config;
