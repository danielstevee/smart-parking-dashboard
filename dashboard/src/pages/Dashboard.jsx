
import { LayoutGrid, CarFront, CircleCheck } from "lucide-react";

import StatCard from "../components/StatCard";
import ParkingLayout from "../components/ParkingLayout";
import useParkingMqtt from "../services/useparkingmqtt";

export default function Dashboard() {
  // Mengambil data MQTT melalui custom hook
  const {
    slotStatus: parkingStatus,
    systemStatus,
    connection,
  } = useParkingMqtt();

  // Statistik mengikuti data yang diterima dari ESP32
  const totalSlots = Number(parkingStatus?.total ?? 3);
  const filledSlots = Number(parkingStatus?.filled ?? 0);

  const emptySlots = Number(
    parkingStatus?.empty ?? Math.max(0, totalSlots - filledSlots)
  );

  return (
    <section className="px-6 py-8 md:px-8">
      {/* Heading dan status koneksi */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Dashboard
          </h2>

          <p className="mt-2 text-sm text-white md:text-base">
            Monitor ketersediaan slot parkir
            <br />
            dan status sistem secara real-time.
          </p>
        </div>

        {/* Status MQTT dan ESP32 */}
        <div className="text-sm text-white sm:text-right">
          <p>
            MQTT:{" "}
            <span
              className={
                connection?.connected ? "text-emerald-400" : "text-rose-400"
              }
            >
              {connection?.connected ? "Terhubung" : "Terputus"}
            </span>
          </p>

          <p>
            ESP32:{" "}
            <span
              className={
                systemStatus?.online ? "text-emerald-400" : "text-rose-400"
              }
            >
              {systemStatus?.online ? "Online" : "Offline"}
            </span>
          </p>
        </div>
      </div>

      {/* Statistik parkir */}
      <div className="mt-8 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-3">
        {/* Total slot */}
        <StatCard
          title="Total Slot"
          value={totalSlots}
          description="Kapasitas parkir"
          icon={LayoutGrid}
          color="stone"
        />

        {/* Slot terisi dan kosong */}
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

      {/* Tata letak parkir berdasarkan data MQTT */}
      <div className="mt-8">
        <ParkingLayout data={parkingStatus} />
      </div>
    </section>
  );
}
