
function StatCard({ title, value, description, color }) {
  const isTotal = color === "stone";

  const colorStyles = {
    stone: {
      card: "bg-stone-800",
      number: "text-white",
      description: "text-white",
    },
    rose: {
      card: "bg-white",
      number: "text-red-600",
      description: "text-stone-700",
    },
    emerald: {
      card: "bg-white",
      number: "text-green-600",
      description: "text-stone-700",
    },
  };

  const styles = colorStyles[color];

  return (
    <div
      className={`flex min-w-0 flex-col rounded-2xl p-5 sm:p-6 ${styles.card}`}
    >
      <p
        className={`text-center  text-sm font-bold sm:text-base ${
          isTotal ? "text-white" : "text-stone-700"
        }`}
      >
        {title}
      </p>

      <div className="mt-6 flex flex-1 flex-col items-center justify-center text-center">
        <h3
          className={`text-5xl font-bold leading-none tracking-tight sm:text-6xl ${styles.number}`}
        >
          {value}
        </h3>

        <p
          className={`mt-4 text-sm leading-5 sm:text-base ${styles.description}`}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

export default StatCard;
