import { useState, useEffect } from "react";
import {
  TrendingUp,
  Award,
  Dumbbell,
  Scale,
  CheckCircle2,
  CalendarCheck,
  Brain,
  Plus,
  X,
  Flame,
  Sparkles,
  ArrowRight,
  Activity,
  Droplets,
  Target,
  Zap,
  Camera,
  Info,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import DashboardLayout from "../../components/DashboardLayout";
import StatCard from "../../components/StatCard";
import { useAuth } from "../../context/AuthContext";
import {
  getMemberProgressMetrics,
  logMemberWeighIn,
  getAssignedWorkout,
} from "../../services/mockData";

export default function Progress() {
  const { user } = useAuth();
  const userName = user?.name || user?.email || "Member";

  const [metrics, setMetrics] = useState(() =>
    getMemberProgressMetrics(user?.name || user?.email, user)
  );

  const [assignedWorkout, setAssignedWorkout] = useState(() =>
    getAssignedWorkout(user?.name || user?.email)
  );

  const [showWeighInModal, setShowWeighInModal] = useState(false);
  const [newWeight, setNewWeight] = useState(metrics?.weight || user?.weight || "60");
  const [newTargetWeight, setNewTargetWeight] = useState(metrics?.targetWeight || user?.targetWeight || "65");
  const [successNotice, setSuccessNotice] = useState("");

  useEffect(() => {
    const updateMetrics = () => {
      const fresh = getMemberProgressMetrics(user?.name || user?.email, user);
      setMetrics({ ...fresh });
      setAssignedWorkout(getAssignedWorkout(user?.name || user?.email));
      if (fresh.weight) setNewWeight(String(fresh.weight));
      if (fresh.targetWeight) setNewTargetWeight(String(fresh.targetWeight));
    };

    updateMetrics();

    window.addEventListener("fittrack:workout-completed", updateMetrics);
    window.addEventListener("fittrack:workout-changed", updateMetrics);
    window.addEventListener("fittrack:progress-updated", updateMetrics);
    window.addEventListener("fittrack:attendance-changed", updateMetrics);
    window.addEventListener("storage", updateMetrics);

    return () => {
      window.removeEventListener("fittrack:workout-completed", updateMetrics);
      window.removeEventListener("fittrack:workout-changed", updateMetrics);
      window.removeEventListener("fittrack:progress-updated", updateMetrics);
      window.removeEventListener("fittrack:attendance-changed", updateMetrics);
      window.removeEventListener("storage", updateMetrics);
    };
  }, [user]);

  const handleSaveWeighIn = (e) => {
    e.preventDefault();
    const wNum = parseFloat(newWeight);
    if (!wNum || isNaN(wNum)) return;

    const tNum = parseFloat(newTargetWeight) || null;
    const updated = logMemberWeighIn(user?.name || user?.email, wNum, tNum);
    if (updated) {
      setMetrics({ ...updated });
      setSuccessNotice(`✓ Weigh-in recorded: ${wNum} kg. Progress & metabolic charts updated!`);
      setTimeout(() => setSuccessNotice(""), 4000);
    }
    setShowWeighInModal(false);
  };

  // --- Real Member Biometrics & Core Calculations ---
  const curWeight = Number(metrics.weight || user?.weight || 60);
  const tgtWeight = Number(metrics.targetWeight || user?.targetWeight || 65);
  const heightCm = Number(user?.height || 175);
  const ageYrs = Number(user?.age || 23);
  const gender = user?.gender || "male";
  const goal = user?.goal || "Muscle Gain";
  const isWeightLoss = goal.toLowerCase().includes("loss");
  const diffKg = Math.abs(tgtWeight - curWeight).toFixed(1);

  // BMI (Body Mass Index)
  const heightM = heightCm / 100;
  const bmiNum = curWeight / (heightM * heightM);
  const bmi = bmiNum.toFixed(1);

  let bmiCategory = { label: "Normal / Healthy", color: "#b7ff3c", badge: "badge-green" };
  if (bmiNum < 18.5) {
    bmiCategory = { label: "Underweight", color: "#ffbd59", badge: "badge-amber" };
  } else if (bmiNum <= 24.9) {
    bmiCategory = { label: "Normal Weight", color: "#b7ff3c", badge: "badge-green" };
  } else if (bmiNum <= 29.9) {
    bmiCategory = { label: "Overweight", color: "#ffbd59", badge: "badge-amber" };
  } else {
    bmiCategory = { label: "Obese", color: "#ff5c67", badge: "badge-danger" };
  }

  const minHealthyWeight = (18.5 * heightM * heightM).toFixed(1);
  const maxHealthyWeight = (24.9 * heightM * heightM).toFixed(1);

  // BMR (Basal Metabolic Rate via Mifflin-St Jeor formula)
  const bmr = Math.round(
    10 * curWeight + 6.25 * heightCm - 5 * ageYrs + (gender === "female" ? -161 : 5)
  );

  // TDEE (Total Daily Energy Expenditure with gym activity multiplier ~1.45)
  const tdee = Math.round(bmr * 1.45);

  // Target Daily Caloric Intake adjusted for goal
  let targetCalories = tdee;
  if (isWeightLoss) {
    targetCalories = Math.max(1400, tdee - 500); // 500 kcal deficit
  } else if (goal.toLowerCase().includes("gain") || goal.toLowerCase().includes("muscle")) {
    targetCalories = tdee + 350; // lean surplus
  }

  // Daily Water Intake (35ml per kg body weight)
  const waterLiters = ((curWeight * 35) / 1000).toFixed(1);

  // Target Macronutrient Split
  const proteinGrams = Math.round(curWeight * 2.0); // 2.0g/kg
  const proteinKcal = proteinGrams * 4;
  const fatGrams = Math.round(curWeight * 0.9); // 0.9g/kg
  const fatKcal = fatGrams * 9;
  const carbKcal = Math.max(0, targetCalories - (proteinKcal + fatKcal));
  const carbGrams = Math.round(carbKcal / 4);

  const macroData = [
    { name: "Complex Carbs", value: carbGrams, kcal: carbKcal, color: "#b7ff3c" },
    { name: "Lean Protein", value: proteinGrams, kcal: proteinKcal, color: "#00e5ff" },
    { name: "Healthy Fats", value: fatGrams, kcal: fatKcal, color: "#ffbd59" },
  ];

  // Milestone Trajectory Projection
  const ratePerWeek = 0.5; // healthy 0.5 kg / week
  const weeksToGoal = Math.max(1, Math.ceil(parseFloat(diffKg) / ratePerWeek));
  const targetDateObj = new Date(Date.now() + weeksToGoal * 7 * 24 * 60 * 60 * 1000);
  const projectedTargetDate = targetDateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const progressPct =
    curWeight === tgtWeight
      ? 100
      : Math.min(
          100,
          Math.max(
            8,
            Math.round(
              (1 - parseFloat(diffKg) / Math.max(parseFloat(diffKg) + 5, 10)) * 100
            )
          )
        );

  // Assigned Routine Workout Volume
  const routineExercises = assignedWorkout?.exercises || [];
  const volumeData = routineExercises.map((ex) => {
    const s = Number(ex.sets) || 3;
    const r = parseInt(ex.reps) || 10;
    return {
      name: ex.name.length > 18 ? ex.name.substring(0, 16) + "…" : ex.name,
      fullName: ex.name,
      totalReps: s * r,
      sets: s,
      reps: ex.reps,
    };
  });

  const totalRoutineReps = volumeData.reduce((acc, v) => acc + v.totalReps, 0);
  const totalRoutineSets = volumeData.reduce((acc, v) => acc + v.sets, 0);
  const estimatedWorkoutBurn = Math.round(totalRoutineSets * 25 + 120);

  // Charts data
  const weightData = metrics.weightHistory || [];
  const weeklyWorkoutsData = metrics.weeklyWorkouts || [
    { name: "Mon", count: 0 },
    { name: "Tue", count: 0 },
    { name: "Wed", count: 0 },
    { name: "Thu", count: 0 },
    { name: "Fri", count: 0 },
    { name: "Sat", count: 0 },
    { name: "Sun", count: 0 },
  ];
  const totalWeeklySessions =
    metrics.totalWeeklySessions ||
    weeklyWorkoutsData.reduce((acc, d) => acc + (d.count || 0), 0);

  // Zero-dummy check for AI Computer Vision
  const hasRealAiSessions =
    Array.isArray(metrics.formHistory) &&
    metrics.formHistory.length > 0 &&
    metrics.formScore !== null;
  const formImprovementData = metrics.formHistory || [];

  return (
    <DashboardLayout
      title="Fitness Progress Tracking"
      subtitle="Live metrics tracking your body composition, metabolic expenditure, workout load, and AI analytics."
    >
      {/* Toast Notification Banner */}
      {successNotice && (
        <div className="alert alert-success mb-4 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green" />
            <span className="font-semibold text-sm">{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice("")}
            className="text-muted hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Real-time Workout Completion Notice */}
      {metrics.isTodayCompleted && (
        <div className="dash-card mb-4 border border-green/30 bg-green/5 p-4 rounded-xl flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green/20 flex items-center justify-center text-green flex-shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">
                Today's Workout Completed & Synced!
              </h4>
              <p className="text-muted text-xs mt-0.5">
                Great job! Your session has been credited to your weekly consistency frequency and training volume.
              </p>
            </div>
          </div>
          <Link
            to="/member/workout"
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
          >
            <span>View Routine</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* 4 Core Performance Metric Stat Cards */}
      <div className="dash-grid-4">
        <StatCard
          icon={Scale}
          label="CURRENT WEIGHT"
          value={curWeight}
          unit="kg"
          change={`Goal: ${tgtWeight} kg`}
          positive={true}
          accent="green"
        />
        <StatCard
          icon={Activity}
          label="BODY MASS INDEX (BMI)"
          value={bmi}
          unit=""
          change={bmiCategory.label}
          positive={bmiNum >= 18.5 && bmiNum <= 24.9}
          accent="cyan"
        />
        <StatCard
          icon={Dumbbell}
          label="WORKOUTS COMPLETED"
          value={metrics.workoutsCount ?? user?.workoutsCount ?? 0}
          unit="sessions"
          change={metrics.isTodayCompleted ? "✓ Today Finished" : "Logged sessions"}
          positive={true}
          accent="green"
        />
        <StatCard
          icon={Brain}
          label="AVERAGE FORM SCORE"
          value={hasRealAiSessions ? `${metrics.formScore}%` : "Not Tested"}
          unit=""
          change={hasRealAiSessions ? "AI Vision Tracking" : "Ready to Calibrate"}
          positive={true}
          accent="green"
        />
      </div>

      {/* Goal Milestone & Trajectory Strip */}
      <div className="trajectory-strip mt-4">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="dash-card-badge">WEIGHT MILESTONE</span>
              <span className="badge badge-green font-mono">{goal}</span>
              <span className="badge badge-cyan font-mono text-[11px]">
                ~{ratePerWeek} kg/week pacing
              </span>
            </div>
            <h3 className="text-white font-bold text-lg mt-1.5">
              Current: {curWeight} kg ➔ Target: {tgtWeight} kg
            </h3>
            <p className="text-muted text-xs mt-1 max-w-xl leading-relaxed">
              {diffKg === "0.0" ? (
                "Congratulations! You have reached your target goal weight. Maintain your nutrition and training consistency."
              ) : (
                <>
                  You have <span className="text-white font-semibold">{diffKg} kg</span> remaining to reach your target. At a healthy pace of ~0.5 kg/week, your projected milestone achievement is{" "}
                  <span className="text-cyan font-semibold">{projectedTargetDate}</span> ({weeksToGoal} weeks).
                </>
              )}
            </p>

            <div className="milestone-progress-bar-bg">
              <div
                className="milestone-progress-bar-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted">
              <span>Progress to Goal: <strong className="text-white">{progressPct}%</strong></span>
              <span>Projected: <strong className="text-cyan">{projectedTargetDate}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="target-progress-box">
              <div className="target-progress-stat">
                <span className="target-progress-value font-mono">
                  {diffKg === "0.0" ? "DONE" : `${diffKg} kg`}
                </span>
                <span className="target-progress-lbl">
                  {diffKg === "0.0" ? "GOAL REACHED" : isWeightLoss ? "TO LOSE" : "TO GAIN"}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowWeighInModal(true)}
              className="btn btn-primary btn-sm flex items-center gap-1.5 shrink-0"
            >
              <Plus size={15} />
              <span>Log Weigh-In</span>
            </button>
          </div>
        </div>
      </div>

      {/* METABOLIC & MACRONUTRIENT SUITE (2-Column Grid) */}
      <div className="dash-grid-2 mt-4">
        {/* Left: Metabolic Energy Expenditure Engine */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <span className="dash-card-badge">METABOLIC ENGINE</span>
              <h3 className="dash-card-title">Daily Energy Expenditure</h3>
            </div>
            <span className="badge badge-green font-mono">Mifflin-St Jeor</span>
          </div>

          <div className="metabolic-grid mt-3">
            {/* 1. BMR */}
            <div className="metabolic-box">
              <span className="metabolic-label">
                <Flame size={14} className="text-amber-400" />
                Basal Metabolic (BMR)
              </span>
              <div className="metabolic-val text-amber-400">
                {bmr} <span className="text-xs text-muted font-normal">kcal/day</span>
              </div>
              <span className="metabolic-sub">
                Resting baseline burned by organs & vital biological processes.
              </span>
            </div>

            {/* 2. TDEE */}
            <div className="metabolic-box">
              <span className="metabolic-label">
                <Zap size={14} className="text-cyan" />
                Maintenance (TDEE)
              </span>
              <div className="metabolic-val text-cyan">
                {tdee} <span className="text-xs text-muted font-normal">kcal/day</span>
              </div>
              <span className="metabolic-sub">
                Includes regular workout training & active daily movement.
              </span>
            </div>

            {/* 3. Target Intake */}
            <div className="metabolic-box">
              <span className="metabolic-label">
                <Target size={14} className="text-green" />
                Target Calorie Goal
              </span>
              <div className="metabolic-val text-green">
                {targetCalories} <span className="text-xs text-muted font-normal">kcal/day</span>
              </div>
              <span className="metabolic-sub">
                {isWeightLoss
                  ? "500 kcal deficit for steady fat loss."
                  : goal.toLowerCase().includes("gain") || goal.toLowerCase().includes("muscle")
                  ? "+350 kcal surplus for lean muscle hypertrophy."
                  : "Maintenance intake for peak athletic conditioning."}
              </span>
            </div>

            {/* 4. Hydration */}
            <div className="metabolic-box">
              <span className="metabolic-label">
                <Droplets size={14} className="text-blue-400" />
                Daily Hydration
              </span>
              <div className="metabolic-val text-blue-400">
                {waterLiters} <span className="text-xs text-muted font-normal">Liters</span>
              </div>
              <span className="metabolic-sub">
                Optimal intake based on {curWeight} kg body mass & exercise recovery.
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between flex-wrap gap-2 text-xs text-muted">
            <div className="flex items-center gap-2">
              <Info size={14} className="text-cyan shrink-0" />
              <span>
                Height: <strong className="text-white">{heightCm} cm</strong> | Healthy Weight Range:{" "}
                <strong className="text-white">{minHealthyWeight} – {maxHealthyWeight} kg</strong>
              </span>
            </div>
            <span className={`badge ${bmiCategory.badge} text-[11px]`}>
              BMI: {bmi} ({bmiCategory.label})
            </span>
          </div>
        </div>

        {/* Right: Daily Macronutrient Target Split (Donut Chart) */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <span className="dash-card-badge">NUTRITIONAL COMPOSITION</span>
              <h3 className="dash-card-title">Target Macronutrient Split</h3>
            </div>
            <span className="badge badge-cyan font-mono">{targetCalories} kcal</span>
          </div>

          <div className="macro-donut-wrapper mt-2">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Tooltip
                  contentStyle={{
                    background: "#151816",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  formatter={(val, name, entry) => [
                    `${val}g (${entry.payload.kcal} kcal)`,
                    name,
                  ]}
                />
                <Pie
                  data={macroData}
                  innerRadius={64}
                  outerRadius={88}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {macroData.map((entry, index) => (
                    <Cell key={`macro-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="macro-center-stat">
              <div className="macro-center-cal">{targetCalories}</div>
              <div className="macro-center-lbl">KCAL / DAY</div>
            </div>
          </div>

          {/* 3 Macro Breakdown Cards */}
          <div className="macro-pills-grid">
            <div className="macro-pill" style={{ borderColor: "rgba(0, 229, 255, 0.25)" }}>
              <span className="macro-pill-name text-cyan">
                <span className="w-2 h-2 rounded-full bg-cyan inline-block" />
                Protein (2.0g/kg)
              </span>
              <div className="macro-pill-val">{proteinGrams}g</div>
              <div className="macro-pill-kcal">{proteinKcal} kcal</div>
            </div>

            <div className="macro-pill" style={{ borderColor: "rgba(183, 255, 60, 0.25)" }}>
              <span className="macro-pill-name text-green">
                <span className="w-2 h-2 rounded-full bg-green inline-block" />
                Carbohydrates
              </span>
              <div className="macro-pill-val">{carbGrams}g</div>
              <div className="macro-pill-kcal">{carbKcal} kcal</div>
            </div>

            <div className="macro-pill" style={{ borderColor: "rgba(255, 189, 89, 0.25)" }}>
              <span className="macro-pill-name text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                Healthy Fats
              </span>
              <div className="macro-pill-val">{fatGrams}g</div>
              <div className="macro-pill-kcal">{fatKcal} kcal</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column: Weight History Trend & AI Computer Vision Tracking */}
      <div className="dash-grid-2 mt-4">
        {/* 1. Weight History Chart with Milestone Reference Line 📈 */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <span className="dash-card-badge">BODY MASS TRAJECTORY</span>
              <h3 className="dash-card-title">Weight Progress Trend (kg)</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-green font-mono">Current: {curWeight} kg</span>
              <button
                onClick={() => setShowWeighInModal(true)}
                className="btn btn-ghost btn-xs text-xs text-muted hover:text-green"
              >
                + Update
              </button>
            </div>
          </div>

          <div className="chart-wrapper mt-3" style={{ height: "240px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weightData}>
                <defs>
                  <linearGradient id="progressGreenArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b7ff3c" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#b7ff3c" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#676e69", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#676e69", fontSize: 11 }}
                  width={34}
                  domain={[
                    (dataMin) => Math.max(30, Math.floor(Math.min(dataMin, tgtWeight, curWeight) - 2)),
                    (dataMax) => Math.ceil(Math.max(dataMax, tgtWeight, curWeight) + 2),
                  ]}
                />
                <Tooltip
                  contentStyle={{
                    background: "#151816",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  formatter={(val) => [`${val} kg`, "Weight"]}
                />
                <ReferenceLine
                  y={tgtWeight}
                  stroke="#00e5ff"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Goal ${tgtWeight}kg`,
                    fill: "#00e5ff",
                    fontSize: 11,
                    position: "insideTopRight",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#b7ff3c"
                  strokeWidth={2.5}
                  fill="url(#progressGreenArea)"
                  dot={{ r: 4, fill: "#b7ff3c", strokeWidth: 1 }}
                  activeDot={{ r: 6, fill: "#fff", stroke: "#b7ff3c", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between items-center text-xs text-muted mt-2 pt-2 border-t border-white/[0.05]">
            <span>Initial Baseline: <strong className="text-white">{weightData[0]?.value || curWeight} kg</strong></span>
            <span>Target Goal: <strong className="text-cyan">{tgtWeight} kg</strong></span>
          </div>
        </div>

        {/* 2. Computer Vision AI Form Analytics 🤖 */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <span className="dash-card-badge">COMPUTER VISION ANALYTICS</span>
              <h3 className="dash-card-title">AI Pose & Joint Alignment</h3>
            </div>
            <span className={`badge ${hasRealAiSessions ? "badge-green" : "badge-secondary"}`}>
              {hasRealAiSessions ? `${metrics.formScore}% Score` : "0 Sessions Recorded"}
            </span>
          </div>

          {hasRealAiSessions ? (
            <div className="chart-wrapper mt-3" style={{ height: "240px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formImprovementData}>
                  <defs>
                    <linearGradient id="aiScoreArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00e5ff" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#00e5ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#676e69", fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#676e69", fontSize: 11 }}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#151816",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "10px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                    formatter={(val) => [`${val}% accuracy`, "Form Score"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#00e5ff"
                    strokeWidth={2}
                    fill="url(#aiScoreArea)"
                    dot={{ r: 4, fill: "#00e5ff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="zero-camera-card mt-3">
              <div className="zero-camera-icon-halo">
                <Camera size={26} />
              </div>
              <h4 className="font-bold text-white text-sm">
                No Camera Sessions Logged Yet
              </h4>
              <p className="text-muted text-xs max-w-sm mt-1 leading-relaxed">
                You haven't conducted a computer vision tracking session yet. Zero dummy numbers are displayed. Activate AI Form Coach to begin real-time joint tracking.
              </p>

              <div className="zero-camera-features">
                <div className="zero-camera-feature-item">
                  <CheckCircle2 size={13} className="text-green shrink-0" />
                  <span>MediaPipe 33-point skeletal landmark detection</span>
                </div>
                <div className="zero-camera-feature-item">
                  <CheckCircle2 size={13} className="text-green shrink-0" />
                  <span>Real-time squat depth, hip hinge & knee alignment feedback</span>
                </div>
                <div className="zero-camera-feature-item">
                  <CheckCircle2 size={13} className="text-green shrink-0" />
                  <span>Biomechanical form flaw detection & rep cadence scoring</span>
                </div>
              </div>

              <Link
                to="/member/ai-coach"
                className="btn btn-primary btn-sm flex items-center gap-1.5"
              >
                <Brain size={15} />
                <span>Launch AI Form Coach</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 2-Column: Weekly Consistency Frequency & Workout Routine Volume Load */}
      <div className="dash-grid-2 mt-4">
        {/* 1. Weekly Workout Frequency (Bar Chart) 📊 */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <span className="dash-card-badge">CONSISTENCY</span>
              <h3 className="dash-card-title">Weekly Workout Frequency</h3>
            </div>
            <span className="badge badge-cyan font-semibold">
              {totalWeeklySessions} SESSIONS LOGGED
            </span>
          </div>

          <div className="chart-wrapper mt-3" style={{ height: "230px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyWorkoutsData}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#676e69", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#676e69", fontSize: 12 }}
                  width={30}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#151816",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px",
                    color: "#fff",
                  }}
                  formatter={(val) => [`${val} sessions`, "Workouts"]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {weeklyWorkoutsData.map((entry, index) => (
                    <Cell
                      key={`bar-cell-${index}`}
                      fill={entry.count > 0 ? "#b7ff3c" : "rgba(255, 255, 255, 0.08)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between items-center text-xs text-muted mt-2 pt-2 border-t border-white/[0.05]">
            <span>Weekly Target: <strong className="text-white">4–5 sessions / wk</strong></span>
            <span>Current Status: <strong className="text-green">{totalWeeklySessions >= 4 ? "On Target" : "Building Momentum"}</strong></span>
          </div>
        </div>

        {/* 2. Assigned Workout Volume Load (Bar Chart) 🏋️‍♂️ */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <span className="dash-card-badge">TRAINING VOLUME LOAD</span>
              <h3 className="dash-card-title">Routine Exercise Volume</h3>
            </div>
            <span className="badge badge-green font-mono">
              {totalRoutineReps} Total Reps
            </span>
          </div>

          {volumeData.length > 0 ? (
            <div className="chart-wrapper mt-3" style={{ height: "230px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData} layout="vertical">
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#676e69", fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#a5b0a7", fontSize: 11 }}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#151816",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "10px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                    formatter={(val, name, entry) => [
                      `${val} reps (${entry.payload.sets} sets × ${entry.payload.reps})`,
                      entry.payload.fullName,
                    ]}
                  />
                  <Bar dataKey="totalReps" radius={[0, 6, 6, 0]}>
                    {volumeData.map((entry, index) => (
                      <Cell
                        key={`vol-cell-${index}`}
                        fill={index % 2 === 0 ? "#00e5ff" : "#b7ff3c"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="p-8 text-center text-muted text-xs">
              No exercises assigned yet. Check with your coach.
            </div>
          )}

          <div className="flex justify-between items-center text-xs text-muted mt-2 pt-2 border-t border-white/[0.05]">
            <span>Routine Volume: <strong className="text-white">{totalRoutineSets} sets</strong></span>
            <span>Est. Session Burn: <strong className="text-amber-400">~{estimatedWorkoutBurn} kcal</strong></span>
          </div>
        </div>
      </div>

      {/* Modal: Log Weigh-In */}
      {showWeighInModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: "440px" }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Scale size={20} className="text-green" />
                <h3>Log Your Weigh-In</h3>
              </div>
              <button
                onClick={() => setShowWeighInModal(false)}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveWeighIn} className="modal-body space-y-4">
              <p className="text-muted text-xs">
                Enter your current body weight. This automatically recalculates your BMI, BMR, TDEE, macronutrient distribution, and milestone trajectory.
              </p>

              <div className="form-group">
                <label className="form-label">Current Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="250"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="form-input"
                  required
                  placeholder="e.g. 60.5"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Goal Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="250"
                  value={newTargetWeight}
                  onChange={(e) => setNewTargetWeight(e.target.value)}
                  className="form-input"
                  placeholder="e.g. 65"
                />
              </div>

              <div className="modal-footer flex justify-end gap-2 mt-4 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowWeighInModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save & Update Analytics
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
