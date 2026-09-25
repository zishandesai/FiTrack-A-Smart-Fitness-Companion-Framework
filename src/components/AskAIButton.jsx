import { Sparkles, Brain } from "lucide-react";

export default function AskAIButton({
  prompt = "",
  label = "Ask AI Coach",
  size = "sm",
  variant = "pill",
  className = "",
}) {
  const handleClick = (e) => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("fittrack:open-ai-chat", {
        detail: { prompt },
      })
    );
  };

  return (
    <button
      type="button"
      className={`ask-ai-trigger-btn ${size} ${variant} ${className}`}
      onClick={handleClick}
      title={prompt ? `Ask AI: "${prompt}"` : "Consult FIT-TRACK NutriCoach AI"}
    >
      <Brain size={size === "xs" ? 11 : size === "sm" ? 13 : 15} className="ai-icon-pulse" />
      <span>{label}</span>
      <Sparkles size={size === "xs" ? 10 : 11} className="ai-sparkle-icon" />
    </button>
  );
}
