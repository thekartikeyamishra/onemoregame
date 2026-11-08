/* Store-readiness settings applied to the generated native projects (safe to run repeatedly). */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const done = [];

// iOS: export-compliance answer (HTTPS only, no custom encryption) and the display name.
const plist = join(root, "ios/App/App/Info.plist");
if (existsSync(plist)) {
  let s = readFileSync(plist, "utf8");
  const set = (key, xml) => {
    if (s.includes(`<key>${key}</key>`)) s = s.replace(new RegExp(`<key>${key}</key>\\s*<[^>]+>(?:[^<]*</[^>]+>)?`), `<key>${key}</key>\n\t${xml}`);
    else s = s.replace(/<\/dict>\s*<\/plist>\s*$/, `\t<key>${key}</key>\n\t${xml}\n</dict>\n</plist>\n`);
  };
  set("ITSAppUsesNonExemptEncryption", "<false/>");
  set("CFBundleDisplayName", "<string>ONE MORE</string>");
  writeFileSync(plist, s);
  done.push("iOS Info.plist");
}

// Android: no cleartext traffic, nothing to back up (all data lives on the server).
const manifest = join(root, "android/app/src/main/AndroidManifest.xml");
if (existsSync(manifest)) {
  let s = readFileSync(manifest, "utf8");
  s = s.replace('android:allowBackup="true"', 'android:allowBackup="false"');
  if (!s.includes("usesCleartextTraffic")) s = s.replace("<application", '<application\n        android:usesCleartextTraffic="false"');
  writeFileSync(manifest, s);
  done.push("AndroidManifest.xml");
}
// Android: version code from the build (CI passes -PversionCode=N; each Play upload needs a higher number) and
// release signing from environment variables (Codemagic sets CM_KEYSTORE_*; locally Android Studio's
// "Generate Signed Bundle" works without them).
const gradle = join(root, "android/app/build.gradle");
if (existsSync(gradle)) {
  let s = readFileSync(gradle, "utf8");
  s = s.replace(/versionCode \d+/, 'versionCode((project.findProperty("versionCode") ?: "1") as Integer)');
  s = s.replace(/versionName "[^"]*"/, 'versionName((project.findProperty("versionName") ?: "1.0.0") as String)');
  if (!s.includes("signingConfigs")) {
    s = s.replace("    buildTypes {", `    signingConfigs {
        release {
            if (System.getenv("CM_KEYSTORE_PATH")) {
                storeFile file(System.getenv("CM_KEYSTORE_PATH"))
                storePassword System.getenv("CM_KEYSTORE_PASSWORD")
                keyAlias System.getenv("CM_KEY_ALIAS")
                keyPassword System.getenv("CM_KEY_PASSWORD")
            }
        }
    }
    buildTypes {`);
    s = s.replace("            minifyEnabled false", "            minifyEnabled false\n            if (System.getenv(\"CM_KEYSTORE_PATH\")) signingConfig signingConfigs.release");
  }
  writeFileSync(gradle, s);
  done.push("app/build.gradle");
}
console.log(done.length ? `✓ patched ${done.join(", ")}` : "No native projects yet: run npm run add:android / add:ios first.");
