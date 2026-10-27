
import mqtt from "mqtt";

const MQTT_URL = "ws://localhost:9001";

const TOPIC_SLOT_STATUS = "parking/slot/status";
const TOPIC_GATE_EVENT = "parking/gate/event";
const TOPIC_SYSTEM_STATUS = "parking/system/status";

let client = null;

export function connectMQTT(onSlotStatus) {
  // Hindari membuat koneksi baru jika koneksi sudah aktif
  if (client && client.connected) {
    return client;
  }

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
    console.log("MQTT berhasil terhubung:", MQTT_URL);

    client.subscribe(
      [TOPIC_SLOT_STATUS, TOPIC_GATE_EVENT, TOPIC_SYSTEM_STATUS],
      (error) => {
        if (error) {
          console.error("Gagal subscribe MQTT:", error);
        } else {
          console.log("Berhasil subscribe topik MQTT");
        }
      }
    );
  });

  client.on("message", (topic, message) => {
    let data;

    try {
      data = JSON.parse(message.toString());
    } catch (error) {
      console.error("Payload MQTT bukan JSON yang valid:", error);
      return;
    }

    console.log("Pesan MQTT diterima:", topic, data);

    if (topic === TOPIC_SLOT_STATUS && typeof onSlotStatus === "function") {
      onSlotStatus(data);
    }
  });

  client.on("reconnect", () => {
    console.log("Mencoba menghubungkan ulang MQTT...");
  });

  client.on("offline", () => {
    console.warn("Koneksi MQTT offline");
  });

  client.on("error", (error) => {
    console.error("Kesalahan MQTT:", error.message);
  });

  return client;
}

export function disconnectMQTT() {
  if (client) {
    client.end(true);
    client = null;
    console.log("Koneksi MQTT ditutup");
  }
}
