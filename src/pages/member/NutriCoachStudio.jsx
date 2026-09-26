import { useState, useRef, useEffect } from "react";
import {
  Brain,
  Sparkles,
  Send,
  Bot,
  User,
  Wrench,
  Flame,
  Utensils,
  Dumbbell,
  CheckCircle2,
  Copy,
  Check,
  Activity,
  Scale,
  Cpu,
  Award,
  Camera,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { chatNutriCoach } from "../../services/aiService";

export default function NutriCoachStudio() {
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState(null);
  const [showVitalsBar, setShowVitalsBar] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: "m_init",
      role: "assistant",
      text: "Welcome to NutriCoach AI! I am your AI Sports Scientist & Clinical Nutritionist powered by Gemini 3.8 Flash.\n\nAsk me anything about your sports nutrition, calorie targets, macro splits, high-protein meal plans, recovery protocols, or exercise biomechanics. You can also upload food photos for instant nutrition analysis.",
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
        membershipPlan: user.membership || user.plan || "Basic",
        membershipStatus: user.membershipStatus || "active",
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

      const aiMsg = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        text: data.reply || "Response generated.",
        toolUsed: data.toolUsed || (data.foodData ? "analyzeFoodNutritionVision" : null),
        toolData: data.toolData || data.foodData || null,
        source: data.source || "gemini-3.8-flash",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("NutriCoach Studio error:", err);
      const errorMsg = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        text: `⚠️ **Unable to receive response from NutriCoach AI.**\n\n*Server message:* ${err?.response?.data?.message || err.message || "Please check your network and try again."}`,
        toolUsed: null,
        toolData: null,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="NutriCoach AI Studio"
      subtitle="Full-Screen Sports Science & Clinical Nutrition Laboratory"
    >
      <div className="nutricoach-page-wrapper">
        <div className="ai-studio-container mode-full-width">
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
                    <span className="dot" /> Real-Time Live AI
                  </span>
                </div>
                <p className="ai-studio-sub">
                  Sports Science, Macronutrient Computations & Food Vision
                </p>
              </div>
            </div>

            {/* Toggle Telemetry Context Vitals on Desktop */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowVitalsBar((prev) => !prev)}
                className="btn btn-sm btn-ghost flex items-center gap-1.5 text-xs text-muted hover:text-white"
                title="Toggle Athlete Context Telemetry"
              >
                <Activity size={14} className="text-green" />
                <span>{showVitalsBar ? "Hide Vitals" : "Athlete Vitals"}</span>
                {showVitalsBar ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>
          </div>

          {/* COLLAPSIBLE TOP VITALS BAR */}
          {showVitalsBar && (
            <div className="ai-vitals-dock-bar">
              <div className="flex items-center gap-4 flex-wrap text-xs">
                <div className="vitals-dock-item">
                  <span className="text-muted">Athlete:</span>
                  <strong className="text-white ml-1">{telemetry?.memberName || "Athlete"}</strong>
                </div>
                <div className="vitals-dock-item">
                  <span className="text-muted">Weight:</span>
                  <strong className="text-green ml-1">{telemetry?.weightKg || 70} kg</strong>
                </div>
                <div className="vitals-dock-item">
                  <span className="text-muted">Height:</span>
                  <strong className="text-white ml-1">{telemetry?.heightCm || 175} cm</strong>
                </div>
                <div className="vitals-dock-item">
                  <span className="text-muted">BMI:</span>
                  <strong className="text-cyan ml-1">{telemetry?.bmi || 22.9} ({telemetry?.bmiCategory || "Normal"})</strong>
                </div>
                <div className="vitals-dock-item">
                  <span className="text-muted">Goal:</span>
                  <strong className="text-warning ml-1">{telemetry?.goal || "General Fitness"}</strong>
                </div>
                <div className="vitals-dock-item">
                  <span className="text-muted">Coach:</span>
                  <strong className="text-white ml-1">{telemetry?.trainerName || "Assigned Coach"}</strong>
                </div>
              </div>
            </div>
          )}

          {/* FULL-LENGTH CHAT STREAM PANE */}
          <main className="ai-chat-stream-pane full-length">
            {/* Top Quick Action Carousel */}
            <div className="ai-quick-carousel">
              <button
                className="quick-chip"
                onClick={() => handleSend(`Calculate my exact TDEE and macro split for ${telemetry?.weightKg || 70}kg bodyweight.`)}
              >
                <Flame size={12} className="text-warning" /> Macro & TDEE Split
              </button>
              <button
                className="quick-chip"
                onClick={() => handleSend("Provide a 4-meal high-protein daily plan with exact grams.")}
              >
                <Utensils size={12} className="text-green" /> High-Protein Meal Plan
              </button>
              <button
                className="quick-chip"
                onClick={() => handleSend("Explain Barbell Squat biomechanics, joint angles, and common pitfalls.")}
              >
                <Dumbbell size={12} className="text-cyan" /> Squat Form & Angles
              </button>
              <button
                className="quick-chip"
                onClick={() => handleSend("What are the top 10 fruits for weight loss and their metabolic impact?")}
              >
                <Scale size={12} className="text-purple" /> Top 10 Weight Loss Fruits
              </button>
              <button
                className="quick-chip food-scan-chip"
                onClick={() => fileInputRef.current?.click()}
                title="Upload food photo for instant AI macro breakdown"
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
                        <Wrench size={12} className="text-green" />
                        <span className="font-semibold text-white">
                          {m.toolUsed === "analyzeFoodNutritionVision" ? "Multimodal Vision Analysis:" : "Computational Tool:"}
                        </span>
                        <code className="text-green">{m.toolUsed}()</code>
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

                    {/* Message Body with Markdown */}
                    <div className="ai-message-content">
                      {m.text.split("\n").map((line, idx) => {
                        if (line.startsWith("### ")) {
                          return (
                            <h4 key={idx} className="ai-heading-3">
                              {line.replace("### ", "")}
                            </h4>
                          );
                        }
                        if (line.startsWith("## ")) {
                          return (
                            <h3 key={idx} className="ai-heading-2">
                              {line.replace("## ", "")}
                            </h3>
                          );
                        }
                        if (line.startsWith("• ") || line.startsWith("- ")) {
                          return (
                            <div key={idx} className="ai-bullet-item">
                              <span className="bullet-dot">•</span>
                              <span>{formatInlineMarkdown(line.replace(/^[•-]\s*/, ""))}</span>
                            </div>
                          );
                        }
                        if (line.trim() === "") {
                          return <div key={idx} className="ai-para-spacer" />;
                        }
                        return (
                          <p key={idx} className="ai-para">
                            {formatInlineMarkdown(line)}
                          </p>
                        );
                      })}
                    </div>

                    {/* Food Nutrition Breakdown Card */}
                    {m.toolData && m.toolData.calories && (
                      <div className="ai-food-breakdown-card mt-3">
                        <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                            <Utensils size={13} className="text-green" />
                            <span>{m.toolData.dishName || "Nutritional Breakdown"}</span>
                          </div>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-green/15 text-green font-semibold">
                            {m.toolData.goalAlignment || "Optimal"}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                            <div className="text-sm font-extrabold text-white">{m.toolData.calories}</div>
                            <div className="text-[10px] text-muted">Calories (kcal)</div>
                          </div>
                          <div className="p-2 rounded-lg bg-black/40 border border-green/20">
                            <div className="text-sm font-extrabold text-green">{m.toolData.protein}g</div>
                            <div className="text-[10px] text-muted">Protein</div>
                          </div>
                          <div className="p-2 rounded-lg bg-black/40 border border-cyan/20">
                            <div className="text-sm font-extrabold text-cyan">{m.toolData.carbs}g</div>
                            <div className="text-[10px] text-muted">Carbs</div>
                          </div>
                          <div className="p-2 rounded-lg bg-black/40 border border-warning/20">
                            <div className="text-sm font-extrabold text-warning">{m.toolData.fats}g</div>
                            <div className="text-[10px] text-muted">Fats</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Footer */}
                    <div className="ai-bubble-footer">
                      <span className="ai-bubble-time">{m.time}</span>
                      <button
                        className="ai-copy-btn"
                        onClick={() => handleCopy(m.id, m.text)}
                        title="Copy text"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check size={12} className="text-green" />
                            <span className="text-green">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="ai-stream-row assistant loading">
                  <div className="ai-avatar-badge">
                    <Bot size={16} className="animate-spin text-green" />
                  </div>
                  <div className="ai-bubble-wrap ai-loading-bubble">
                    <div className="ai-thinking-indicator">
                      <span className="dot-pulse" />
                      <span className="dot-pulse" />
                      <span className="dot-pulse" />
                    </div>
                    <span className="ai-thinking-text">Gemini 3.8 Flash is analyzing sports science data...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* MOBILE DOWNSIDE BAR (Quick Tool Access for Mobile Thumbs) */}
            <div className="ai-mobile-downside-bar">
              <button
                type="button"
                className="mobile-down-btn"
                onClick={() => handleSend("Calculate my exact macros & TDEE.")}
              >
                <Flame size={14} className="text-warning" />
                <span>Macros</span>
              </button>
              <button
                type="button"
                className="mobile-down-btn"
                onClick={() => handleSend("Generate a high-protein daily meal plan.")}
              >
                <Utensils size={14} className="text-green" />
                <span>Meal Plan</span>
              </button>
              <button
                type="button"
                className="mobile-down-btn"
                onClick={() => handleSend("What are the top 10 foods for muscle recovery and fat loss?")}
              >
                <Scale size={14} className="text-cyan" />
                <span>Foods</span>
              </button>
              <button
                type="button"
                className="mobile-down-btn"
                onClick={() => handleSend("Explain Barbell Squat form and joint safety.")}
              >
                <Dumbbell size={14} className="text-purple" />
                <span>Form</span>
              </button>
              <button
                type="button"
                className="mobile-down-btn highlight"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={14} className="text-green" />
                <span>Scan Food</span>
              </button>
            </div>

            {/* MESSAGE COMPOSER */}
            <form
              className={`ai-composer-form ${isDragging ? "dragging" : ""}`}
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />

              {/* Selected Image Preview Pill */}
              {selectedImage && (
                <div className="ai-img-preview-pill">
                  <img src={selectedImage.dataUrl} alt="Preview" className="pill-img" />
                  <span className="pill-name">{selectedImage.name}</span>
                  <span className="pill-size">({selectedImage.size})</span>
                  <button
                    type="button"
                    className="pill-remove-btn"
                    onClick={() => setSelectedImage(null)}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              <div className="ai-composer-row">
                <button
                  type="button"
                  className="ai-photo-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload meal photo for instant nutrition analysis"
                >
                  <Camera size={18} />
                </button>

                <input
                  type="text"
                  placeholder="Ask diet, calories, macros, workout split, or paste (Ctrl+V) food photos..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPaste={handlePaste}
                  className="ai-composer-input"
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
                <span className="text-green">Live Gemini 3.8 Flash Vision</span>
              </div>
            </form>
          </main>
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
