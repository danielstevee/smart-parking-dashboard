#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <functional>
#include <LiquidCrystal_I2C.h>
#include <MFRC522.h>
#include <ESP32Servo.h>

namespace Config {
  constexpr uint8_t NUM_SLOTS = 3;

  constexpr uint8_t TRIG[NUM_SLOTS] = {32, 33, 25};
  constexpr uint8_t ECHO[NUM_SLOTS] = {34, 35, 26};
  constexpr uint8_t LED [NUM_SLOTS] = {13, 14, 27};

  constexpr uint8_t PIR        = 4;
  constexpr uint8_t SERVO      = 17;
  constexpr uint8_t I2C_SDA    = 21;
  constexpr uint8_t I2C_SCL    = 22;
  constexpr uint8_t LCD_ADDR   = 0x27;

  constexpr uint8_t RFID_SS    = 5;
  constexpr uint8_t RFID_RST   = 16;
  constexpr uint8_t RFID_SCK   = 18;
  constexpr uint8_t RFID_MISO  = 19;
  constexpr uint8_t RFID_MOSI  = 23;

  // Sensor jarak
  constexpr float    OCC_ENTER_CM     = 10.0f;  // < 10 cm  => terisi
  constexpr float    OCC_EXIT_CM      = 14.0f;  // > 14 cm  => kosong (hysteresis)
  constexpr uint8_t  CONFIRM_SAMPLES  = 3;
  constexpr uint32_t SENSOR_PERIOD_MS = 70;
  constexpr uint32_t ECHO_TIMEOUT_US  = 25000;
  constexpr float    FAR_CM           = 400.0f;
  constexpr bool     LED_ON_WHEN_FREE = true;

  // Palang
  constexpr uint32_t CARD_WAIT_MS     = 10000;
  constexpr uint32_t GATE_MIN_OPEN_MS = 4000;
  constexpr uint32_t GATE_MAX_OPEN_MS = 15000;
  constexpr uint32_t MSG_MS           = 2000;
  constexpr uint32_t COOLDOWN_MS      = 2500;
  constexpr int      SERVO_CLOSED_DEG = 0;
  constexpr int      SERVO_OPEN_DEG   = 90;

  // ---------- WiFi ----------
  // constexpr const char* WIFI_SSID     = "Infinix Hot 40 Pro";
  constexpr const char* WIFI_SSID     = "ss";
  // constexpr const char* WIFI_PASS     = "pandu456";
  constexpr const char* WIFI_PASS     = "11110000";
  constexpr uint32_t    WIFI_RETRY_MS = 10000;

  // ---------- MQTT ----------
  // PENTING: bukan "localhost". Isi dengan IP LAN PC yang menjalankan Mosquitto
  // (cek dengan `ipconfig` / `ip a`).
  constexpr const char* MQTT_HOST      = "192.168.1.10";
  constexpr uint16_t    MQTT_PORT      = 1883;               // TCP, bukan 9001 (itu WebSocket)
  constexpr const char* MQTT_CLIENT_ID = "esp32-smart-parking";
  constexpr uint32_t    MQTT_RETRY_MS  = 5000;
  constexpr uint32_t    HEARTBEAT_MS   = 10000;

  constexpr const char* TOPIC_SLOT_STATUS = "parking/slot/status";   // dibaca dashboard
  constexpr const char* TOPIC_GATE_EVENT  = "parking/gate/event";
  constexpr const char* TOPIC_SYS_STATUS  = "parking/system/status"; // LWT

  // UID yang diizinkan
  const char* const UIDS[] = {
    "C7:A8:B0:9E",            // Blue Card
    "11:22:33:44",            // Green Card
    "55:66:77:88",            // Yellow Card
    "AA:BB:CC:DD",            // Red Card
    "7A:BC:CB:83",            // NFC Tag
    "C0:FF:EE:99"             // Key Fob
  };
  constexpr size_t NUM_UIDS = sizeof(UIDS) / sizeof(UIDS[0]);
}

// =====================================================
// UltrasonicSensor: satu HC-SR04
// =====================================================
class UltrasonicSensor {
public:
  UltrasonicSensor(uint8_t trig, uint8_t echo) : trig_(trig), echo_(echo) {}

  void begin() {
    pinMode(trig_, OUTPUT);
    digitalWrite(trig_, LOW);
    pinMode(echo_, INPUT);
  }

  // Jarak (cm). Tanpa echo => FAR_CM (dianggap tidak ada objek dekat).
  float readCm() const {
    digitalWrite(trig_, LOW);  delayMicroseconds(2);
    digitalWrite(trig_, HIGH); delayMicroseconds(10);
    digitalWrite(trig_, LOW);
    uint32_t us = pulseIn(echo_, HIGH, Config::ECHO_TIMEOUT_US);
    if (us == 0) return Config::FAR_CM;
    return us * 0.0343f / 2.0f;
  }

private:
  uint8_t trig_, echo_;
};

// =====================================================
// Led
// =====================================================
class Led {
public:
  explicit Led(uint8_t pin) : pin_(pin) {}
  void begin()       { pinMode(pin_, OUTPUT); set(false); }
  void set(bool on)  { digitalWrite(pin_, on ? HIGH : LOW); }
private:
  uint8_t pin_;
};

// =====================================================
// ParkingSlot: sensor + LED + status (hysteresis + konfirmasi)
// =====================================================
class ParkingSlot {
public:
  ParkingSlot(uint8_t trig, uint8_t echo, uint8_t led)
    : sensor_(trig, echo), led_(led) {}

  void begin() {
    sensor_.begin();
    led_.begin();
    refreshLed();
  }

  void update(uint8_t id) {
    float cm = sensor_.readCm();
    cm_ = cm;   // disimpan untuk telemetri

    bool wanted = occupied_ ? (cm <= Config::OCC_EXIT_CM)
                            : (cm <  Config::OCC_ENTER_CM);

    if (wanted == occupied_) { streak_ = 0; return; }

    if (++streak_ >= Config::CONFIRM_SAMPLES) {
      occupied_ = wanted;
      streak_ = 0;
      refreshLed();
      Serial.printf("[SLOT %u] %s (%.1f cm)\n", id + 1,
                    occupied_ ? "TERISI" : "KOSONG", cm);
    }
  }

  bool  occupied() const { return occupied_; }
  float distance() const { return cm_; }

private:
  void refreshLed() { led_.set(Config::LED_ON_WHEN_FREE ? !occupied_ : occupied_); }

  UltrasonicSensor sensor_;
  Led              led_;
  bool             occupied_ = false;
  uint8_t          streak_   = 0;
  float            cm_       = -1.0f;
};

// =====================================================
// ParkingLot: kumpulan slot
// =====================================================
class ParkingLot {
public:
  void begin() { for (auto& s : slots_) s.begin(); }

  void update() {
    uint32_t now = millis();
    if (now - lastTick_ < Config::SENSOR_PERIOD_MS) return;
    lastTick_ = now;

    slots_[next_].update(next_);
    next_ = (next_ + 1) % Config::NUM_SLOTS;
  }

  uint8_t freeCount() const {
    uint8_t n = 0;
    for (const auto& s : slots_) if (!s.occupied()) n++;
    return n;
  }

  uint8_t size() const { return Config::NUM_SLOTS; }

  const ParkingSlot& slot(uint8_t i) const { return slots_[i]; }

  // Bit i = 1 jika slot i terisi. Dipakai untuk mendeteksi perubahan status.
  uint8_t occupiedMask() const {
    uint8_t m = 0;
    for (uint8_t i = 0; i < Config::NUM_SLOTS; i++)
      if (slots_[i].occupied()) m |= (1u << i);
    return m;
  }

  String summary() const {
    String out;
    for (uint8_t i = 0; i < Config::NUM_SLOTS; i++) {
      if (i) out += ' ';
      out += String(i + 1) + ":" + (slots_[i].occupied() ? "X" : "-");
    }
    return out;
  }

private:
  ParkingSlot slots_[Config::NUM_SLOTS] = {
    {Config::TRIG[0], Config::ECHO[0], Config::LED[0]},
    {Config::TRIG[1], Config::ECHO[1], Config::LED[1]},
    {Config::TRIG[2], Config::ECHO[2], Config::LED[2]},
  };
  uint8_t  next_     = 0;
  uint32_t lastTick_ = 0;
};

// =====================================================
// MotionSensor: PIR
// =====================================================
class MotionSensor {
public:
  explicit MotionSensor(uint8_t pin) : pin_(pin) {}
  void begin()          { pinMode(pin_, INPUT); }
  bool detected() const { return digitalRead(pin_) == HIGH; }
private:
  uint8_t pin_;
};

// =====================================================
// Display: LCD I2C dengan cache + pesan sementara
// LCD yang tidak terdeteksi dilewati, program tetap jalan.
// =====================================================
class Display {
public:
  explicit Display(uint8_t addr) : lcd_(addr, 16, 2) {}

  void begin() {
    Wire.begin(Config::I2C_SDA, Config::I2C_SCL);
    Wire.setTimeOut(100);                       // jangan menggantung jika bus bermasalah

    // Cek apakah LCD menjawab di alamatnya
    Wire.beginTransmission(Config::LCD_ADDR);
    lcdOk_ = (Wire.endTransmission() == 0);
    if (!lcdOk_) {
      Serial.printf("[LCD] Tidak merespons di 0x%02X. LCD dilewati (cek SDA21/SCL22, VCC, GND, alamat).\n",
                    Config::LCD_ADDR);
      return;
    }

    lcd_.init();
    lcd_.backlight();
    writeRow(0, "Smart Parking");
    writeRow(1, "Inisialisasi...");
  }

  void showMessage(const String& l0, const String& l1, uint32_t ms = Config::MSG_MS) {
    msg_[0] = l0; msg_[1] = l1;
    until_  = millis() + ms;
    hasMsg_ = true;
  }

  void clearMessage() { hasMsg_ = false; }

  void render(const ParkingLot& lot) {
    if (hasMsg_ && (int32_t)(millis() - until_) < 0) {
      writeRow(0, msg_[0]);
      writeRow(1, msg_[1]);
      return;
    }
    hasMsg_ = false;
    writeRow(0, "Kosong: " + String(lot.freeCount()) + "/" + String(lot.size()));
    writeRow(1, lot.summary());
  }

private:
  void writeRow(uint8_t row, String text) {
    if (!lcdOk_) return;
    while (text.length() < 16) text += ' ';
    text = text.substring(0, 16);
    if (text == cache_[row]) return;
    lcd_.setCursor(0, row);
    lcd_.print(text);
    cache_[row] = text;
  }

  LiquidCrystal_I2C lcd_;
  String   cache_[2];
  String   msg_[2];
  uint32_t until_  = 0;
  bool     hasMsg_ = false;
  bool     lcdOk_  = false;
};

// =====================================================
// CardReader: RC522 + whitelist + fallback Serial
// =====================================================
class CardReader {
public:
  CardReader() : rfid_(Config::RFID_SS, Config::RFID_RST) {}

  void begin() {
    SPI.begin(Config::RFID_SCK, Config::RFID_MISO, Config::RFID_MOSI, Config::RFID_SS);
    Serial.println("[RFID B] SPI berhasil");
    Serial.println("[RFID C] Memulai PCD_Init");
    rfid_.PCD_Init();
    Serial.println("[RFID D] PCD_Init berhasil");
    delay(50);
    byte v = rfid_.PCD_ReadRegister(MFRC522::VersionReg);
    Serial.printf(
        "[RFID F] VersionReg: 0x%02X\n", v
    );
  }

  bool read(String& uid) { return readCard(uid) || readSerial(uid); }

  bool isAuthorized(const String& uid) const {
    for (size_t i = 0; i < Config::NUM_UIDS; i++)
      if (uid.equalsIgnoreCase(Config::UIDS[i])) return true;
    return false;
  }

private:
  bool readCard(String& uid) {
    if (!rfid_.PICC_IsNewCardPresent() || !rfid_.PICC_ReadCardSerial()) return false;
    uid = "";
    for (byte i = 0; i < rfid_.uid.size; i++) {
      if (i) uid += ':';
      if (rfid_.uid.uidByte[i] < 0x10) uid += '0';
      uid += String(rfid_.uid.uidByte[i], HEX);
    }
    uid.toUpperCase();
    rfid_.PICC_HaltA();
    rfid_.PCD_StopCrypto1();
    return true;
  }

  bool readSerial(String& uid) {
    while (Serial.available() > 0) {
      char c = Serial.read();
      if (c == 'c' || c == 'C') { uid = Config::UIDS[0]; return true; }
      if (c == 'x' || c == 'X') { uid = "00:00:00:00";   return true; }
    }
    return false;
  }

  MFRC522 rfid_;
};

// =====================================================
// WifiManager: koneksi WiFi
// =====================================================
class WifiManager {
public:
  // Gaya sederhana: blocking sampai tersambung (dipanggil sekali di setup)
  void connectWiFi() {
    Serial.print("Menyambung WiFi");
    WiFi.mode(WIFI_STA);
    WiFi.begin(Config::WIFI_SSID, Config::WIFI_PASS);
    while (WiFi.status() != WL_CONNECTED) {
      delay(300);
      Serial.print(".");
    }
    Serial.println(" tersambung!");
    Serial.printf("[WIFI] IP: %s RSSI: %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
    wasUp_ = true;
  }

  // Di loop(): hanya menyambung ulang jika terputus (tidak memblokir)
  void update() {
    if (connected()) { wasUp_ = true; return; }
    if (wasUp_) { wasUp_ = false; Serial.println("[WIFI] Terputus."); }
    if (millis() - lastTry_ >= Config::WIFI_RETRY_MS) {
      lastTry_ = millis();
      Serial.println("[WIFI] Menyambung ulang...");
      WiFi.reconnect();
    }
  }

  bool connected() const { return WiFi.status() == WL_CONNECTED; }

private:
  uint32_t lastTry_ = 0;
  bool     wasUp_   = false;
};

// =====================================================
// MqttLink: koneksi broker non-blocking + LWT
// =====================================================
class MqttLink {
public:
  explicit MqttLink(WifiManager& wifi) : wifi_(wifi), client_(net_) {}

  void begin() {
    client_.setServer(Config::MQTT_HOST, Config::MQTT_PORT);
    client_.setBufferSize(512);     // default 256 B terlalu kecil untuk JSON status
    client_.setKeepAlive(15);
    client_.setSocketTimeout(2);    // batasi blocking saat broker tidak terjangkau
    net_.setTimeout(2);
  }

  void update() {
    if (!wifi_.connected()) return;

    if (!client_.connected()) {
      if (first_ || millis() - lastTry_ >= Config::MQTT_RETRY_MS) connect();
      return;
    }
    client_.loop();
  }

  bool connected() { return client_.connected(); }

  bool publish(const char* topic, const char* payload, bool retained = false) {
    return client_.connected() && client_.publish(topic, payload, retained);
  }

private:
  void connect() {
    first_   = false;
    lastTry_ = millis();
    Serial.printf("[MQTT] Menyambung ke %s:%u ...\n", Config::MQTT_HOST, Config::MQTT_PORT);

    // LWT: broker mempublish "offline" (retained) jika ESP32 putus tiba-tiba
    bool ok = client_.connect(Config::MQTT_CLIENT_ID, nullptr, nullptr,
                              Config::TOPIC_SYS_STATUS, 1, true, "offline");
    if (ok) {
      Serial.println("[MQTT] Tersambung.");
      client_.publish(Config::TOPIC_SYS_STATUS, "online", true);
    } else {
      Serial.printf("[MQTT] Gagal, rc=%d (lihat tabel PubSubClient state)\n", client_.state());
    }
  }

  WifiManager& wifi_;
  WiFiClient   net_;
  PubSubClient client_;
  uint32_t     lastTry_ = 0;
  bool         first_   = true;
};

// =====================================================
// Telemetry: publish status slot + event palang
// =====================================================
class Telemetry {
public:
  Telemetry(MqttLink& mqtt, const ParkingLot& lot) : mqtt_(mqtt), lot_(lot) {}

  // Publish saat slot berubah, atau heartbeat berkala, atau saat baru tersambung
  void update() {
    if (!mqtt_.connected()) { force_ = true; return; }

    const uint32_t now  = millis();
    const uint8_t  mask = lot_.occupiedMask();

    if (force_ || mask != lastMask_ || now - lastPub_ >= Config::HEARTBEAT_MS) {
      if (publishStatus()) {
        lastMask_ = mask;
        lastPub_  = now;
        force_    = false;
      }
    }
  }

  void publishEvent(const char* event, const String& uid) {
    char buf[160];
    snprintf(buf, sizeof(buf),
             "{\"event\":\"%s\",\"uid\":\"%s\",\"free\":%u,\"uptime\":%lu}",
             event, uid.c_str(), lot_.freeCount(), millis() / 1000UL);
    mqtt_.publish(Config::TOPIC_GATE_EVENT, buf, false);
  }

private:
  bool publishStatus() {
    char buf[384];
    const uint8_t total  = lot_.size();
    const uint8_t free_  = lot_.freeCount();

    size_t n = snprintf(buf, sizeof(buf),
                        "{\"total\":%u,\"filled\":%u,\"empty\":%u,\"uptime\":%lu,\"rssi\":%d,\"slots\":[",
                        total, (uint8_t)(total - free_), free_, millis() / 1000UL, WiFi.RSSI());

    for (uint8_t i = 0; i < total && n < sizeof(buf); i++) {
      const ParkingSlot& s = lot_.slot(i);
      n += snprintf(buf + n, sizeof(buf) - n,
                    "%s{\"id\":%u,\"occupied\":%s,\"distance\":%.1f}",
                    i ? "," : "", i + 1, s.occupied() ? "true" : "false", s.distance());
    }
    if (n < sizeof(buf)) snprintf(buf + n, sizeof(buf) - n, "]}");

    bool ok = mqtt_.publish(Config::TOPIC_SLOT_STATUS, buf, true);   // retained
    if (ok) Serial.printf("[MQTT] -> %s %s\n", Config::TOPIC_SLOT_STATUS, buf);
    return ok;
  }

  MqttLink&         mqtt_;
  const ParkingLot& lot_;
  uint8_t  lastMask_ = 0xFF;   // nilai tidak valid agar publish pertama selalu terjadi
  uint32_t lastPub_  = 0;
  bool     force_    = true;
};

// =====================================================
// Gate: servo + state machine
// =====================================================
class Gate {
public:
  using EventHandler = std::function<void(const char*, const String&)>;

  Gate(MotionSensor& pir, CardReader& reader, ParkingLot& lot, Display& display)
    : pir_(pir), reader_(reader), lot_(lot), display_(display) {}

  void setEventHandler(EventHandler h) { onEvent_ = h; }

  void begin() {
    servo_.setPeriodHertz(50);
    servo_.attach(Config::SERVO, 500, 2400);
    servo_.write(Config::SERVO_CLOSED_DEG);
  }

  void update() {
    const uint32_t now = millis();

    switch (state_) {
      case State::IDLE:
        if (pir_.detected() && (int32_t)(now - cooldownUntil_) >= 0) {
          state_ = State::WAIT_CARD;
          since_ = now;
          display_.showMessage("Silakan Tap", "Kartu RFID", Config::CARD_WAIT_MS);
          Serial.println("[GATE] PIR aktif, menunggu kartu...");
          emit("waiting_card");
        }
        break;

      case State::WAIT_CARD: {
        String uid;
        if (reader_.read(uid)) {
          handleCard(uid, now);
        } else if (now - since_ >= Config::CARD_WAIT_MS) {
          reject("Waktu habis", "Coba lagi", "timeout", "", now);
        }
        break;
      }

      case State::OPEN: {
        const uint32_t openMs = now - since_;
        const bool minPassed  = openMs >= Config::GATE_MIN_OPEN_MS;
        const bool maxPassed  = openMs >= Config::GATE_MAX_OPEN_MS;
        if ((minPassed && !pir_.detected()) || maxPassed) close(now);
        break;
      }
    }
  }

private:
  enum class State { IDLE, WAIT_CARD, OPEN };

  void emit(const char* event, const String& uid = "") {
    if (onEvent_) onEvent_(event, uid);
  }

  void handleCard(const String& uid, uint32_t now) {
    Serial.printf("[RFID] UID: %s\n", uid.c_str());

    if (!reader_.isAuthorized(uid))  reject("Akses ditolak", "Kartu invalid", "access_denied", uid, now);
    else if (lot_.freeCount() == 0)  reject("PARKIR PENUH", "Mohon menunggu", "lot_full", uid, now);
    else                             open(uid, now);
  }

  void open(const String& uid, uint32_t now) {
    servo_.write(Config::SERVO_OPEN_DEG);
    state_ = State::OPEN;
    since_ = now;
    display_.showMessage("Akses diterima",
                         "Sisa: " + String(lot_.freeCount()) + " slot",
                         Config::GATE_MAX_OPEN_MS);
    Serial.println("[GATE] Akses diterima, palang dibuka.");
    emit("access_granted", uid);
  }

  void close(uint32_t now) {
    servo_.write(Config::SERVO_CLOSED_DEG);
    display_.clearMessage();
    startCooldown(now);
    Serial.println("[GATE] Palang ditutup.");
    emit("gate_closed");
  }

  void reject(const char* l0, const char* l1, const char* event,
              const String& uid, uint32_t now) {
    display_.showMessage(l0, l1);
    startCooldown(now);
    Serial.printf("[GATE] %s: %s\n", l0, l1);
    emit(event, uid);
  }

  void startCooldown(uint32_t now) {
    state_ = State::IDLE;
    cooldownUntil_ = now + Config::COOLDOWN_MS;
  }

  MotionSensor& pir_;
  CardReader&   reader_;
  ParkingLot&   lot_;
  Display&      display_;
  Servo         servo_;
  EventHandler  onEvent_;

  State    state_         = State::IDLE;
  uint32_t since_         = 0;
  uint32_t cooldownUntil_ = 0;
};

// =====================================================
// OBJEK GLOBAL (urutan definisi penting: lot sebelum telemetry)
// =====================================================
ParkingLot   lot;
MotionSensor pir(Config::PIR);
Display      display(Config::LCD_ADDR);
CardReader   reader;
Gate         gate(pir, reader, lot, display);

WifiManager  wifi;
MqttLink     mqtt(wifi);
Telemetry    telemetry(mqtt, lot);

// =====================================================
// SETUP / LOOP
// =====================================================
void setup() {
  Serial.begin(115200);
  delay(1500);                       // beri waktu rail/kapasitor stabil
  Serial.println("\n=== SMART PARKING ESP32 ===");

  Serial.println("[STEP 1] display.begin()");
  display.begin();
  Serial.println("[STEP 2] lot.begin()");
  lot.begin();
  Serial.println("[STEP 3] pir.begin()");
  pir.begin();
  Serial.println("[STEP 4] reader.begin()");
  reader.begin();

  Serial.println("[STEP 5] WiFi");
  display.showMessage("Menyambung WiFi", "Mohon tunggu", 60000);
  display.render(lot);
  wifi.connectWiFi();                // blocking, sebelum servo di-attach
  mqtt.begin();

  Serial.println("[STEP 6] gate.begin()");
  gate.begin();
  gate.setEventHandler([](const char* event, const String& uid) {
    telemetry.publishEvent(event, uid);
  });

  display.clearMessage();
  Serial.println("[SISTEM] Siap. Aktifkan PIR lalu tap kartu.");
  Serial.println("[TEST] Serial: c = kartu valid, x = kartu invalid");
}

void loop() {
  wifi.update();
  mqtt.update();
  lot.update();
  gate.update();
  telemetry.update();
  display.render(lot);
}