const fs = require('fs');
const path = require('path');

const wwwDir = path.join(__dirname, 'www');

// Clean & recreate www
if (fs.existsSync(wwwDir)) {
  fs.rmSync(wwwDir, { recursive: true, force: true });
}
fs.mkdirSync(wwwDir, { recursive: true });

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(item => {
      copyRecursive(path.join(src, item), path.join(dest, item));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

const itemsToCopy = ['index.html', 'manifest.json', 'sw.js', 'favicon.png', 'assets', 'css', 'js', 'audio'];

// Copy essential web assets to www
itemsToCopy.forEach(item => {
  const src = path.join(__dirname, item);
  const dest = path.join(wwwDir, item);
  if (fs.existsSync(src)) {
    copyRecursive(src, dest);
  }
});

console.log('✓ www directory successfully prepared for Android APK packaging!');

// CRITICAL: Also copy directly into android/app/src/main/assets/public so Gradle assembleDebug bundles newest assets!
const androidPublicDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'assets', 'public');
if (fs.existsSync(androidPublicDir)) {
  itemsToCopy.forEach(item => {
    const src = path.join(__dirname, item);
    const dest = path.join(androidPublicDir, item);
    if (fs.existsSync(src)) {
      copyRecursive(src, dest);
    }
  });
  console.log('✓ android/app/src/main/assets/public successfully synchronized with root web assets!');
}
