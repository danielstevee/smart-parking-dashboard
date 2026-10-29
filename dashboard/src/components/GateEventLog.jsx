const LABELS = {
  access_granted: "Akses diterima",
  access_denied: "Kartu ditolak",
  lot_full: "Parkir penuh",
  gate_closed: "Palang ditutup",
};

export default function GateEventLog({ events = [] }) {
  // waiting_card dan timeout tidak ditampilkan agar log tidak penuh
  const visible = events.filter((e) => LABELS[e.event]).slice(0, 8);

  return (
    <section className="mt-6 rounded-2xl bg-white p-4">
      <p className="mb-2 text-center text-sm font-bold text-stone-700 sm:text-2xl">
        Aktivitas Palang
      </p>

      {visible.length === 0 ? (
        <p className="py-4 text-center text-sm text-stone-500">
          Belum ada aktivitas palang.
        </p>
      ) : (
        <ul className="divide-y divide-stone-200 text-sm text-stone-700">
          {visible.map((e) => (
            <li key={e.id} className="flex justify-between gap-3 py-2">
              <span>
                {LABELS[e.event]}
                {e.uid ? ` (${e.uid})` : ""}
              </span>
              <span className="shrink-0 text-stone-500">
                {new Date(e.receivedAt).toLocaleTimeString("id-ID")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}