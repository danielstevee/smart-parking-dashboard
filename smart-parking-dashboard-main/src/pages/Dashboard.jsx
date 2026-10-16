import { LayoutGrid, CarFront, CircleCheck } from "lucide-react";
import StatCard from "../components/StatCard";
import ParkingLayout from "../components/ParkingLayout";

function Dashboard() {
  return (
    <section className="px-6 py-8 md:px-8">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-5xl font-bold tracking-tight text-white md:text-3xl">
            Dashboard
          </h2>

          <p className="mt-2 text-sm  text-white md:text-base">
            Monitor ketersediaan slot parkir <br /> dan status sistem secara
            real-time.
          </p>
        </div>
      </div>

      {/* Statistik Parkir */}

      {/* Statistik Parkir */}
      <div className="mt-8 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-3">
        {/* Total Slot */}
        <StatCard
          title="Total Slot"
          value={5}
          description="Kapasitas parkir"
          icon={LayoutGrid}
          color="stone"
        />

        {/* Slot Terisi dan Slot Kosong */}
        <div className="grid grid-cols-2 items-stretch gap-3 sm:col-span-2 sm:gap-5">
          <StatCard
            title="Slot Terisi"
            value={1}
            description="Sedang digunakan"
            icon={CarFront}
            color="rose"
          />

          <StatCard
            title="Slot Kosong"
            value={4}
            description="Masih tersedia"
            icon={CircleCheck}
            color="emerald"
          />
        </div>
      </div>
      <ParkingLayout />
    </section>
    
  );
}

export default Dashboard;
