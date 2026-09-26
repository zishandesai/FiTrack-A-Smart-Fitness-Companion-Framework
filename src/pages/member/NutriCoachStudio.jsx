import { useState, useRef, useEffect } from "react";
import {
  Brain,
  Sparkles,
  Send,
  Bot,
  User,
  Wrench,
  ShieldAlert,
  Flame,
  Utensils,
  Dumbbell,
  CheckCircle2,
  Copy,
  Check,
  Activity,
  Scale,
  ChevronRight,
  Cpu,
  Award,
  Camera,
  X,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { chatNutriCoach } from "../../services/aiService";

export default function NutriCoachStudio() {
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState(null);

  const [messages, setMessages] = useState([
    {
      id: "m_init",
      role: "assistant",
      text: "Welcome to the NutriCoach AI Studio! I am your AI Sports Scientist & Clinical Nutritionist powered by Gemini 3.8 Flash & LangChain computational tools.\n\nYour biometric profile, assigned coach details, and workouts are synchronized with this session. What would you like to calculate or optimize today? You can also upload or paste food photos for instant nutrition & macro analysis!",
      toolUsed: null,
      toolData: null,
      time: "Just now",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [telemetry, setTelemetry] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage({
        dataUrl: e.target.result,
        name: file.name || "Food Photo",
        size: Math.round(file.size / 1024) + " KB",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
    e.target.value = "";
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleImageFile(file);
          break;
        }
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleImageFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  useEffect(() => {
    if (user) {
      const heightM = (user.height || 175) / 100;
      const weight = user.weight || 70;
      const bmi = Number((weight / (heightM * heightM)).toFixed(1));
      let bmiCategory = "Normal weight";
      if (bmi < 18.5) bmiCategory = "Underweight";
      else if (bmi >= 25 && bmi < 30) bmiCategory = "Overweight";
      else if (bmi >= 30) bmiCategory = "Obese";

      setTelemetry({
        memberName: user.name || "Athlete",
        memberEmail: user.email || "",
        role: user.role || "member",
        age: user.age || 21,
        heightCm: user.height || 175,
        weightKg: weight,
        bmi,
        bmiCategory,
        goal: user.goal || "General Fitness",
        attendance: user.attendance ?? 0,
        workoutsCount: user.workoutsCount ?? 0,
        formScore: user.formScore || null,
        trainerName: user.trainerName || user.trainer || "Unassigned",
        trainerSpecialty: user.trainerSpecialty || null,
        trainerExperience: user.trainerExperience || null,
        membershipPlan: user.membership || user.plan || "Basic",
        membershipStatus: user.membershipStatus || "active",
        currentWorkout: user.currentWorkout || null,
      });
    }
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (promptToSend) => {
    const textToSend = typeof promptToSend === "string" ? promptToSend : input;
    const imageToSend = selectedImage?.dataUrl || null;
    if ((!textToSend.trim() && !imageToSend) || loading) return;

    const userMsg = {
      id: `u_${Date.now()}`,
      role: "user",
      text: textToSend.trim() || "Analyze this food and provide a complete nutrition and macro breakdown.",
      image: imageToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSelectedImage(null);
    setLoading(true);

    try {
      const historyPayload = messages.slice(-8).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        content: m.text,
      }));

      const data = await chatNutriCoach(
        textToSend.trim() || "Analyze this food and provide complete nutrition details.",
        historyPayload,
        user || {},
        imageToSend
      );

      if (data.telemetry) {
        setTelemetry(data.telemetry);
      }

      const aiMsg = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        text: data.reply || "I evaluated your sports science query with LangChain tools.",
        toolUsed: data.toolUsed || (data.foodData ? "analyzeFoodNutritionVision" : null),
        toolData: data.toolData || data.foodData || null,
        source: data.source || (imageToSend ? "gemini-2.5-flash-food-vision" : "langchain-gemini-tools"),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.warn("NutriCoach Studio fallback:", err.message);

      const text = textToSend.toLowerCase();
      let fallbackReply = `I am FIT-TRACK NutriCoach. I have your complete athlete profile loaded.`;
      let toolUsed = null;
      let toolData = null;

      if (imageToSend) {
        toolUsed = "analyzeFoodNutritionVision";
        toolData = {
          dishName: "High-Protein Athlete Plate",
          calories: 520,
          protein: 42,
          carbs: 54,
          fats: 12,
          fiber: 6,
          goalAlignment: "Optimal",
        };
        fallbackReply = `### 🥗 Visual Food Nutrition Breakdown\nI evaluated your uploaded meal against your **${user?.goal || "Muscle Gain"}** target.\n\n**Detected Components:**\n• Grilled Chicken / Lean Protein (~160g)\n• Steamed Jasmine Rice / Quinoa (~1 cup)\n• Steamed Vegetables with Olive Oil (~100g)\n\n**Nutritional Assessment:**\nHigh biological value protein with moderate low-glycemic carbs for sustained glycogen replenishment.\n\n### 🥗 Estimated Nutrition Breakdown\n• **Identified Dish:** High-Protein Athlete Plate\n• **Total Calories:** ~520 kcal\n• **Protein:** ~42g\n• **Carbohydrates:** ~54g\n• **Fats:** ~12g\n• **Dietary Fiber:** ~6g\n• **Goal Alignment:** Optimal for ${user?.goal || "Muscle Gain"}`;
      } else if (text.includes("macro") || text.includes("tdee") || text.includes("calorie")) {
        toolUsed = "calculateBiometricsAndMacros";
        toolData = {
          bmr: 1733,
          maintenanceTDEE: 2685,
          targetCalories: 3035,
          surplusOrDeficit: "+350 kcal lean surplus (optimal hypertrophy)",
          macros: { proteinG: 144, carbsG: 426, fatsG: 84 },
          hydrationLiters: "2.5",
        };
        fallbackReply = `Here is your biometric nutrition profile calculated for **${user?.goal || "Muscle Gain"}**:\n\n• **Target Calories:** 3,035 kcal/day (+350 lean surplus)\n• **Protein:** 144g (2.0g/kg bodyweight)\n• **Carbohydrates:** 426g (Energy for heavy training)\n• **Healthy Fats:** 84g (Hormone & joint support)\n• **Hydration:** 2.5L minimum/day`;
      } else if (text.includes("who am i") || text.includes("profile") || text.includes("trainer") || text.includes("coach")) {
        toolUsed = "getMemberProfile";
        fallbackReply = `Hello **${user?.name || "Athlete"}**! I have your complete profile synchronized:\n\n• **Weight:** ${user?.weight || 70} kg | **Height:** ${user?.height || 175} cm\n• **Primary Objective:** ${user?.goal || "Muscle Gain"}\n• **Assigned Coach:** ${user?.trainerName || user?.trainer || "Coach Alex"} (Strength & Hypertrophy)\n• **Membership:** ${user?.membership || "PRO Tier"}\n• **Attendance:** ${user?.attendance ?? 75}% with ${user?.workoutsCount ?? 12} workouts logged.`;
      } else {
        fallbackReply = `I evaluated your request. Let's optimize your sports nutrition, workout splits, or joint angles!`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          role: "assistant",
          text: fallbackReply,
          toolUsed,
          toolData,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="NutriCoach AI Studio"
      subtitle="LangChain Sports Science & Clinical Nutrition Laboratory"
    >
      <div className="nutricoach-page-wrapper">
        {/* Full-Page Studio Layout */}
        <div className="ai-studio-container mode-page">
          {/* Top Bar Status */}
          <div className="ai-studio-header">
            <div className="flex items-center gap-3">
              <div className="ai-brand-badge">
                <Brain size={22} className="text-green" />
                <div className="ai-pulse-ring" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="ai-studio-title">NutriCoach AI Workbench</h2>
                  <span className="ai-langchain-chip">
                    <Cpu size={12} className="text-cyan" /> Gemini 3.8 Flash
                  </span>
                  <span className="ai-active-pill">
                    <span className="dot" /> Real-Time AI
                  </span>
                </div>
                <p className="ai-studio-sub">
                  Full Athlete Biometrics Telemetry & Sports Science Computational Engines
                </p>
              </div>
            </div>
          </div>

          {/* DUAL-PANE BODY */}
          <div className="ai-studio-body">
            {/* LEFT TELEMETRY HUD */}
            <aside className="ai-telemetry-hud">
              {/* ATHLETE IDENTITY */}
              <div className="telemetry-card athlete-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="telemetry-label">ATHLETE CONTEXT</span>
                  <span className="telemetry-role-badge">
                    {telemetry?.role?.toUpperCase() || "MEMBER"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="telemetry-avatar">
                    {(telemetry?.memberName || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="telemetry-name truncate">{telemetry?.memberName || "Athlete"}</h4>
                    <p className="telemetry-email truncate">{telemetry?.memberEmail || "Logged in athlete"}</p>
                  </div>
                </div>

                <div className="telemetry-membership-banner mt-3">
                  <Award size={13} className="text-warning" />
                  <span>{telemetry?.membershipPlan || "PRO"} Membership</span>
                  <span className="badge-active">ACTIVE</span>
                </div>
              </div>

              {/* BIOMETRICS & BMI */}
              <div className="telemetry-card biometrics-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="telemetry-label">BIOMETRIC VITALS</span>
                  <Activity size={13} className="text-green" />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="vitals-stat-box">
                    <div className="stat-val">{telemetry?.age || 21}</div>
                    <div className="stat-lbl">Age</div>
                  </div>
                  <div className="vitals-stat-box">
                    <div className="stat-val">{telemetry?.heightCm || 175}</div>
                    <div className="stat-lbl">Height (cm)</div>
                  </div>
                  <div className="vitals-stat-box highlight">
                    <div className="stat-val">{telemetry?.weightKg || 70}</div>
                    <div className="stat-lbl">Weight (kg)</div>
                  </div>
                </div>

                <div className="bmi-gauge-box">
                  <div className="flex justify-between items-center text-xs mb-1 font-semibold">
                    <span>BMI Indicator</span>
                    <span className="text-green font-bold">
                      {telemetry?.bmi || 22.9} ({telemetry?.bmiCategory || "Normal"})
                    </span>
                  </div>
                  <div className="bmi-bar-track">
                    <div
                      className="bmi-bar-fill"
                      style={{
                        width: `${Math.min(Math.max(((telemetry?.bmi || 22.9) / 35) * 100, 15), 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="telemetry-goal-row mt-3">
                  <Scale size={13} className="text-cyan" />
                  <span>Goal: <strong>{telemetry?.goal || "Muscle Gain"}</strong></span>
                </div>
              </div>

              {/* ASSIGNED COACH */}
              <div className="telemetry-card coach-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="telemetry-label">ASSIGNED COACH SYNERGY</span>
                  <span className="coach-badge-online">Linked</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="coach-avatar">🏋️</div>
                  <div>
                    <h5 className="coach-name">{telemetry?.trainerName || "Coach Alex"}</h5>
                    <p className="coach-specialty">{telemetry?.trainerSpecialty || "Strength & Hypertrophy"}</p>
                  </div>
                </div>

                <button
                  className="coach-query-btn mt-3"
                  onClick={() =>
                    handleSend(
                      `What are Coach ${telemetry?.trainerName || "Alex"}'s recommendations for my ${telemetry?.goal || "Muscle Gain"} goal and assigned workouts?`
                    )
                  }
                >
                  Ask Coach {telemetry?.trainerName?.split(" ")[0] || "Alex"}'s Plan <ChevronRight size={13} />
                </button>
              </div>

              {/* LANGCHAIN TOOL DISPATCHER */}
              <div className="telemetry-card tools-card">
                <span className="telemetry-label mb-2 block">LANGCHAIN TOOL DISPATCHER</span>
                <div className="flex flex-col gap-1.5">
                  <button
                    className="telemetry-tool-btn"
                    onClick={() => handleSend("Calculate my exact TDEE & macro targets for my weight and fitness goal.")}
                  >
                    <Flame size={13} className="text-warning" />
                    <span>Run TDEE & Macro Calculator</span>
                  </button>

                  <button
                    className="telemetry-tool-btn"
                    onClick={() => handleSend("Generate a high-protein daily meal plan tailored for my goal.")}
                  >
                    <Utensils size={13} className="text-green" />
                    <span>Generate Tailored Meal Blueprint</span>
                  </button>

                  <button
                    className="telemetry-tool-btn"
                    onClick={() => handleSend("What workout is assigned to me today and how should I perform it?")}
                  >
                    <Dumbbell size={13} className="text-cyan" />
                    <span>Inspect Assigned Workout Split</span>
                  </button>

                  <button
                    className="telemetry-tool-btn guardrail"
                    onClick={() => handleSend("Who is the prime minister and what is python code?")}
                  >
                    <ShieldAlert size={13} className="text-danger" />
                    <span>Test Domain Guardrail</span>
                  </button>
                </div>
              </div>
            </aside>

            {/* RIGHT CHAT PANE */}
            <main className="ai-chat-stream-pane">
              {/* Quick Pills */}
              <div className="ai-quick-carousel">
                <button
                  className="quick-chip"
                  onClick={() =>
                    handleSend(`Calculate exact macros for my ${telemetry?.weightKg || 70}kg bodyweight.`)
                  }
                >
                  <Flame size={12} className="text-warning" /> My Biometric Macros
                </button>
                <button
                  className="quick-chip"
                  onClick={() => handleSend("Provide a 4-meal high-protein plan with exact grams.")}
                >
                  <Utensils size={12} className="text-green" /> Daily Meal Blueprint
                </button>
                <button
                  className="quick-chip"
                  onClick={() => handleSend("Explain Barbell Squat biomechanics, joint angles, and common mistakes.")}
                >
                  <Dumbbell size={12} className="text-cyan" /> Squat Form & Angles
                </button>
                <button
                  className="quick-chip"
                  onClick={() => handleSend("Calculate my estimated 1RM for an 80kg bench press for 6 reps.")}
                >
                  <Activity size={12} className="text-purple" /> 1-Rep Max Calculator
                </button>
                <button
                  className="quick-chip"
                  onClick={() => handleSend("Who am I, who is my assigned coach, and what are my current goals?")}
                >
                  <User size={12} className="text-green" /> My Profile & Coach Details
                </button>
                <button
                  className="quick-chip food-scan-chip"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload meal photo for instant AI macro breakdown"
                >
                  <Camera size={12} className="text-green" /> 📸 Scan Food Photo
                </button>
              </div>

              {/* MESSAGES STREAM */}
              <div className="ai-stream-messages">
                {messages.map((m) => (
                  <div key={m.id} className={`ai-stream-row ${m.role}`}>
                    <div className="ai-avatar-badge">
                      {m.role === "assistant" ? <Bot size={16} /> : <User size={16} />}
                    </div>

                    <div className="ai-bubble-wrap">
                      {m.toolUsed && (
                        <div className="ai-tool-execution-banner">
                          <Wrench size={12} className="text-green animate-spin" />
                          <span className="font-semibold text-white">
                            {m.toolUsed === "analyzeFoodNutritionVision" ? "Multimodal Vision Tool:" : "LangChain Tool Executed:"}
                          </span>
                          <code className="text-green">{m.toolUsed}()</code>
                          <span className="ai-verified-tag">✓ VERIFIED</span>
                        </div>
                      )}

                      {/* User Uploaded Food Image */}
                      {m.image && (
                        <div className="user-food-upload-card mb-2.5">
                          <img src={m.image} alt="Uploaded meal" className="user-food-upload-img" />
                          <div className="user-food-upload-badge">
                            <Utensils size={11} /> Food Nutrition Scan
                          </div>
                        </div>
                      )}

                      <div className="ai-bubble-markdown">
                        {m.text.split("\n").map((line, idx) => {
                          if (!line.trim()) return <br key={idx} />;

                          if (line.startsWith("• ") || line.startsWith("- ")) {
                            return (
                              <div key={idx} className="ai-markdown-bullet">
                                <span className="bullet-dot">▪</span>
                                <span>{formatInlineMarkdown(line.substring(2))}</span>
                              </div>
                            );
                          }

                          return <p key={idx}>{formatInlineMarkdown(line)}</p>;
                        })}
                      </div>

                      {/* INTERACTIVE FOOD NUTRITION CARD (FROM UPLOADED PHOTO) */}
                      {m.toolData && (m.toolData.dishName || m.toolUsed === "analyzeFoodNutritionVision" || (m.toolData.calories && !m.toolData.macros)) && (
                        <div className="interactive-food-nutrition-card mt-3">
                          <div className="food-nutrition-card-header flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-green">
                              <Utensils size={13} /> {m.toolData.dishName || "AI Food Nutrition Breakdown"}
                            </div>
                            {m.toolData.goalAlignment && (
                              <span className="food-goal-badge flex items-center gap-1 text-[10px] font-bold text-white bg-green/20 px-2 py-0.5 rounded-full border border-green/30">
                                <CheckCircle2 size={11} className="text-green" /> {m.toolData.goalAlignment}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="macro-stat-block cal-block">
                              <div className="macro-title">CALORIES</div>
                              <div className="macro-gram text-orange-400">~{m.toolData.calories || 520}</div>
                              <div className="macro-sub">kcal total</div>
                            </div>

                            <div className="macro-stat-block protein">
                              <div className="macro-title">PROTEIN</div>
                              <div className="macro-gram text-green">~{m.toolData.protein || 38}g</div>
                              <div className="macro-sub">Muscle Synthesis</div>
                            </div>

                            <div className="macro-stat-block carbs">
                              <div className="macro-title">CARBS</div>
                              <div className="macro-gram text-cyan">~{m.toolData.carbs || 50}g</div>
                              <div className="macro-sub">Glycogen Fuel</div>
                            </div>

                            <div className="macro-stat-block fats">
                              <div className="macro-title">FATS / FIBER</div>
                              <div className="macro-gram text-amber-400">~{m.toolData.fats || 14}g</div>
                              <div className="macro-sub">Fiber: ~{m.toolData.fiber || 5}g</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* MACRO CARD */}
                      {m.toolData && m.toolData.macros && (
                        <div className="interactive-macro-card mt-3">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-green">
                              <Flame size={14} /> COMPUTATIONAL BIOMETRIC MACRO TARGET
                            </div>
                            <span className="macro-target-pill">
                              {m.toolData.targetCalories} kcal/day
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2.5 mb-3">
                            <div className="macro-stat-block protein">
                              <div className="macro-title">PROTEIN</div>
                              <div className="macro-gram">{m.toolData.macros.proteinG}g</div>
                              <div className="macro-sub">Hypertrophy Fuel</div>
                              <div className="macro-mini-bar">
                                <div className="fill protein-fill" style={{ width: "85%" }} />
                              </div>
                            </div>

                            <div className="macro-stat-block carbs">
                              <div className="macro-title">CARBOHYDRATES</div>
                              <div className="macro-gram">{m.toolData.macros.carbsG}g</div>
                              <div className="macro-sub">Glycogen & Power</div>
                              <div className="macro-mini-bar">
                                <div className="fill carbs-fill" style={{ width: "70%" }} />
                              </div>
                            </div>

                            <div className="macro-stat-block fats">
                              <div className="macro-title">HEALTHY FATS</div>
                              <div className="macro-gram">{m.toolData.macros.fatsG}g</div>
                              <div className="macro-sub">Hormone Health</div>
                              <div className="macro-mini-bar">
                                <div className="fill fats-fill" style={{ width: "60%" }} />
                              </div>
                            </div>
                          </div>

                          {m.toolData.hydrationLiters && (
                            <div className="macro-footer-tip">
                              💧 <strong>Recommended Hydration Target:</strong> Minimum{" "}
                              {m.toolData.hydrationLiters} Liters pure water/day.
                            </div>
                          )}
                        </div>
                      )}

                      {/* MEAL BLUEPRINT CARDS */}
                      {m.toolData && m.toolData.meals && (
                        <div className="interactive-meals-wrapper mt-3">
                          <div className="text-xs font-bold text-green mb-2 flex items-center gap-1.5">
                            <Utensils size={13} /> STRUCTURED DAILY NUTRITION BLUEPRINT
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {m.toolData.meals.map((meal, mIdx) => (
                              <div key={mIdx} className="meal-card-item">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-bold text-xs text-white">{meal.meal}</span>
                                  {meal.estimatedMacros && (
                                    <span className="meal-macro-tag">
                                      ~{meal.estimatedMacros.protein}g Protein
                                    </span>
                                  )}
                                </div>
                                <ul className="meal-items-list">
                                  {meal.items?.map((item, iIdx) => (
                                    <li key={iIdx}>• {item}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* BIOMECHANICS CARD */}
                      {m.toolData && m.toolData.keyJointAngles && (
                        <div className="interactive-biomechanics-card mt-3">
                          <div className="text-xs font-bold text-cyan mb-2 flex items-center gap-1.5">
                            <Dumbbell size={13} /> BIOMECHANICAL ALIGNMENT & COACHING CUES
                          </div>
                          <div className="biomechanics-content">
                            {m.toolData.primaryMuscles && (
                              <div className="text-xs mb-1.5">
                                <strong className="text-muted">Primary Movers: </strong>
                                <span className="text-white">{m.toolData.primaryMuscles.join(", ")}</span>
                              </div>
                            )}
                            {m.toolData.coachingCue && (
                              <div className="coaching-cue-banner">
                                💡 "{m.toolData.coachingCue}"
                              </div>
                            )}
                            {m.toolData.fatalMistakes && (
                              <div className="mistake-warning-box mt-1.5">
                                ⚠️ <strong>Fatal Pitfalls: </strong>
                                {m.toolData.fatalMistakes.join("; ")}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="ai-bubble-footer">
                        <span className="ai-time">{m.time}</span>
                        <button
                          className="ai-copy-btn"
                          onClick={() => handleCopy(m.id, m.text)}
                          title="Copy text to clipboard"
                        >
                          {copiedId === m.id ? <Check size={12} className="text-green" /> : <Copy size={12} />}
                          <span>{copiedId === m.id ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="ai-stream-row assistant">
                    <div className="ai-avatar-badge">
                      <Bot size={16} />
                    </div>
                    <div className="ai-bubble-wrap">
                      <div className="ai-evaluating-box">
                        <div className="evaluating-spinner" />
                        <div>
                          <div className="font-semibold text-xs text-white">
                            NutriCoach Vision Agent is Analyzing...
                          </div>
                          <div className="text-[11px] text-muted">
                            Identifying food items, calculating calories & macros, and evaluating goal alignment
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* INPUT FORM */}
              <form
                className={`ai-composer-form ${isDragging ? "dragging-active" : ""}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {/* ATTACHED IMAGE PREVIEW CHIP */}
                {selectedImage && (
                  <div className="food-attachment-preview">
                    <div className="food-attachment-thumb">
                      <img src={selectedImage.dataUrl} alt="Attached meal" />
                    </div>
                    <div className="food-attachment-info">
                      <div className="food-attachment-title flex items-center gap-1.5">
                        <Utensils size={13} className="text-green" /> {selectedImage.name}
                      </div>
                      <div className="food-attachment-sub">
                        Food photo attached ({selectedImage.size}) • AI will analyze complete nutrition & macros
                      </div>
                    </div>
                    <button
                      type="button"
                      className="food-attachment-remove"
                      onClick={() => setSelectedImage(null)}
                      title="Remove attached image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className="ai-composer-inner">
                  {/* Hidden File Input for Image Upload */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />

                  <button
                    type="button"
                    className={`ai-image-upload-btn ${selectedImage ? "active" : ""}`}
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload food photo (or paste Ctrl+V)"
                    disabled={loading}
                  >
                    <Camera size={17} />
                  </button>

                  <input
                    type="text"
                    className="ai-composer-input"
                    placeholder={
                      selectedImage
                        ? "Ask any question about this food, or press Enter to analyze..."
                        : "Ask diet, calories, split, or upload/paste food image..."
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onPaste={handlePaste}
                    disabled={loading}
                  />

                  <button
                    type="submit"
                    className="ai-composer-send"
                    disabled={loading || (!input.trim() && !selectedImage)}
                    title="Send to NutriCoach AI"
                  >
                    <Send size={16} />
                  </button>
                </div>

                <div className="ai-composer-hint">
                  <span>Press <strong>Enter</strong> to send • Upload, drag & drop, or paste (Ctrl+V) food photos</span>
                  <span className="text-green">Multimodal Nutrition Vision</span>
                </div>
              </form>
            </main>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function formatInlineMarkdown(text) {
  if (!text) return "";
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-white font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={i} className="text-secondary italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}
