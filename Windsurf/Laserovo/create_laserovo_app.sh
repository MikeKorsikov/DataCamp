#!/bin/bash

# Create the application bundle
APP_NAME="Laserovo.app"
APP_PATH="$HOME/Desktop/$APP_NAME"

# Remove existing app if it exists
rm -rf "$APP_PATH" 2>/dev/null

# Create app bundle structure
mkdir -p "$APP_PATH/Contents/MacOS"
mkdir -p "$APP_PATH/Contents/Resources"

# Create the main executable
echo '#!/bin/bash
osascript "$(dirname "$0")/../Resources/LaserovoLauncher.applescript"
' > "$APP_PATH/Contents/MacOS/Laserovo"

# Make the executable... executable
chmod +x "$APP_PATH/Contents/MacOS/Laserovo"

# Copy the AppleScript
cp LaserovoLauncher.applescript "$APP_PATH/Contents/Resources/"

# Create Info.plist
cat > "$APP_PATH/Contents/Info.plist" <<EOL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>Laserovo</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.laserovo.app</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>Laserovo</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
    <key>LSUIElement</key>
    <true/>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOL

# Make the script executable
chmod +x "$0"

echo "Created $APP_PATH on your desktop"
echo "Double-click the Laserovo app to start the application"
