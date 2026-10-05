import {
  TrendingUp,
  TrendingDown,
} from "lucide-react";

export default function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  change,
  positive = true,
  accent = "green",
}) {
  return (
    <div className={`stat-card accent-${accent}`}>

      <div className="stat-card-top">

        <div className="stat-icon">
          {Icon && <Icon size={19} />}
        </div>

        {change && (
          <div
            className={`stat-change ${positive
                ? "positive"
                : "negative"
              }`}
          >
            {positive ? (
              <TrendingUp size={13} />
            ) : (
              <TrendingDown size={13} />
            )}

            {change}
          </div>
        )}

      </div>

      <div className="stat-label">
        {label}
      </div>

      <div className="stat-value">
        {value}

        {unit && (
          <span>{unit}</span>
        )}
      </div>

    </div>
  );
}