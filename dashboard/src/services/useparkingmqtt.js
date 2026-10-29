import { useEffect, useState } from "react";
import {
  connectMQTT,
  onSlotStatus,
  onGateEvent,
  onSystemStatus,
  onMQTTConnection,
} from "../services/mqttService";

let eventCounter = 0;

// Hook yang mengubah pesan MQTT menjadi state React,
// sehingga komponen otomatis render ulang saat data berubah.
export default function useParkingMqtt() {
  const [slotStatus, setSlotStatus] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [connection, setConnection] = useState({ connected: false });
  const [gateEvents, setGateEvents] = useState([]);

  useEffect(() => {
    connectMQTT();

    const unsubscribers = [
      onSlotStatus(setSlotStatus),
      onSystemStatus(setSystemStatus),
      onMQTTConnection(setConnection),
      onGateEvent((event) =>
        setGateEvents((prev) =>
          [
            { ...event, id: ++eventCounter, receivedAt: Date.now() },
            ...prev,
          ].slice(0, 20)
        )
      ),
    ];

    // Koneksi MQTT sengaja tidak diputus saat unmount
    // (aman untuk React StrictMode dan perpindahan halaman).
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  return { slotStatus, systemStatus, connection, gateEvents };
}