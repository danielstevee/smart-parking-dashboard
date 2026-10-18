import mqtt from 'mqtt';

// Ubah dari HiveMQ ke broker lokal
const BROKER_URL = 'ws://localhost:9001'; 

export const connectMQTT = (onMessageReceived) => {
  const client = mqtt.connect(BROKER_URL);

  client.on('connect', () => {
    console.log('Terhubung ke MQTT Broker Lokal!');
    client.subscribe('parking/slot/status');
  });

  client.on('message', (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      onMessageReceived(data);
    } catch (err) {
      onMessageReceived(message.toString());
    }
  });

  return client;
};