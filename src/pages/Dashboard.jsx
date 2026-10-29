import { useEffect, useState } from 'react';
import { LayoutGrid, CarFront, CircleCheck } from "lucide-react";
import StatCard from "../components/StatCard";
import ParkingLayout from "../components/ParkingLayout";
import { connectMQTT } from '../services/mqttService';

export default function Dashboard() {
  const [parkingStatus, setParkingStatus] = useState(null);

  useEffect(() => {
    const client = connectMQTT((data) => {
      console.log("Data MQTT masuk:", data);
      setParkingStatus(data);
    });

    return () => {
      client.end();
    };
  }, []);

  // Pengambilan nilai dinamis dari MQTT dengan nilai default (fallback)
  const totalSlots = parkingStatus?.total ?? 5;
  const filledSlots = parkingStatus?.filled ?? 0;
  const emptySlots = parkingStatus?.empty ?? (totalSlots - filledSlots);

  return (
    <section className="px-6 py-8 md:px-8">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-5xl font-bold tracking-tight text-white md:text-3xl">
            Dashboard
          </h2>
          <p className="mt-2 text-sm text-white md:text-base">
            Monitor ketersediaan slot parkir <br /> dan status sistem secara real-time.
          </p>
        </div>
      </div>

      {/* Statistik Parkir */}
      <div className="mt-8 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-3">
        {/* Total Slot */}
        <StatCard
          title="Total Slot"
          value={totalSlots}
          description="Kapasitas parkir"
          icon={LayoutGrid}
          color="stone"
        />

        {/* Slot Terisi dan Slot Kosong */}
        <div className="grid grid-cols-2 items-stretch gap-3 sm:col-span-2 sm:gap-5">
          <StatCard
            title="Slot Terisi"
            value={filledSlots}
            description="Sedang digunakan"
            icon={CarFront}
            color="rose"
          />

          <StatCard
            title="Slot Kosong"
            value={emptySlots}
            description="Masih tersedia"
            icon={CircleCheck}
            color="emerald"
          />
        </div>
      </div>

      {/* Mengoper data status ke komponen layout parkir */}
      <ParkingLayout data={parkingStatus} />
    </section>
  );
}