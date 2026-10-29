import carImage from "../assets/car.png";

function ParkingLayout({ data }) {
  // Mengambil data slot dari MQTT
  const parkingSlots = Array.isArray(data?.slots) ? data.slots : [];

  return (
    <section className="mt-6">
      <div className="overflow-hidden rounded-2xl bg-white p-4">
        {/* Header */}
        <div className="mb-4 text-center">
          <p className="text-sm font-bold text-stone-700 sm:text-2xl">
            Tata Letak Parkir
          </p>

          <p className="mt-1 text-sm text-stone-600">
            Status ketersediaan slot parkir
          </p>
        </div>

        {/* Slot parkir */}
        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-stone-200">
          {parkingSlots.length > 0 ? (
            parkingSlots.map((slot, index) => {
              const slotId = `A${slot.id ?? index + 1}`;

              // Mendukung properti occupied maupun status
              const occupied =
                typeof slot.occupied === "boolean"
                  ? slot.occupied
                  : slot.status === "occupied" || slot.status === "terisi";

              return (
                <div
                  key={slotId}
                  className={`flex min-h-52 flex-col items-center justify-center border-b border-r border-stone-200 p-2 sm:min-h-64 sm:p-3 ${
                    occupied ? "bg-[#FFF4DA]" : "bg-white"
                  }`}
                >
                  {occupied ? (
                    <img
                      src={carImage}
                      alt={`Mobil di slot ${slotId}`}
                      className="h-36 w-full object-contain sm:h-56"
                    />
                  ) : (
                    <div className="flex h-44 w-full items-center justify-center sm:h-56">
                      <span className="text-sm font-normal text-stone-700">
                        {slotId}
                      </span>
                    </div>
                  )}

                  {occupied && (
                    <span className="text-center text-sm font-normal text-stone-700">
                      {slotId}
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-2 flex min-h-40 items-center justify-center p-4 text-center text-sm text-stone-500">
              Menunggu data slot parkir dari ESP32...
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default ParkingLayout;