import mqtt from "mqtt";

// Alamat Mosquitto WebSocket pada laptop Ubuntu
const MQTT_URL = "ws://10.205.128.117:9001";

// Topik MQTT yang digunakan ESP32-CAM
const TOPIC_SLOT_STATUS = "parking/slot/status";
const TOPIC_GATE_EVENT = "parking/gate/event";
const TOPIC_SYSTEM_STATUS = "parking/system/status";

let client = null;
let reconnectTimer = null;

// Menyimpan callback agar Dashboard dapat menerima data MQTT
const listeners = {
  slotStatus: [],
  gateEvent: [],
  systemStatus: [],
  connection: [],
};

function notify(event, data) {
  listeners[event].forEach((callback) => {
    try {
      callback(data);
    } catch (error) {
      console.error(`Error pada listener ${event}:`, error);
    }
  });
}

function parseMessage(message) {
  try {
    return JSON.parse(message.toString());
  } catch (error) {
    console.error("Gagal membaca JSON MQTT:", error);
    return null;
  }
}

// Memulai koneksi ke Mosquitto
export function connectMQTT() {
  if (client && (client.connected || client.reconnecting)) {
    return client;
  }

  if (client) {
    client.end(true);
    client = null;
  }

  console.log("Menghubungkan ke MQTT:", MQTT_URL);

  client = mqtt.connect(MQTT_URL, {
    clientId: `smartparking_web_${Math.random()
      .toString(16)
      .slice(2, 10)}`,
    clean: true,
    connectTimeout: 10000,
    reconnectPeriod: 3000,
    keepalive: 30,
  });

  client.on("connect", () => {
    console.log("MQTT terhubung ke Mosquitto!");

    notify("connection", {
      connected: true,
      message: "Terhubung ke Mosquitto",
    });

    client.subscribe(
      [TOPIC_SLOT_STATUS, TOPIC_GATE_EVENT, TOPIC_SYSTEM_STATUS],
      { qos: 0 },
      (error) => {
        if (error) {
          console.error("Gagal subscribe MQTT:", error);
        } else {
          console.log("Berhasil subscribe ke topik Smart Parking");
        }
      }
    );
  });

  client.on("message", (topic, message) => {
    const data = parseMessage(message);

    if (data === null) {
      return;
    }

    console.log("Pesan MQTT diterima:", topic, data);

    switch (topic) {
      case TOPIC_SLOT_STATUS:
        notify("slotStatus", data);
        break;

      case TOPIC_GATE_EVENT:
        notify("gateEvent", data);
        break;

      case TOPIC_SYSTEM_STATUS:
        notify("systemStatus", data);
        break;

      default:
        console.warn("Topik MQTT tidak dikenali:", topic);
    }
  });

  client.on("reconnect", () => {
    console.log("Mencoba menghubungkan ulang MQTT...");
  });

  client.on("offline", () => {
    console.warn("Koneksi MQTT offline");

    notify("connection", {
      connected: false,
      message: "MQTT offline",
    });
  });

  client.on("close", () => {
    console.warn("Koneksi MQTT ditutup");

    notify("connection", {
      connected: false,
      message: "Koneksi MQTT ditutup",
    });
  });

  client.on("error", (error) => {
    console.error("Kesalahan MQTT:", error.message);
  });

  return client;
}

// Menerima pembaruan status slot parkir
export function onSlotStatus(callback) {
  listeners.slotStatus.push(callback);

  return () => {
    listeners.slotStatus = listeners.slotStatus.filter(
      (item) => item !== callback
    );
  };
}

// Menerima event gerbang parkir
export function onGateEvent(callback) {
  listeners.gateEvent.push(callback);

  return () => {
    listeners.gateEvent = listeners.gateEvent.filter(
      (item) => item !== callback
    );
  };
}

// Menerima status sistem
export function onSystemStatus(callback) {
  listeners.systemStatus.push(callback);

  return () => {
    listeners.systemStatus = listeners.systemStatus.filter(
      (item) => item !== callback
    );
  };
}

// Memantau status koneksi MQTT
export function onMQTTConnection(callback) {
  listeners.connection.push(callback);

  return () => {
    listeners.connection = listeners.connection.filter(
      (item) => item !== callback
    );
  };
}

// Mengirim pesan MQTT dari website jika diperlukan
export function publishMQTT(topic, payload, options = {}) {
  if (!client || !client.connected) {
    console.error("Tidak dapat mengirim pesan: MQTT belum terhubung");
    return false;
  }

  const message =
    typeof payload === "string" ? payload : JSON.stringify(payload);

  client.publish(topic, message, options);
  return true;
}

// Memutuskan koneksi MQTT
export function disconnectMQTT() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (client) {
    client.end(true);
    client = null;
  }

  notify("connection", {
    connected: false,
    message: "MQTT terputus",
  });
}
