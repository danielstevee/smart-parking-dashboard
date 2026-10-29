import mqtt from "mqtt";

// Broker publik HiveMQ via WebSocket (ESP32 memakai port 1883 TCP ke broker yang sama)
const MQTT_URL = "ws://broker.hivemq.com:8000/mqtt";

// Harus SAMA PERSIS dengan topic di firmware (main.cpp)
const TOPIC_SLOT_STATUS = "sparks/parking/slot/status";
const TOPIC_GATE_EVENT = "sparks/parking/gate/event";
const TOPIC_SYSTEM_STATUS = "sparks/parking/system/status";

let client = null;

const listeners = {
  slotStatus: [],
  gateEvent: [],
  systemStatus: [],
  connection: [],
};

// Data terakhir disimpan. Listener yang mendaftar belakangan (mis. komponen
// React yang baru mount) langsung mendapat data ini, sehingga pesan retained
// yang datang sebelum komponen siap tidak hilang.
const last = {
  slotStatus: null,
  systemStatus: null,
  connection: null,
};

function notify(event, data) {
  if (event in last) last[event] = data;

  listeners[event].forEach((callback) => {
    try {
      callback(data);
    } catch (error) {
      console.error(`Error pada listener ${event}:`, error);
    }
  });
}

function parseJSON(message) {
  try {
    return JSON.parse(message.toString());
  } catch (error) {
    console.error("Gagal membaca JSON MQTT:", error);
    return null;
  }
}

export function connectMQTT() {
  if (client) return client; // sudah ada (connected / reconnecting)

  console.log("Menghubungkan ke MQTT:", MQTT_URL);

  client = mqtt.connect(MQTT_URL, {
    clientId: `smartparking_web_${Math.random().toString(16).slice(2, 10)}`,
    clean: true,
    connectTimeout: 10000,
    reconnectPeriod: 3000,
    keepalive: 30,
  });

  client.on("connect", () => {
    console.log("MQTT terhubung!");
    notify("connection", { connected: true, message: "Terhubung ke broker" });

    client.subscribe(
      [TOPIC_SLOT_STATUS, TOPIC_GATE_EVENT, TOPIC_SYSTEM_STATUS],
      { qos: 0 },
      (error) => {
        if (error) console.error("Gagal subscribe MQTT:", error);
        else console.log("Berhasil subscribe ke topik Smart Parking");
      }
    );
  });

  client.on("message", (topic, message) => {
    console.log("Pesan MQTT diterima:", topic, message.toString());

    switch (topic) {
      case TOPIC_SLOT_STATUS: {
        const data = parseJSON(message);
        if (data) notify("slotStatus", data);
        break;
      }

      case TOPIC_GATE_EVENT: {
        const data = parseJSON(message);
        if (data) notify("gateEvent", data);
        break;
      }

      case TOPIC_SYSTEM_STATUS: {
        // Firmware mengirim teks biasa "online" / "offline", BUKAN JSON
        const text = message.toString().trim();
        notify("systemStatus", { status: text, online: text === "online" });
        break;
      }

      default:
        console.warn("Topik MQTT tidak dikenali:", topic);
    }
  });

  client.on("reconnect", () => console.log("Mencoba menghubungkan ulang MQTT..."));

  client.on("offline", () => {
    notify("connection", { connected: false, message: "MQTT offline" });
  });

  client.on("close", () => {
    notify("connection", { connected: false, message: "Koneksi MQTT ditutup" });
  });

  client.on("error", (error) => console.error("Kesalahan MQTT:", error.message));

  return client;
}

function subscribeTo(event, callback, replay) {
  listeners[event].push(callback);

  if (replay && last[event] !== null) {
    callback(last[event]);
  }

  return () => {
    listeners[event] = listeners[event].filter((item) => item !== callback);
  };
}

export const onSlotStatus = (cb) => subscribeTo("slotStatus", cb, true);
export const onGateEvent = (cb) => subscribeTo("gateEvent", cb, false);
export const onSystemStatus = (cb) => subscribeTo("systemStatus", cb, true);
export const onMQTTConnection = (cb) => subscribeTo("connection", cb, true);

export function publishMQTT(topic, payload, options = {}) {
  if (!client || !client.connected) {
    console.error("Tidak dapat mengirim pesan: MQTT belum terhubung");
    return false;
  }

  const message = typeof payload === "string" ? payload : JSON.stringify(payload);
  client.publish(topic, message, options);
  return true;
}

export function disconnectMQTT() {
  if (client) {
    client.end(true);
    client = null;
  }
  last.slotStatus = null;
  last.systemStatus = null;
  notify("connection", { connected: false, message: "MQTT terputus" });
}