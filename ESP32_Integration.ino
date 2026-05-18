#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

// Provide the token generation process info.
#include "addons/TokenHelper.h"
// Provide the RTDB payload printing info and other helper functions.
#include "addons/RTDBHelper.h"

// ================= WIFI =================
#define WIFI_SSID "OnePlus Nord 5"
#define WIFI_PASSWORD "shikajm.r9776"

// ================= FIREBASE =================
#define DATABASE_URL "smart-polyhouse-694e6-default-rtdb.asia-southeast1.firebasedatabase.app"
#define DATABASE_SECRET "AIzaSyDzx8zIWzrieXpotXrD9SFAYboPYuhjJFU"

// ================= OLED =================
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ================= DHT =================
#define DHTTYPE DHT11

#define DHT1_PIN 26
#define DHT2_PIN 33

DHT dht1(DHT1_PIN, DHTTYPE);
DHT dht2(DHT2_PIN, DHTTYPE);

// ================= ANALOG LDR =================
#define LDR1_PIN 27
#define LDR2_PIN 25

// ================= SOIL =================
#define SOIL1_PIN 14
#define SOIL2_PIN 32

// ================= MQ2 =================
#define MQ2_PIN 34

// ================= LED PINS =================
#define LED1_PIN 2
#define LED2_PIN 4
#define LED3_PIN 18
#define LED4_PIN 19

// ================= FIREBASE OBJECTS =================
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ================= VARIABLES =================
unsigned long lastLitTime = 0;
float hoursLit = 0.0;

// PWM Channels
#define CH1 0
#define CH2 1
#define CH3 2
#define CH4 3

void setup() {

  Serial.begin(115200);

  // ================= ADC =================
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // ================= DHT =================
  dht1.begin();
  dht2.begin();

  // ================= OLED =================
  Wire.begin(21, 22);

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED Failed");
    while (1);
  }

  display.clearDisplay();
  display.display();

  // ================= PWM SETUP =================
  ledcAttach(LED1_PIN, 5000, 8);
  ledcAttach(LED2_PIN, 5000, 8);
  ledcAttach(LED3_PIN, 5000, 8);
  ledcAttach(LED4_PIN, 5000, 8);

  // ================= WIFI =================
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }

  Serial.println();
  Serial.println("WiFi Connected");

  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // ================= FIREBASE =================
  config.database_url = DATABASE_URL;
  config.signer.tokens.legacy_token = DATABASE_SECRET;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("Firebase Connected");

  lastLitTime = millis();
}

void loop() {

  // ================= DHT =================
  float temp1 = dht1.readTemperature();
  float hum1  = dht1.readHumidity();

  float temp2 = dht2.readTemperature();
  float hum2  = dht2.readHumidity();

  float avgTemp = (temp1 + temp2) / 2.0;
  float avgHum  = (hum1 + hum2) / 2.0;

  // ================= ANALOG LDR =================
  int ldr1 = analogRead(LDR1_PIN);
  int ldr2 = analogRead(LDR2_PIN);

  int avgLight = (ldr1 + ldr2) / 2;

  // ================= FIREBASE READ (FROM FRONTEND) =================
  String mode = "Auto";
  if (Firebase.RTDB.getString(&fbdo, "controls/mode")) {
    mode = fbdo.stringData();
  }

  int brightness = 0;

  if (mode == "Manual") {
    // Check if the user turned the LED ON from the dashboard
    bool ledOn = false;
    if (Firebase.RTDB.getBool(&fbdo, "controls/ledOn")) {
      ledOn = fbdo.boolData();
    }
    
    // Check the intensity slider from the dashboard (0 - 100)
    int ledIntensity = 100;
    if (Firebase.RTDB.getInt(&fbdo, "controls/ledIntensity")) {
      ledIntensity = fbdo.intData(); 
    }
    
    if (ledOn) {
      // Convert 0-100% to 0-255 PWM
      brightness = map(ledIntensity, 0, 100, 0, 255);
    } else {
      brightness = 0; // Turn off completely
    }
  } else {
    // AUTO MODE: Convert light value to PWM brightness
    // Bright sunlight -> dim LEDs; Low sunlight -> bright LEDs
    brightness = map(avgLight, 0, 4095, 255, 0);
  }

  brightness = constrain(brightness, 0, 255);

  // Apply PWM to all LEDs
  ledcWrite(LED1_PIN, brightness);
  ledcWrite(LED2_PIN, brightness);
  ledcWrite(LED3_PIN, brightness);
  ledcWrite(LED4_PIN, brightness);

  // Estimate Lux
  int lux = map(avgLight, 0, 4095, 0, 50000);

  // Track lighting hours
  if (brightness > 50) {
    hoursLit += (millis() - lastLitTime) / 3600000.0;
  }

  lastLitTime = millis();

  // ================= SOIL =================
  int soil1 = analogRead(SOIL1_PIN);
  int soil2 = analogRead(SOIL2_PIN);

  int avgSoilRaw = (soil1 + soil2) / 2;
  int soilMoisturePct = map(avgSoilRaw, 4095, 1500, 0, 100);
  soilMoisturePct = constrain(soilMoisturePct, 0, 100);

  // ================= AUTOMATIC MIST CONTROL =================
  bool mistOn = false;
  
  if (mode == "Manual") {
    if (Firebase.RTDB.getBool(&fbdo, "controls/mistOn")) {
      mistOn = fbdo.boolData();
    }
  } else {
    if(avgHum < 60) {
      mistOn = true;
    }
  }

  // ================= MQ2 =================
  int mq2 = analogRead(MQ2_PIN);

  // ================= OLED =================
  display.clearDisplay();

  display.setTextSize(1);
  display.setTextColor(WHITE);

  display.setCursor(0, 0);
  display.print("T:"); display.print(avgTemp);

  display.setCursor(64, 0);
  display.print("H:"); display.print(avgHum);

  display.setCursor(0, 10);
  display.print("L1:"); display.print(ldr1);

  display.setCursor(64, 10);
  display.print("L2:"); display.print(ldr2);

  display.setCursor(0, 20);
  display.print("PWM:"); display.print(brightness);

  display.setCursor(0, 30);
  display.print("S1:"); display.print(soil1);

  display.setCursor(64, 30);
  display.print("S2:"); display.print(soil2);

  display.setCursor(0, 40);
  display.print("MQ2:"); display.print(mq2);

  display.display();

  // ================= FIREBASE SEND (TO FRONTEND) =================
  Firebase.RTDB.setFloat(&fbdo, "sensors/temperature", avgTemp);
  Firebase.RTDB.setFloat(&fbdo, "sensors/humidity", avgHum);
  Firebase.RTDB.setInt(&fbdo, "sensors/lux", lux);
  Firebase.RTDB.setInt(&fbdo, "sensors/lightRaw", avgLight);
  Firebase.RTDB.setInt(&fbdo, "sensors/ledBrightness", brightness);
  Firebase.RTDB.setFloat(&fbdo, "sensors/hoursLit", hoursLit);
  Firebase.RTDB.setInt(&fbdo, "sensors/soilMoisture", soilMoisturePct);
  Firebase.RTDB.setInt(&fbdo, "sensors/soil1", soil1);
  Firebase.RTDB.setInt(&fbdo, "sensors/soil2", soil2);
  Firebase.RTDB.setInt(&fbdo, "sensors/mq2", mq2);
  Firebase.RTDB.setBool(&fbdo, "actuators/mist", mistOn);

  Serial.println("Data Sent");

  delay(2000);
}
