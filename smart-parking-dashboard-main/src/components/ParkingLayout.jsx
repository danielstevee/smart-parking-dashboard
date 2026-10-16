
import carImage from "../assets/car.png";

const parkingSlots = [
  { id: "A1", occupied: true },
  { id: "A2", occupied: false },
  { id: "A3", occupied: false },
  { id: "A4", occupied: true },
];

function ParkingLayout() {
  return (
    <section className="mt-6">

      {/* Satu card berisi empat slot */}
      <div className="overflow-hidden rounded-2xl bg-white p-4  ">
              {/* Header di luar card */}
      <div className="mb-4 text-center">
        <p className="text-sm font-bold text-stone-700 sm:text-2xl">
          Tata Letak Parkir
        </p>
        <p className="mt-1 text-sm text-stone-600">
          Status ketersediaan slot parkir
        </p>
      </div>
        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-stone-200">
          {parkingSlots.map((slot) => (
            <div
              key={slot.id}
              className={`flex min-h-52 flex-col items-center justify-center border-b border-r border-stone-200 p-2 sm:min-h-64 sm:p-3 ${
                slot.occupied ? "bg-[#FFF4DA]" : "bg-white"
              }`}
            >
              {slot.occupied ? (
                <img
                  src={carImage}
                  alt={`Mobil di slot ${slot.id}`}
                  className="h-35 w-full object-contain sm:h-56"
                />
              ) : (
                <div className="flex h-44 w-full items-center justify-center sm:h-56">
                  <span className="text-sm font-normal text-stone-700">
                    {slot.id}
                  </span>
                </div>
              )}

              {slot.occupied && (
                <span className="text-center text-sm font-normal text-stone-700">
                  {slot.id}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ParkingLayout;
