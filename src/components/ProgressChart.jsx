import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const defaultData = [];

export default function ProgressChart({
  data = defaultData,
  title = "Weight Progress",
}) {
  return (
    <div className="chart-card">

      <div className="chart-header">
        <div>
          <p className="chart-label">
            PROGRESS
          </p>

          <h3>
            {title}
          </h3>
        </div>

        <button className="chart-period">
          7 Days
        </button>
      </div>

      <div className="chart-wrapper">
        {!data || data.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              minHeight: "180px",
              color: "#676e69",
              fontSize: "12px",
              textAlign: "center",
              padding: "20px",
            }}
          >
            <span style={{ color: "#a5b0a7", fontWeight: "600", marginBottom: "4px" }}>
              No progress data logged yet
            </span>
            <span>Update your metrics or complete workouts to view real-time charts.</span>
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <AreaChart data={data}>

            <defs>
              <linearGradient
                id="greenArea"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#b7ff3c"
                  stopOpacity={0.22}
                />

                <stop
                  offset="100%"
                  stopColor="#b7ff3c"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />

            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "#676e69",
                fontSize: 11,
              }}
            />

            <YAxis
              domain={
                title?.toLowerCase().includes("weight")
                  ? ["dataMin - 2", "dataMax + 2"]
                  : title?.toLowerCase().includes("joint") || title?.toLowerCase().includes("form")
                  ? [70, 100]
                  : ["auto", "auto"]
              }
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "#676e69",
                fontSize: 11,
              }}
              width={35}
            />

            <Tooltip
              contentStyle={{
                background: "#151816",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "10px",
                color: "#fff",
              }}
              formatter={(val) => [
                `${val}${title?.toLowerCase().includes("weight") ? " kg" : "%"}`,
                title?.toLowerCase().includes("weight") ? "Weight" : "Form Score",
              ]}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke="#b7ff3c"
              strokeWidth={2.5}
              fill="url(#greenArea)"
              dot={{ r: 4, fill: "#b7ff3c", stroke: "#121713", strokeWidth: 2 }}
              activeDot={{
                r: 6,
                fill: "#b7ff3c",
                stroke: "#101310",
                strokeWidth: 3,
              }}
            />

          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>

    </div>
  );
}