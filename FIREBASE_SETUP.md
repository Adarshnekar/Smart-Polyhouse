# Firebase Integration — Grow Guardian

## Database Structure

```
smart-polyhouse-694e6 (root)
├── sensors/
│   ├── temperature     ← number  (°C)    written by hardware
│   ├── humidity        ← number  (%)     written by hardware
│   ├── lux             ← number  (lux)   written by hardware
│   └── hoursLit        ← number  (hours) written by hardware
└── controls/
    ├── mode            ← "Auto" | "Manual"   written by dashboard
    ├── ledOn           ← boolean             written by dashboard
    ├── ledIntensity    ← number (0–100)       written by dashboard
    └── mistOn          ← boolean             written by dashboard
```

## Step 1 — Seed initial data

Run once before opening the dashboard:

```bash
node scripts/seed-firebase.mjs
```

## Step 2 — Set database rules

In Firebase Console → Realtime Database → Rules, paste:

```json
{
  "rules": {
    "sensors": {
      ".read":  true,
      ".write": true
    },
    "controls": {
      ".read":  true,
      ".write": true
    }
  }
}
```

## Step 3 — Hardware (ESP32 / Arduino) code pattern

Your microcontroller should:
- **WRITE** sensor values to `sensors/` every few seconds
- **READ** control values from `controls/` to operate relays

### Arduino/ESP32 Firebase write example (using FirebaseESP32 library)

```cpp
#include <FirebaseESP32.h>

#define FIREBASE_HOST "smart-polyhouse-694e6-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_AUTH "YOUR_DATABASE_SECRET"  // From Firebase console → Project Settings → Service accounts

FirebaseData fbdo;

void loop() {
  float temp     = readDHT22_Temp();
  float humidity = readDHT22_Hum();
  int   lux      = readBH1750();

  // Write sensors
  Firebase.setFloat(fbdo,  "/sensors/temperature", temp);
  Firebase.setFloat(fbdo,  "/sensors/humidity",    humidity);
  Firebase.setInt(fbdo,    "/sensors/lux",         lux);

  // Read controls
  Firebase.getString(fbdo, "/controls/mode");
  String mode = fbdo.stringData();          // "Auto" or "Manual"

  Firebase.getBool(fbdo, "/controls/ledOn");
  bool ledOn = fbdo.boolData();

  Firebase.getInt(fbdo, "/controls/ledIntensity");
  int intensity = fbdo.intData();           // 0–100

  Firebase.getBool(fbdo, "/controls/mistOn");
  bool mistOn = fbdo.boolData();

  // Act on controls
  analogWrite(LED_PIN,  ledOn ? map(intensity, 0, 100, 0, 255) : 0);
  digitalWrite(MIST_PIN, mistOn ? HIGH : LOW);

  delay(2000);
}
```

## Data Flow

```
Hardware sensors
    ↓  (write every 2s)
Firebase Realtime DB
    ↓  (onValue listener ~1s)
Dashboard UI  ←→  Manual controls
    ↓  (set() write)
Firebase Realtime DB
    ↓  (hardware reads)
LED / Mist relay actuators
```
