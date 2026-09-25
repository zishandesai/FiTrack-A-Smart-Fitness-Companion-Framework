import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  CameraOff,
  Play,
  Square,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Brain,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Award,
  Flame,
  Dumbbell,
  X,
  Search,
  Maximize2,
  Minimize2,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { generateSetSummary } from "../../services/aiService";
import {
  recordMemberAISession,
  saveMemberAISetSummary,
} from "../../services/mockData";

// ================================================================
//  LANDMARK INDEX MAP (Google MediaPipe Pose 33-Point Model)
// ================================================================
const L = {
  NOSE: 0,
  L_EYE_IN: 1,
  L_EYE: 2,
  L_EYE_OUT: 3,
  R_EYE_IN: 4,
  R_EYE: 5,
  R_EYE_OUT: 6,
  L_EAR: 7,
  R_EAR: 8,
  L_MOUTH: 9,
  R_MOUTH: 10,
  L_SHOULDER: 11,
  R_SHOULDER: 12,
  L_ELBOW: 13,
  R_ELBOW: 14,
  L_WRIST: 15,
  R_WRIST: 16,
  L_PINKY: 17,
  R_PINKY: 18,
  L_INDEX: 19,
  R_INDEX: 20,
  L_THUMB: 21,
  R_THUMB: 22,
  L_HIP: 23,
  R_HIP: 24,
  L_KNEE: 25,
  R_KNEE: 26,
  L_ANKLE: 27,
  R_ANKLE: 28,
  L_HEEL: 29,
  R_HEEL: 30,
  L_FOOT: 31,
  R_FOOT: 32,
};

// ================================================================
//  BIOMECHANICAL & FILTER CONSTANTS
// ================================================================
const MIN_LANDMARK_VISIBILITY = 0.65; // Minimum confidence score required per landmark
const EMA_ALPHA = 0.35; // Tunable Exponential Moving Average smoothing factor for derived angles (0.1 = heavy smoothing/lag, 0.9 = fast/raw)
const HYSTERESIS_BUFFER_DEG = 6; // Hysteresis threshold buffer (in degrees) to prevent boundary flapping
const STATE_HOLD_CONSECUTIVE_FRAMES = 3; // Minimum consecutive frames required to confirm FSM phase transition
const POSITIONING_STABILITY_FRAMES = 30; // Frames (~1s at 30fps) of clean posture required to lock calibration

// Exercise-specific Camera Positioning & View Guidance
const EXERCISE_POSITIONING_GUIDES = {
  squat: {
    recommendedView: "Side-On (Profile View)",
    icon: "📐",
    cue: "Stand sideways (profile view) ~6-8 feet away so your full body (shoulder to ankle) is visible.",
    keyLandmarks: [L.R_SHOULDER, L.R_HIP, L.R_KNEE, L.R_ANKLE, L.L_SHOULDER, L.L_HIP, L.L_KNEE, L.L_ANKLE],
    requireEitherSide: true,
  },
  deadlift: {
    recommendedView: "Side-On (Profile View)",
    icon: "📐",
    cue: "Turn sideways to camera ~6-8 feet back to capture spine angle and hip hinge depth.",
    keyLandmarks: [L.R_SHOULDER, L.R_HIP, L.R_KNEE, L.R_ANKLE, L.L_SHOULDER, L.L_HIP, L.L_KNEE, L.L_ANKLE],
    requireEitherSide: true,
  },
  lunge: {
    recommendedView: "Side-On (Profile View)",
    icon: "📐",
    cue: "Turn sideways to camera so knee travel and shin verticality can be tracked.",
    keyLandmarks: [L.R_HIP, L.R_KNEE, L.R_ANKLE, L.L_HIP, L.L_KNEE, L.L_ANKLE],
    requireEitherSide: true,
  },
  bicep_curl: {
    recommendedView: "Front-On View",
    icon: "🧍",
    cue: "Face camera ~5-6 feet away with shoulders, elbows, and wrists clearly inside the frame.",
    keyLandmarks: [L.R_SHOULDER, L.R_ELBOW, L.R_WRIST, L.L_SHOULDER, L.L_ELBOW, L.L_WRIST],
    requireEitherSide: false,
  },
  pushup: {
    recommendedView: "Side-On (Profile View)",
    icon: "📐",
    cue: "Position camera at low/floor level sideways to capture full horizontal plank posture.",
    keyLandmarks: [L.R_SHOULDER, L.R_ELBOW, L.R_WRIST, L.R_HIP, L.R_ANKLE],
    requireEitherSide: true,
  },
  shoulder_press: {
    recommendedView: "Front or 45° Angle",
    icon: "🧍",
    cue: "Face camera with full upper body and complete overhead lockout clearance visible.",
    keyLandmarks: [L.R_SHOULDER, L.R_ELBOW, L.R_WRIST, L.L_SHOULDER, L.L_ELBOW, L.L_WRIST],
    requireEitherSide: false,
  },
  lateral_raise: {
    recommendedView: "Front-On View",
    icon: "🧍",
    cue: "Stand facing camera with enough lateral clearance to raise both arms horizontally.",
    keyLandmarks: [L.R_SHOULDER, L.R_ELBOW, L.R_WRIST, L.L_SHOULDER, L.L_ELBOW, L.L_WRIST],
    requireEitherSide: false,
  },
};

// Popular Quick Suggestion Exercises
const QUICK_SUGGESTIONS = [
  "Squat",
  "Bicep Curl",
  "Push-up",
  "Shoulder Press",
  "Lateral Raise",
  "Deadlift",
  "Lunge",
];

// Helper to determine exercise category from arbitrary user input
const resolveExerciseType = (input) => {
  const lower = (input || "").toLowerCase().trim();
  if (lower.includes("curl") || lower.includes("bicep") || lower.includes("arm")) return "bicep_curl";
  if (lower.includes("squat") || lower.includes("leg press") || lower.includes("quad")) return "squat";
  if (lower.includes("pushup") || lower.includes("push-up") || lower.includes("push up") || lower.includes("chest press") || lower.includes("bench")) return "pushup";
  if (lower.includes("shoulder") || lower.includes("overhead") || lower.includes("military")) return "shoulder_press";
  if (lower.includes("lateral") || lower.includes("side raise") || lower.includes("delt")) return "lateral_raise";
  if (lower.includes("deadlift") || lower.includes("rdl") || lower.includes("hip hinge")) return "deadlift";
  if (lower.includes("lunge") || lower.includes("split squat") || lower.includes("step")) return "lunge";
  return "squat";
};

// Exponential Moving Average (EMA) Angle Filter
const applyAngleEMA = (currentAngle, prevAngle, alpha = EMA_ALPHA) => {
  if (currentAngle === null || currentAngle === undefined) return prevAngle ?? null;
  if (prevAngle === null || prevAngle === undefined) return currentAngle;
  return prevAngle + alpha * (currentAngle - prevAngle);
};

// Angle calculation helper between three 2D landmarks (with vertex at b)
const calcAngle = (a, b, c) => {
  if (!a || !b || !c) return null;
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360.0 - angle;
  return angle;
};

// Verified Angle Calculator with per-landmark visibility score enforcement
const calcAngleWithVisibility = (a, b, c, minVis = MIN_LANDMARK_VISIBILITY) => {
  if (!a || !b || !c) {
    return { angle: null, isValid: false, minVis: 0 };
  }
  const visA = a.visibility ?? 1.0;
  const visB = b.visibility ?? 1.0;
  const visC = c.visibility ?? 1.0;
  const minVisFound = Math.min(visA, visB, visC);

  if (minVisFound < minVis) {
    return { angle: null, isValid: false, minVis: minVisFound };
  }

  const rawAngle = calcAngle(a, b, c);
  return { angle: rawAngle, isValid: true, minVis: minVisFound };
};

export default function AIFormCoach() {
  const { user } = useAuth();
  const athleteKey = user?.name || user?.email || "Athlete";

  // State Management
  const [exerciseInput, setExerciseInput] = useState("Squats");
  const [isCameraRunning, setIsCameraRunning] = useState(false);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Positioning & Confidence State
  const [isTrackingConfidenceLow, setIsTrackingConfidenceLow] = useState(false);
  const [positioningLockPercent, setPositioningLockPercent] = useState(0);
  const [isPositionLocked, setIsPositionLocked] = useState(false);
  const [positioningFeedback, setPositioningFeedback] = useState({
    ready: false,
    recommendedView: "Side-On (Profile View)",
    icon: "📐",
    cue: "Step into camera frame",
    missing: null,
  });

  // Live Metrics State
  const [reps, setReps] = useState(0);
  const [goodReps, setGoodReps] = useState(0);
  const [badReps, setBadReps] = useState(0);
  const [setsCount, setSetsCount] = useState(0);
  const [formScore, setFormScore] = useState(100);
  const [movementPhase, setMovementPhase] = useState("READY IN POSITION");
  const [currentRawAngle, setCurrentRawAngle] = useState(0);
  const [secondaryAngle, setSecondaryAngle] = useState(null);
  const [liveFormStatus, setLiveFormStatus] = useState({ text: "✓ Perfect Form", isGood: true });
  const [liveIssues, setLiveIssues] = useState([]);
  const [setDuration, setSetDuration] = useState(0);
  const [setHistory, setSetHistory] = useState([]);

  // Rep Flash Pop Animation
  const [repPop, setRepPop] = useState({ active: false, count: 0, isGood: true });

  // AI Summary Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);

  // HTML Element Refs
  const viewportRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraInstanceRef = useRef(null);
  const poseInstanceRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // SHARED MUTABLE RUNTIME REF
  // Eliminates stale closure bugs inside MediaPipe onResults callbacks
  const runtimeRef = useRef({
    isWorkoutActive: false,
    exerciseName: "Squats",
    exerciseType: "squat",
    reps: 0,
    goodReps: 0,
    badReps: 0,
    stage: "start",
    fsmCandidateStage: null,
    fsmCandidateCount: 0,
    smoothAngle: null,
    smoothSecondaryAngle: null,
    lastKnownGoodAngle: null,
    lastKnownGoodSecondary: null,
    consecutiveLowConfidenceFrames: 0,
    positioningStableFrames: 0,
    lastRepTime: 0,
    currentRepFlaws: [],
    startTime: 0,
    prevLandmarks: null,
    voiceEnabled: true,
  });

  // Keep runtime ref updated with latest settings
  useEffect(() => {
    runtimeRef.current.exerciseName = exerciseInput;
    runtimeRef.current.exerciseType = resolveExerciseType(exerciseInput);
  }, [exerciseInput]);

  useEffect(() => {
    runtimeRef.current.voiceEnabled = voiceEnabled;
  }, [voiceEnabled]);

  // Audio Cue Player
  const playAudioCue = useCallback((type = "good") => {
    if (!runtimeRef.current.voiceEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "good") {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(146.83, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {}
  }, []);

  // Speech Synthesizer
  const speakCue = useCallback((phrase) => {
    if (!runtimeRef.current.voiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(phrase);
      utter.rate = 1.05;
      utter.pitch = 1.0;
      window.speechSynthesis.speak(utter);
    } catch (e) {}
  }, []);

  // Format seconds to mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Check Landmark Positioning and Camera Orientation for Selected Exercise
  const checkPositioningReadiness = (lm, exType) => {
    const guide = EXERCISE_POSITIONING_GUIDES[exType] || EXERCISE_POSITIONING_GUIDES.squat;
    if (!lm || lm.length === 0) {
      return {
        ready: false,
        recommendedView: guide.recommendedView,
        icon: guide.icon,
        cue: guide.cue,
        missing: "Step into camera frame",
      };
    }

    const isPointInFrame = (pt) => {
      if (!pt) return false;
      const vis = pt.visibility ?? 1.0;
      const inside = pt.x >= 0.03 && pt.x <= 0.97 && pt.y >= 0.03 && pt.y <= 0.97;
      return vis >= MIN_LANDMARK_VISIBILITY && inside;
    };

    if (guide.requireEitherSide) {
      // Profile side exercises require full visible chain on either right or left side
      const rightChain = [L.R_SHOULDER, L.R_HIP, L.R_KNEE, L.R_ANKLE].every((idx) => isPointInFrame(lm[idx]));
      const leftChain = [L.L_SHOULDER, L.L_HIP, L.L_KNEE, L.L_ANKLE].every((idx) => isPointInFrame(lm[idx]));
      const ready = rightChain || leftChain;
      return {
        ready,
        recommendedView: guide.recommendedView,
        icon: guide.icon,
        cue: guide.cue,
        missing: ready ? null : "Position full body sideways (shoulder to ankle visible)",
      };
    } else {
      // Front view exercises require upper body landmarks
      const allReady = guide.keyLandmarks.every((idx) => isPointInFrame(lm[idx]));
      return {
        ready: allReady,
        recommendedView: guide.recommendedView,
        icon: guide.icon,
        cue: guide.cue,
        missing: allReady ? null : "Ensure torso and arms are fully inside video frame",
      };
    }
  };

  // Get primary joint angle with per-landmark visibility score enforcement and hold fallback
  const getBiomechanicalAngle = (lm, type) => {
    let primaryAngle = null;
    let secondaryAngleVal = null;
    let isConfidenceGood = false;

    if (!lm || lm.length === 0) {
      return {
        angle: runtimeRef.current.lastKnownGoodAngle,
        secondary: runtimeRef.current.lastKnownGoodSecondary,
        isConfidenceGood: false,
      };
    }

    switch (type) {
      case "squat":
      case "lunge": {
        const rHip = lm[L.R_HIP], rKnee = lm[L.R_KNEE], rAnkle = lm[L.R_ANKLE];
        const lHip = lm[L.L_HIP], lKnee = lm[L.L_KNEE], lAnkle = lm[L.L_ANKLE];

        const rightRes = calcAngleWithVisibility(rHip, rKnee, rAnkle, MIN_LANDMARK_VISIBILITY);
        const leftRes = calcAngleWithVisibility(lHip, lKnee, lAnkle, MIN_LANDMARK_VISIBILITY);

        if (rightRes.isValid && leftRes.isValid) {
          isConfidenceGood = true;
          if (rightRes.minVis >= leftRes.minVis) {
            primaryAngle = rightRes.angle;
            secondaryAngleVal = leftRes.angle;
          } else {
            primaryAngle = leftRes.angle;
            secondaryAngleVal = rightRes.angle;
          }
        } else if (rightRes.isValid) {
          isConfidenceGood = true;
          primaryAngle = rightRes.angle;
          secondaryAngleVal = leftRes.angle; // might be null
        } else if (leftRes.isValid) {
          isConfidenceGood = true;
          primaryAngle = leftRes.angle;
          secondaryAngleVal = rightRes.angle; // might be null
        }
        break;
      }

      case "bicep_curl":
      case "pushup": {
        const rS = lm[L.R_SHOULDER], rE = lm[L.R_ELBOW], rW = lm[L.R_WRIST];
        const lS = lm[L.L_SHOULDER], lE = lm[L.L_ELBOW], lW = lm[L.L_WRIST];

        const rightRes = calcAngleWithVisibility(rS, rE, rW, MIN_LANDMARK_VISIBILITY);
        const leftRes = calcAngleWithVisibility(lS, lE, lW, MIN_LANDMARK_VISIBILITY);

        if (rightRes.isValid && leftRes.isValid) {
          isConfidenceGood = true;
          if (rightRes.minVis >= leftRes.minVis) {
            primaryAngle = rightRes.angle;
            secondaryAngleVal = leftRes.angle;
          } else {
            primaryAngle = leftRes.angle;
            secondaryAngleVal = rightRes.angle;
          }
        } else if (rightRes.isValid) {
          isConfidenceGood = true;
          primaryAngle = rightRes.angle;
          secondaryAngleVal = leftRes.angle;
        } else if (leftRes.isValid) {
          isConfidenceGood = true;
          primaryAngle = leftRes.angle;
          secondaryAngleVal = rightRes.angle;
        }
        break;
      }

      case "shoulder_press":
      case "lateral_raise": {
        const rH = lm[L.R_HIP], rS = lm[L.R_SHOULDER], rE = lm[L.R_ELBOW];
        const lH = lm[L.L_HIP], lS = lm[L.L_SHOULDER], lE = lm[L.L_ELBOW];

        const rightRes = calcAngleWithVisibility(rH, rS, rE, MIN_LANDMARK_VISIBILITY);
        const leftRes = calcAngleWithVisibility(lH, lS, lE, MIN_LANDMARK_VISIBILITY);

        if (rightRes.isValid && leftRes.isValid) {
          isConfidenceGood = true;
          if (rightRes.minVis >= leftRes.minVis) {
            primaryAngle = rightRes.angle;
            secondaryAngleVal = leftRes.angle;
          } else {
            primaryAngle = leftRes.angle;
            secondaryAngleVal = rightRes.angle;
          }
        } else if (rightRes.isValid) {
          isConfidenceGood = true;
          primaryAngle = rightRes.angle;
          secondaryAngleVal = leftRes.angle;
        } else if (leftRes.isValid) {
          isConfidenceGood = true;
          primaryAngle = leftRes.angle;
          secondaryAngleVal = rightRes.angle;
        }
        break;
      }

      case "deadlift": {
        const rS = lm[L.R_SHOULDER], rH = lm[L.R_HIP], rK = lm[L.R_KNEE];
        const lS = lm[L.L_SHOULDER], lH = lm[L.L_HIP], lK = lm[L.L_KNEE];

        const rightRes = calcAngleWithVisibility(rS, rH, rK, MIN_LANDMARK_VISIBILITY);
        const leftRes = calcAngleWithVisibility(lS, lH, lK, MIN_LANDMARK_VISIBILITY);

        if (rightRes.isValid && leftRes.isValid) {
          isConfidenceGood = true;
          if (rightRes.minVis >= leftRes.minVis) {
            primaryAngle = rightRes.angle;
            secondaryAngleVal = leftRes.angle;
          } else {
            primaryAngle = leftRes.angle;
            secondaryAngleVal = rightRes.angle;
          }
        } else if (rightRes.isValid) {
          isConfidenceGood = true;
          primaryAngle = rightRes.angle;
          secondaryAngleVal = leftRes.angle;
        } else if (leftRes.isValid) {
          isConfidenceGood = true;
          primaryAngle = leftRes.angle;
          secondaryAngleVal = rightRes.angle;
        }
        break;
      }

      default: {
        const rS = lm[L.R_SHOULDER], rE = lm[L.R_ELBOW], rW = lm[L.R_WRIST];
        const defaultRes = calcAngleWithVisibility(rS, rE, rW, MIN_LANDMARK_VISIBILITY);
        isConfidenceGood = defaultRes.isValid;
        primaryAngle = defaultRes.angle;
        break;
      }
    }

    // Hold last known good angle if current frame visibility is insufficient
    if (isConfidenceGood && primaryAngle !== null) {
      runtimeRef.current.lastKnownGoodAngle = primaryAngle;
      if (secondaryAngleVal !== null) {
        runtimeRef.current.lastKnownGoodSecondary = secondaryAngleVal;
      }
      return { angle: primaryAngle, secondary: secondaryAngleVal, isConfidenceGood: true };
    } else {
      return {
        angle: runtimeRef.current.lastKnownGoodAngle,
        secondary: runtimeRef.current.lastKnownGoodSecondary,
        isConfidenceGood: false,
      };
    }
  };

  // Evaluate Biomechanical Flaws
  const checkBiomechanicalFlaws = (lm, type) => {
    const flaws = [];

    switch (type) {
      case "squat": {
        const rK = lm[L.R_KNEE], rA = lm[L.R_ANKLE], lK = lm[L.L_KNEE], lA = lm[L.L_ANKLE];
        if (rK && rA && lK && lA) {
          if (Math.abs(rK.x - rA.x) > 0.055 || Math.abs(lK.x - lA.x) > 0.055) {
            flaws.push({ id: "knee_cave", msg: "Knees caving inward (Valgus collapse)", sev: "error" });
          }
        }
        break;
      }
      case "bicep_curl": {
        const rS = lm[L.R_SHOULDER], rE = lm[L.R_ELBOW];
        if (rS && rE && Math.abs(rE.x - rS.x) > 0.09) {
          flaws.push({ id: "elbow_flare", msg: "Pin elbows tight to your torso", sev: "warning" });
        }
        if (runtimeRef.current.prevLandmarks) {
          const prevS = runtimeRef.current.prevLandmarks[L.R_SHOULDER];
          if (rS && prevS && Math.abs(rS.y - prevS.y) > 0.035) {
            flaws.push({ id: "swing", msg: "Stop swinging torso – isolate biceps", sev: "error" });
          }
        }
        break;
      }
      case "pushup": {
        const s = lm[L.R_SHOULDER], h = lm[L.R_HIP], a = lm[L.R_ANKLE];
        if (s && h && a) {
          const spine = calcAngle(s, h, a);
          if (spine !== null && spine < 152) {
            flaws.push({ id: "core_sag", msg: "Hips sagging – brace core & glutes", sev: "error" });
          }
        }
        break;
      }
      case "shoulder_press": {
        const s = lm[L.R_SHOULDER], h = lm[L.R_HIP], k = lm[L.R_KNEE];
        if (s && h && k) {
          const spine = calcAngle(s, h, k);
          if (spine !== null && spine < 155) {
            flaws.push({ id: "back_arch", msg: "Hyperextending spine – brace abs", sev: "error" });
          }
        }
        break;
      }
      case "lateral_raise": {
        const s = lm[L.R_SHOULDER], e = lm[L.R_EAR];
        if (s && e && s.y - e.y < 0.075) {
          flaws.push({ id: "trap_shrug", msg: "Lower traps – avoid shrugging neck", sev: "warning" });
        }
        break;
      }
      case "deadlift": {
        const s = lm[L.R_SHOULDER], h = lm[L.R_HIP], k = lm[L.R_KNEE];
        if (s && h && k) {
          const back = calcAngle(s, h, k);
          if (back !== null && back < 85) {
            flaws.push({ id: "round_back", msg: "Spine rounding – keep back flat", sev: "error" });
          }
        }
        break;
      }
      case "lunge": {
        const k = lm[L.R_KNEE], a = lm[L.R_ANKLE];
        if (k && a && Math.abs(k.x - a.x) > 0.075) {
          flaws.push({ id: "knee_toe", msg: "Knee drifting past toes – keep shin vertical", sev: "warning" });
        }
        break;
      }
      default:
        break;
    }

    return flaws;
  };

  // Robust Finite State Machine (FSM) Rep Counter with Hysteresis & Debounce Confirmation
  const evaluateRep = (smoothedAngle, type) => {
    const now = Date.now();
    const currentStage = runtimeRef.current.stage;
    const buffer = HYSTERESIS_BUFFER_DEG;
    const requiredFrames = STATE_HOLD_CONSECUTIVE_FRAMES;

    let repTriggered = false;
    let movementStateText = "READY";

    // Lookup exercise thresholds
    const configMap = {
      squat: {
        bottom: 105,
        lockout: 150,
        inverted: false,
        inflectionLabel: "DEEP SQUAT (PARALLEL)",
        lockoutLabel: "STANDING LOCKOUT",
        asc: "ASCENDING",
        desc: "DESCENDING",
      },
      bicep_curl: {
        bottom: 65,
        lockout: 135,
        inverted: false,
        inflectionLabel: "PEAK BICEP CURL",
        lockoutLabel: "FULL EXTENSION",
        asc: "LOWERING WEIGHT",
        desc: "CURLING UP",
      },
      pushup: {
        bottom: 95,
        lockout: 150,
        inverted: false,
        inflectionLabel: "CHEST AT FLOOR",
        lockoutLabel: "PLANK LOCKOUT",
        asc: "PRESSING UP",
        desc: "DESCENDING",
      },
      shoulder_press: {
        bottom: 100, // Rack starting position
        lockout: 150, // Overhead lockout
        inverted: true,
        inflectionLabel: "OVERHEAD LOCKOUT",
        lockoutLabel: "RACK POSITION",
        asc: "LOWERING BAR",
        desc: "PRESSING UP",
      },
      lateral_raise: {
        bottom: 35, // Arms at sides
        lockout: 75, // Peak horizontal raise
        inverted: true,
        inflectionLabel: "PEAK LATERAL RAISE",
        lockoutLabel: "ARMS AT SIDES",
        asc: "LOWERING ARMS",
        desc: "RAISING LATERAL",
      },
      deadlift: {
        bottom: 105,
        lockout: 155,
        inverted: false,
        inflectionLabel: "HIP HINGE (BOTTOM)",
        lockoutLabel: "STANDING LOCKOUT",
        asc: "DRIVING HIPS FORWARD",
        desc: "HINGING HIPS BACK",
      },
      lunge: {
        bottom: 98,
        lockout: 148,
        inverted: false,
        inflectionLabel: "DEEP LUNGE",
        lockoutLabel: "STANDING RETURN",
        asc: "PUSHING UP",
        desc: "STEPPING DOWN",
      },
    };

    const cfg = configMap[type] || {
      bottom: 80,
      lockout: 140,
      inverted: false,
      inflectionLabel: "PEAK CONTRACTION",
      lockoutLabel: "START POSITION",
      asc: "ASCENDING",
      desc: "DESCENDING",
    };

    if (!cfg.inverted) {
      // Standard Exercises: Bottom depth = small angle, Top Lockout = large angle
      const meetsInflection = smoothedAngle <= (cfg.bottom - buffer);
      const meetsLockout = smoothedAngle >= (cfg.lockout + buffer);

      if (meetsInflection) {
        if (runtimeRef.current.fsmCandidateStage === "inflection") {
          runtimeRef.current.fsmCandidateCount += 1;
        } else {
          runtimeRef.current.fsmCandidateStage = "inflection";
          runtimeRef.current.fsmCandidateCount = 1;
        }

        if (runtimeRef.current.fsmCandidateCount >= requiredFrames) {
          runtimeRef.current.stage = "inflection";
          runtimeRef.current.fsmCandidateStage = null;
          runtimeRef.current.fsmCandidateCount = 0;
        }
        movementStateText = cfg.inflectionLabel;
      } else if (meetsLockout) {
        if (runtimeRef.current.fsmCandidateStage === "start") {
          runtimeRef.current.fsmCandidateCount += 1;
        } else {
          runtimeRef.current.fsmCandidateStage = "start";
          runtimeRef.current.fsmCandidateCount = 1;
        }

        if (runtimeRef.current.fsmCandidateCount >= requiredFrames) {
          if (currentStage === "inflection" && now - runtimeRef.current.lastRepTime > 450) {
            repTriggered = true;
            runtimeRef.current.lastRepTime = now;
          }
          runtimeRef.current.stage = "start";
          runtimeRef.current.fsmCandidateStage = null;
          runtimeRef.current.fsmCandidateCount = 0;
        }
        movementStateText = cfg.lockoutLabel;
      } else {
        // In intermediate range: reset candidate count if we move too far away
        if (runtimeRef.current.fsmCandidateStage === "inflection" && smoothedAngle > (cfg.bottom + buffer)) {
          runtimeRef.current.fsmCandidateStage = null;
          runtimeRef.current.fsmCandidateCount = 0;
        } else if (runtimeRef.current.fsmCandidateStage === "start" && smoothedAngle < (cfg.lockout - buffer)) {
          runtimeRef.current.fsmCandidateStage = null;
          runtimeRef.current.fsmCandidateCount = 0;
        }
        movementStateText = currentStage === "inflection" ? cfg.asc : cfg.desc;
      }
    } else {
      // Inverted Exercises (Shoulder Press / Lateral Raise): Peak contraction = large angle, Rack/Rest = small angle
      const meetsInflection = smoothedAngle >= (cfg.lockout + buffer);
      const meetsLockout = smoothedAngle <= (cfg.bottom - buffer);

      if (meetsInflection) {
        if (runtimeRef.current.fsmCandidateStage === "inflection") {
          runtimeRef.current.fsmCandidateCount += 1;
        } else {
          runtimeRef.current.fsmCandidateStage = "inflection";
          runtimeRef.current.fsmCandidateCount = 1;
        }

        if (runtimeRef.current.fsmCandidateCount >= requiredFrames) {
          runtimeRef.current.stage = "inflection";
          runtimeRef.current.fsmCandidateStage = null;
          runtimeRef.current.fsmCandidateCount = 0;
        }
        movementStateText = cfg.inflectionLabel;
      } else if (meetsLockout) {
        if (runtimeRef.current.fsmCandidateStage === "start") {
          runtimeRef.current.fsmCandidateCount += 1;
        } else {
          runtimeRef.current.fsmCandidateStage = "start";
          runtimeRef.current.fsmCandidateCount = 1;
        }

        if (runtimeRef.current.fsmCandidateCount >= requiredFrames) {
          if (currentStage === "inflection" && now - runtimeRef.current.lastRepTime > 450) {
            repTriggered = true;
            runtimeRef.current.lastRepTime = now;
          }
          runtimeRef.current.stage = "start";
          runtimeRef.current.fsmCandidateStage = null;
          runtimeRef.current.fsmCandidateCount = 0;
        }
        movementStateText = cfg.lockoutLabel;
      } else {
        if (runtimeRef.current.fsmCandidateStage === "inflection" && smoothedAngle < (cfg.lockout - buffer)) {
          runtimeRef.current.fsmCandidateStage = null;
          runtimeRef.current.fsmCandidateCount = 0;
        } else if (runtimeRef.current.fsmCandidateStage === "start" && smoothedAngle > (cfg.bottom + buffer)) {
          runtimeRef.current.fsmCandidateStage = null;
          runtimeRef.current.fsmCandidateCount = 0;
        }
        movementStateText = currentStage === "inflection" ? cfg.asc : cfg.desc;
      }
    }

    return { repTriggered, movementStateText };
  };

  // Real-time Canvas Rendering
  const renderCanvasFrame = (image, landmarks, isFormGood, isConfidenceGood = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = image.width || 640;
    canvas.height = image.height || 480;

    // Flip video horizontally for natural mirror behavior
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (!landmarks) return;

    // Mirrored landmark coordinate map
    const mirroredLm = landmarks.map((l) => ({ ...l, x: 1 - l.x }));

    const connections = [
      [11, 12],
      [11, 13],
      [13, 15],
      [12, 14],
      [14, 16],
      [11, 23],
      [12, 24],
      [23, 24],
      [23, 25],
      [24, 26],
      [25, 27],
      [26, 28],
    ];

    const strokeColor = !isConfidenceGood ? "rgba(255, 189, 89, 0.7)" : isFormGood ? "#b7ff3c" : "#ff5c67";
    const jointColor = !isConfidenceGood ? "rgba(255, 189, 89, 0.9)" : isFormGood ? "#b7ff3c" : "#ff5c67";

    ctx.lineWidth = 4;
    ctx.strokeStyle = strokeColor;
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 10;

    connections.forEach(([p1, p2]) => {
      const a = mirroredLm[p1];
      const b = mirroredLm[p2];
      if (a && b && (a.visibility ?? 1) >= 0.4 && (b.visibility ?? 1) >= 0.4) {
        ctx.beginPath();
        ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
        ctx.lineTo(b.x * canvas.width, b.y * canvas.height);
        ctx.stroke();
      }
    });

    ctx.shadowColor = jointColor;
    ctx.shadowBlur = 12;

    [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach((idx) => {
      const pt = mirroredLm[idx];
      if (pt && (pt.visibility ?? 1) >= 0.4) {
        ctx.beginPath();
        ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 5, 0, Math.PI * 2);
        ctx.fillStyle = jointColor;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    ctx.shadowBlur = 0;
  };

  // Start Camera and Initialize Google MediaPipe Pose
  const startCameraAndPose = async () => {
    try {
      if (typeof window === "undefined" || !window.Pose || !window.Camera) {
        alert("Google MediaPipe library is initializing. Please wait 2 seconds and click Start again.");
        return;
      }

      if (!poseInstanceRef.current) {
        const pose = new window.Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });
        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.55,
          minTrackingConfidence: 0.5,
        });

        pose.onResults((results) => {
          if (!results.image) return;
          const lm = results.poseLandmarks;

          let isCurrentFormGood = true;
          let isFrameConfidenceGood = true;
          const exType = runtimeRef.current.exerciseType;

          // 1. Positioning / Calibration Check (Always runs when camera is active)
          const posCheck = checkPositioningReadiness(lm, exType);
          setPositioningFeedback(posCheck);

          if (posCheck.ready) {
            runtimeRef.current.positioningStableFrames = Math.min(
              POSITIONING_STABILITY_FRAMES,
              runtimeRef.current.positioningStableFrames + 1
            );
          } else {
            runtimeRef.current.positioningStableFrames = Math.max(
              0,
              runtimeRef.current.positioningStableFrames - 2
            );
          }

          const pct = Math.round((runtimeRef.current.positioningStableFrames / POSITIONING_STABILITY_FRAMES) * 100);
          setPositioningLockPercent(pct);
          setIsPositionLocked(pct >= 100);

          // 2. Process Active Workout Tracking
          if (lm && runtimeRef.current.isWorkoutActive) {
            const { angle, secondary, isConfidenceGood } = getBiomechanicalAngle(lm, exType);
            isFrameConfidenceGood = isConfidenceGood;

            if (!isConfidenceGood) {
              runtimeRef.current.consecutiveLowConfidenceFrames += 1;
              if (runtimeRef.current.consecutiveLowConfidenceFrames > 3) {
                setIsTrackingConfidenceLow(true);
              }
            } else {
              runtimeRef.current.consecutiveLowConfidenceFrames = 0;
              setIsTrackingConfidenceLow(false);
            }

            if (angle !== null) {
              // Raw Angle Display
              setCurrentRawAngle(Math.round(angle));
              if (secondary !== null) setSecondaryAngle(Math.round(secondary));

              // Exponential Moving Average (EMA) Angle Filtering
              const smoothed = applyAngleEMA(angle, runtimeRef.current.smoothAngle, EMA_ALPHA);
              runtimeRef.current.smoothAngle = smoothed;

              if (secondary !== null) {
                runtimeRef.current.smoothSecondaryAngle = applyAngleEMA(
                  secondary,
                  runtimeRef.current.smoothSecondaryAngle,
                  EMA_ALPHA
                );
              }

              // Check Biomechanical Form Flaws
              const detectedFlaws = checkBiomechanicalFlaws(lm, exType);
              isCurrentFormGood = detectedFlaws.length === 0;

              if (!isConfidenceGood) {
                setLiveFormStatus({ text: "⚠️ Low Tracking Confidence (Reposition)", isGood: false });
              } else if (isCurrentFormGood) {
                setLiveFormStatus({ text: "✓ Perfect Form", isGood: true });
              } else {
                setLiveFormStatus({ text: detectedFlaws[0].msg, isGood: false });
                detectedFlaws.forEach((flaw) => {
                  if (!runtimeRef.current.currentRepFlaws.includes(flaw.id)) {
                    runtimeRef.current.currentRepFlaws.push(flaw.id);
                    const timeSec = Math.floor((Date.now() - runtimeRef.current.startTime) / 1000);
                    setLiveIssues((prev) => [
                      { id: Date.now() + Math.random(), msg: flaw.msg, sev: flaw.sev, time: timeSec },
                      ...prev.slice(0, 15),
                    ]);
                  }
                });
              }

              // Evaluate Repetition with Hysteresis & Debounce Filtered FSM
              const { repTriggered, movementStateText } = evaluateRep(smoothed, exType);
              setMovementPhase(movementStateText);

              if (repTriggered) {
                runtimeRef.current.reps += 1;
                const isClean = runtimeRef.current.currentRepFlaws.length === 0;

                if (isClean) {
                  runtimeRef.current.goodReps += 1;
                  playAudioCue("good");
                  speakCue(`${runtimeRef.current.reps}`);
                } else {
                  runtimeRef.current.badReps += 1;
                  playAudioCue("bad");
                  speakCue(`Rep ${runtimeRef.current.reps}, check form!`);
                }

                const total = runtimeRef.current.goodReps + runtimeRef.current.badReps;
                const newScore = total > 0 ? Math.round((runtimeRef.current.goodReps / total) * 100) : 100;

                setReps(runtimeRef.current.reps);
                setGoodReps(runtimeRef.current.goodReps);
                setBadReps(runtimeRef.current.badReps);
                setFormScore(newScore);

                setRepPop({ active: true, count: runtimeRef.current.reps, isGood: isClean });
                setTimeout(() => setRepPop({ active: false, count: runtimeRef.current.reps, isGood: isClean }), 650);

                runtimeRef.current.currentRepFlaws = [];
              }
            } else {
              setLiveFormStatus({ text: "Step into camera view", isGood: false });
            }

            runtimeRef.current.prevLandmarks = lm.map((l) => ({ ...l }));
          }

          renderCanvasFrame(results.image, lm, isCurrentFormGood, isFrameConfidenceGood);
        });

        poseInstanceRef.current = pose;
      }

      if (videoRef.current && !cameraInstanceRef.current) {
        const camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (poseInstanceRef.current && videoRef.current) {
              await poseInstanceRef.current.send({ image: videoRef.current });
            }
          },
          width: 1280,
          height: 720,
        });
        await camera.start();
        cameraInstanceRef.current = camera;
      }

      setIsCameraRunning(true);
    } catch (err) {
      console.error("Camera/MediaPipe setup error:", err);
      alert("Could not access camera. Please allow camera permissions in your browser.");
    }
  };

  // Start Workout Set
  const handleStartWorkout = async () => {
    await startCameraAndPose();

    // Reset Runtime Tracker
    runtimeRef.current.isWorkoutActive = true;
    runtimeRef.current.reps = 0;
    runtimeRef.current.goodReps = 0;
    runtimeRef.current.badReps = 0;
    runtimeRef.current.stage = "start";
    runtimeRef.current.smoothAngle = null;
    runtimeRef.current.lastRepTime = 0;
    runtimeRef.current.currentRepFlaws = [];
    runtimeRef.current.startTime = Date.now();

    setIsWorkoutActive(true);
    setReps(0);
    setGoodReps(0);
    setBadReps(0);
    setFormScore(100);
    setSetDuration(0);
    setLiveIssues([]);
    setMovementPhase("CALIBRATING POSTURE");

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setSetDuration((d) => d + 1);
    }, 1000);

    speakCue(`Workout started for ${runtimeRef.current.exerciseName}. Get in position.`);
  };

  // Stop Workout Set & Request LangChain Summary
  const handleStopWorkout = async () => {
    runtimeRef.current.isWorkoutActive = false;
    setIsWorkoutActive(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    const activeEx = runtimeRef.current.exerciseName;
    const finalReps = runtimeRef.current.reps;
    const finalGood = runtimeRef.current.goodReps;
    const finalBad = runtimeRef.current.badReps;
    const total = finalGood + finalBad;
    const finalScore = total > 0 ? Math.round((finalGood / total) * 100) : 100;

    const setSummaryItem = {
      setNumber: setsCount + 1,
      exercise: activeEx,
      reps: finalReps,
      goodReps: finalGood,
      badReps: finalBad,
      formScore: finalScore,
      durationSec: setDuration,
      issues: [...liveIssues],
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setSetsCount((s) => s + 1);
    setSetHistory((prev) => [setSummaryItem, ...prev]);

    // Save to local storage mock data so user profile and trainer reflect this set
    recordMemberAISession(athleteKey, activeEx, finalScore);

    // Call LangChain endpoint for detailed analysis
    await fetchAndShowSetSummary(setSummaryItem);
  };

  // Trigger LangChain AI Set Summary
  const fetchAndShowSetSummary = async (setDetails) => {
    setIsGeneratingReport(true);
    setIsReportModalOpen(true);

    try {
      const summaryPayload = {
        exercise: setDetails.exercise,
        reps: setDetails.reps,
        formScore: setDetails.formScore,
        durationSec: setDetails.durationSec,
        flaws: setDetails.issues.map((i) => i.msg),
        athleteName: user?.name || "Athlete",
        trainerName: "Coach Marcus",
        clientContext: { name: user?.name, trainer: "Coach Marcus" },
      };

      const result = await generateSetSummary(summaryPayload);
      setReportData(result);
      saveMemberAISetSummary(athleteKey, result);
    } catch (e) {
      console.error("AI report error:", e);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Reset Set
  const handleReset = () => {
    runtimeRef.current.isWorkoutActive = false;
    runtimeRef.current.reps = 0;
    runtimeRef.current.goodReps = 0;
    runtimeRef.current.badReps = 0;
    runtimeRef.current.stage = "start";
    runtimeRef.current.smoothAngle = null;
    runtimeRef.current.currentRepFlaws = [];

    setIsWorkoutActive(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    setReps(0);
    setGoodReps(0);
    setBadReps(0);
    setFormScore(100);
    setSetDuration(0);
    setLiveIssues([]);
    setMovementPhase("READY IN POSITION");
  };

  // Stop Camera & Release Webcam Hardware
  const handleStopCamera = useCallback(() => {
    // 1. Physically turn off the webcam hardware by stopping each MediaStreamTrack
    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        try {
          const stream = videoRef.current.srcObject;
          if (stream && stream.getTracks) {
            stream.getTracks().forEach((track) => {
              track.stop();
            });
          }
        } catch (e) {
          console.warn("Error stopping video stream tracks:", e);
        }
        videoRef.current.srcObject = null;
      }
      try {
        videoRef.current.pause();
        videoRef.current.src = "";
      } catch (e) {}
    }

    // 2. Stop the MediaPipe Camera utility
    if (cameraInstanceRef.current) {
      try {
        cameraInstanceRef.current.stop();
      } catch (e) {
        console.warn("Error stopping cameraInstanceRef:", e);
      }
      cameraInstanceRef.current = null;
    }

    // 3. Terminate active set state and timer
    runtimeRef.current.isWorkoutActive = false;
    setIsWorkoutActive(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // 4. Clear the canvas
    if (canvasRef.current) {
      try {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      } catch (e) {}
    }

    // 5. Update state
    setIsCameraRunning(false);
    setMovementPhase("CAMERA OFF");
    setLiveFormStatus({ text: "Camera Stopped", isGood: true });
  }, []);

  // Fullscreen Management
  const toggleFullscreen = useCallback(async () => {
    const el = viewportRef.current;
    if (!el) return;

    try {
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (e) {
      console.warn("Fullscreen toggle fallback:", e);
      setIsFullscreen((prev) => !prev);
    }
  }, []);

  // Sync fullscreen state with native browser events (e.g. user pressing Escape)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (cameraInstanceRef.current) {
        cameraInstanceRef.current.stop();
        cameraInstanceRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <DashboardLayout
      title="AI Form Coach"
      subtitle="Real-Time 33-Point MediaPipe Biomechanical Tracking & LangChain Set Analysis"
    >
      <div className="aifc-wrapper">
        {/* ========================================================= */}
        {/* TOP EXERCISE INPUT BAR (Dynamic free-text + Quick Tags)   */}
        {/* ========================================================= */}
        <div className="aifc-topbar">
          <div className="flex-1 flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-muted uppercase tracking-wider shrink-0">
                <Dumbbell size={16} className="text-green" />
                <span>EXERCISE TO TRACK:</span>
              </div>
              <div className="aifc-search-wrap">
                <Search size={15} className="aifc-search-icon" />
                <input
                  type="text"
                  value={exerciseInput}
                  onChange={(e) => setExerciseInput(e.target.value)}
                  placeholder="Type any exercise (e.g. Squats, Bicep Curls, Push-ups, Lateral Raises)..."
                  className="aifc-search-input"
                />
              </div>
            </div>

            {/* Quick Suggestion Tags */}
            <div className="aifc-quick-row">
              <span className="aifc-quick-lbl">QUICK SELECT:</span>
              <div className="aifc-quick-list">
                {QUICK_SUGGESTIONS.map((sug) => {
                  const isActive = exerciseInput.toLowerCase().includes(sug.toLowerCase());
                  return (
                    <button
                      key={sug}
                      type="button"
                      className={`aifc-quick-tag ${isActive ? "active" : ""}`}
                      onClick={() => {
                        setExerciseInput(sug);
                        handleReset();
                      }}
                    >
                      {sug}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isCameraRunning && (
              <button
                type="button"
                className="aifc-topbar-camera-stop"
                onClick={handleStopCamera}
                title="Camera is active - click to turn off"
              >
                <span className="aifc-camera-dot-pulse"></span>
                <CameraOff size={13} />
                <span>Stop Camera</span>
              </button>
            )}

            <button
              className={`dash-icon-btn ${voiceEnabled ? "active" : ""}`}
              onClick={() => setVoiceEnabled((v) => !v)}
              title={voiceEnabled ? "Voice Cues Active" : "Voice Muted"}
            >
              {voiceEnabled ? <Volume2 size={16} className="text-green" /> : <VolumeX size={16} />}
            </button>

            <div className="aifc-engine-badge">
              <Activity size={14} className="text-green" />
              <span>60 FPS MediaPipe Engine</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MAIN 2-COLUMN VIEWPORT & METRICS GRID                     */}
        {/* ========================================================= */}
        <div className="aifc-grid">
          {/* Column 1: Camera & Viewport */}
          <div>
            <div
              ref={viewportRef}
              className={`aifc-viewport-container ${isFullscreen ? "is-fullscreen" : ""}`}
            >
              {/* Hidden Video (Kept active in DOM with 1px to prevent Chromium from suspending stream) */}
              <video
                ref={videoRef}
                playsInline
                muted
                style={{ position: "absolute", top: 0, left: 0, width: "1px", height: "1px", opacity: 0 }}
              />
              <canvas ref={canvasRef} />

              {/* Standby Placeholder - Center Aligned */}
              {!isCameraRunning && (
                <div className="aifc-standby-state">
                  <div className="aifc-standby-icon">
                    <Camera size={34} />
                  </div>
                  <div className="aifc-standby-badge">
                    <Activity size={12} />
                    <span>AI MediaPipe Tracking Ready</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">
                      Ready to Track <span className="text-green">{exerciseInput}</span>
                    </h3>
                    <p className="text-xs text-muted max-w-md mt-1.5 leading-relaxed">
                      Position your device according to the exercise requirements. Click <strong>Start Camera & Calibration</strong> below to begin automated posture alignment and real-time biomechanical rep tracking.
                    </p>
                  </div>

                  {/* Exercise-Specific Orientation Hint */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] max-w-md w-full text-left flex items-start gap-3">
                    <span className="text-lg">{positioningFeedback.icon}</span>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Recommended Setup:</span>
                        <span className="text-green">{positioningFeedback.recommendedView}</span>
                      </div>
                      <p className="text-[11px] text-muted mt-0.5 leading-normal">
                        {positioningFeedback.cue}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 mt-2">
                    <button
                      type="button"
                      className="aifc-btn aifc-btn-primary py-2 px-5 text-xs"
                      onClick={handleStartWorkout}
                    >
                      <Play size={14} />
                      <span>Start Camera & Calibration</span>
                    </button>
                    <button
                      type="button"
                      className="aifc-btn aifc-btn-outline py-2 px-4 text-xs"
                      onClick={toggleFullscreen}
                    >
                      {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                      <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Pre-Workout Positioning & Landmark Calibration Overlay (When Camera is Running & Workout not yet active) */}
              {isCameraRunning && !isWorkoutActive && (
                <div className="aifc-positioning-overlay">
                  <div className="aifc-positioning-card">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{positioningFeedback.icon}</span>
                        <div>
                          <div className="text-xs font-bold text-white uppercase tracking-wider">
                            Camera Positioning Setup
                          </div>
                          <div className="text-[11px] text-green font-semibold">
                            {positioningFeedback.recommendedView}
                          </div>
                        </div>
                      </div>
                      <div className={`aifc-lock-badge ${isPositionLocked ? "locked" : ""}`}>
                        {isPositionLocked ? (
                          <>
                            <CheckCircle2 size={13} className="text-green" />
                            <span>POSITION LOCKED</span>
                          </>
                        ) : (
                          <>
                            <Activity size={13} className="text-yellow animate-pulse" />
                            <span>CALIBRATING ({positioningLockPercent}%)</span>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-secondary mt-2 leading-relaxed">
                      {positioningFeedback.cue}
                    </p>

                    {positioningFeedback.missing && (
                      <div className="flex items-center gap-1.5 text-[11px] text-yellow font-medium mt-1">
                        <AlertTriangle size={12} className="shrink-0" />
                        <span>{positioningFeedback.missing}</span>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="w-full bg-white/10 rounded-full h-1.5 mt-2.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-200 ${
                          isPositionLocked ? "bg-green" : "bg-yellow"
                        }`}
                        style={{ width: `${positioningLockPercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-white/[0.08]">
                      <span className="text-[10px] text-muted">
                        {isPositionLocked
                          ? "✓ Required landmarks verified with high confidence (>0.65)"
                          : "Hold position steady to unlock rep counter"}
                      </span>
                      <button
                        type="button"
                        className={`aifc-btn py-1.5 px-4 text-xs font-bold ${
                          isPositionLocked ? "aifc-btn-primary" : "aifc-btn-outline opacity-90"
                        }`}
                        onClick={handleStartWorkout}
                      >
                        <Play size={13} />
                        <span>{isPositionLocked ? "Start Tracking Set" : "Start Tracking"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Corner Fullscreen Button - always accessible when not fullscreen */}
              {!isFullscreen && (
                <button
                  type="button"
                  className="aifc-fullscreen-corner-btn"
                  onClick={toggleFullscreen}
                  title="Fullscreen AI Form Coach"
                >
                  <Maximize2 size={14} />
                  <span>Fullscreen</span>
                </button>
              )}

              {/* Live HUD Overlays */}
              {isCameraRunning && isWorkoutActive && (
                <div className={`aifc-hud ${isTrackingConfidenceLow ? "dimmed-hud" : ""}`}>
                  {/* Low Confidence Warning Pill */}
                  {isTrackingConfidenceLow && (
                    <div className="aifc-confidence-warning">
                      <AlertTriangle size={13} className="text-yellow animate-pulse" />
                      <span>Low Tracking Confidence (Visibility &lt; 0.65) • Step back / adjust lighting</span>
                    </div>
                  )}

                  {/* Top Bar HUD */}
                  <div className="aifc-hud-top">
                    {/* Big Glowing Rep Counter */}
                    <div className="aifc-rep-badge">
                      <div className="aifc-rep-label">REPS</div>
                      <div className="aifc-rep-num">{reps}</div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* Live Form Alert Indicator */}
                      <div className={`aifc-form-badge ${!liveFormStatus.isGood ? "error" : ""}`}>
                        <div className="aifc-form-title">FORM MONITOR</div>
                        <div className="aifc-form-msg">{liveFormStatus.text}</div>
                      </div>

                      {/* HUD Quick Stop Camera Button */}
                      <button
                        type="button"
                        className="aifc-hud-cam-btn"
                        onClick={handleStopCamera}
                        title="Turn off webcam camera"
                      >
                        <CameraOff size={13} />
                        <span>Stop Cam</span>
                      </button>

                      {/* Fullscreen Button in HUD */}
                      <button
                        type="button"
                        className="aifc-hud-cam-btn"
                        onClick={toggleFullscreen}
                        title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen Mode"}
                        style={{ color: "var(--green, #b7ff3c)", borderColor: "rgba(183, 255, 60, 0.35)" }}
                      >
                        {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                        <span>{isFullscreen ? "Exit" : "Expand"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Bottom Bar HUD */}
                  <div className="aifc-hud-bottom">
                    <div className="aifc-angle-chips">
                      <div className="aifc-angle-chip">
                        Joint Angle: <span>{currentRawAngle}°</span>
                      </div>
                      {secondaryAngle !== null && (
                        <div className="aifc-angle-chip">
                          Secondary: <span>{secondaryAngle}°</span>
                        </div>
                      )}
                    </div>

                    <div className="aifc-phase-chip">{movementPhase}</div>
                    <div className="aifc-timer-chip">{formatTime(setDuration)}</div>
                  </div>
                </div>
              )}

              {/* Fullscreen Floating Controls Bar */}
              {isFullscreen && (
                <div className="aifc-fs-floating-bar">
                  {!isWorkoutActive ? (
                    <button className="aifc-btn aifc-btn-primary py-2 px-5 text-xs" onClick={handleStartWorkout}>
                      <Play size={14} />
                      <span>{isPositionLocked ? "Start Tracking Set" : "Start Tracking"}</span>
                    </button>
                  ) : (
                    <button className="aifc-btn aifc-btn-danger py-2 px-5 text-xs" onClick={handleStopWorkout}>
                      <Square size={14} />
                      <span>Finish Set</span>
                    </button>
                  )}
                  {isCameraRunning && (
                    <button className="aifc-btn aifc-btn-camera-off py-2 px-4 text-xs" onClick={handleStopCamera}>
                      <CameraOff size={14} />
                      <span>Stop Cam</span>
                    </button>
                  )}
                  <button className="aifc-btn aifc-btn-outline py-2 px-4 text-xs" onClick={handleReset}>
                    <RotateCcw size={13} />
                    <span>Reset</span>
                  </button>
                  <button className="aifc-btn aifc-btn-outline py-2 px-4 text-xs" onClick={toggleFullscreen}>
                    <Minimize2 size={14} />
                    <span>Exit Fullscreen</span>
                  </button>
                </div>
              )}

              {/* Rep Flash Pop Animation */}
              <div
                className={`aifc-rep-flash ${
                  repPop.active ? (repPop.isGood ? "pop-good" : "pop-bad") : ""
                }`}
              >
                {repPop.count}
              </div>
            </div>

            {/* Viewport Control Buttons */}
            <div className="aifc-controls-row">
              {!isWorkoutActive ? (
                <button
                  className={`aifc-btn ${isPositionLocked ? "aifc-btn-primary" : "aifc-btn-primary"}`}
                  onClick={handleStartWorkout}
                >
                  <Play size={16} />
                  <span>
                    {isCameraRunning
                      ? isPositionLocked
                        ? "Start Tracking Set (Ready)"
                        : "Start Tracking Set"
                      : "Start Camera & Calibration"}
                  </span>
                </button>
              ) : (
                <button className="aifc-btn aifc-btn-danger" onClick={handleStopWorkout}>
                  <Square size={16} />
                  <span>Finish Set</span>
                </button>
              )}

              {/* Dedicated Stop Camera Button */}
              {isCameraRunning && (
                <button className="aifc-btn aifc-btn-camera-off" onClick={handleStopCamera}>
                  <CameraOff size={16} />
                  <span>Stop Camera</span>
                </button>
              )}

              {/* Fullscreen Button */}
              <button className="aifc-btn aifc-btn-outline" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
              </button>

              <button className="aifc-btn aifc-btn-outline" onClick={handleReset}>
                <RotateCcw size={15} />
                <span>Reset Counter</span>
              </button>

              <button
                className="aifc-btn aifc-btn-report"
                onClick={() =>
                  fetchAndShowSetSummary({
                    exercise: exerciseInput,
                    reps,
                    goodReps,
                    badReps,
                    formScore,
                    durationSec: setDuration,
                    issues: liveIssues,
                  })
                }
              >
                <Sparkles size={16} />
                <span>AI Coach Report</span>
              </button>
            </div>
          </div>

          {/* Column 2: Live Stats, Score & Diagnostics Sidebar */}
          <div className="aifc-sidebar">
            {/* Live Stats */}
            <div className="aifc-card">
              <div className="aifc-card-header">
                <span>Set Performance</span>
                <Flame size={15} className="text-orange" />
              </div>
              <div className="aifc-stat-grid">
                <div className="aifc-stat-box">
                  <div className="aifc-stat-val primary">{reps}</div>
                  <div className="aifc-stat-lbl">Total Reps</div>
                </div>
                <div className="aifc-stat-box">
                  <div className="aifc-stat-val success">{goodReps}</div>
                  <div className="aifc-stat-lbl">Clean Reps</div>
                </div>
                <div className="aifc-stat-box">
                  <div className="aifc-stat-val danger">{badReps}</div>
                  <div className="aifc-stat-lbl">Form Faults</div>
                </div>
                <div className="aifc-stat-box">
                  <div className="aifc-stat-val text-yellow">{setsCount}</div>
                  <div className="aifc-stat-lbl">Sets Done</div>
                </div>
              </div>
            </div>

            {/* Form Precision Score Ring */}
            <div className="aifc-card text-center">
              <div className="aifc-card-header">
                <span>Form Precision Score</span>
                <ShieldCheck size={15} className="text-green" />
              </div>
              <div className="aifc-ring-wrap">
                <svg className="aifc-ring-svg" width="120" height="120" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke={formScore >= 80 ? "#b7ff3c" : formScore >= 60 ? "#ffbd59" : "#ff5c67"}
                    strokeWidth="8"
                    strokeDasharray={326.7}
                    strokeDashoffset={326.7 - (formScore / 100) * 326.7}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                </svg>
                <div className="aifc-ring-val">
                  <span className={formScore >= 80 ? "text-green" : formScore >= 60 ? "text-yellow" : "text-red"}>
                    {formScore}%
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted">
                {formScore >= 90
                  ? "Elite Kinematic Fidelity 🔥"
                  : formScore >= 75
                  ? "Good Joint Tracking & Alignment"
                  : "Focus on Core & Cadence Control"}
              </div>
            </div>

            {/* Live Form Issues Stream */}
            <div className="aifc-card">
              <div className="aifc-card-header">
                <span>Real-Time Biomechanical Stream</span>
                <span className="text-xs font-normal text-muted">{liveIssues.length} alerts</span>
              </div>
              <div className="aifc-issues-list">
                {liveIssues.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted">
                    No form faults detected. Maintain stable alignment!
                  </div>
                ) : (
                  liveIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`aifc-issue-item ${issue.sev === "error" ? "error" : "warning"}`}
                    >
                      <AlertTriangle
                        size={14}
                        className={issue.sev === "error" ? "text-red shrink-0" : "text-yellow shrink-0"}
                      />
                      <div>
                        <div className="aifc-issue-text">{issue.msg}</div>
                        <div className="aifc-issue-time">{formatTime(issue.time)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Set History */}
            <div className="aifc-card">
              <div className="aifc-card-header">
                <span>Completed Sets</span>
                <Award size={15} className="text-muted" />
              </div>
              {setHistory.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted">
                  No sets completed yet. Finish a set to record history.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {setHistory.map((s, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-green/10 text-green flex items-center justify-center font-bold text-xs">
                          {s.setNumber}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            {s.reps} reps • {s.exercise}
                          </div>
                          <div className="text-[10px] text-muted">
                            {formatTime(s.durationSec)} at {s.timestamp}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          s.formScore >= 80 ? "bg-green/10 text-green" : "bg-yellow/10 text-yellow"
                        }`}
                      >
                        {s.formScore}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Set Summary Modal (LangChain Post-Workout Analysis) */}
      {isReportModalOpen && (
        <div className="aifc-modal-backdrop" onClick={() => setIsReportModalOpen(false)}>
          <div className="aifc-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="aifc-modal-header">
              <div className="flex items-center gap-2">
                <Brain size={20} className="text-green" />
                <h3 className="text-base font-bold text-white">AI Post-Set Biomechanical Analysis</h3>
              </div>
              <button
                className="text-muted hover:text-white p-1 rounded-lg"
                onClick={() => setIsReportModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="aifc-modal-body">
              {isGeneratingReport ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-green border-t-transparent animate-spin" />
                  <p className="text-xs text-muted">
                    LangChain agent synthesizing joint kinematics & generating personalized report...
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                      <div className="text-lg font-black text-green">{reps}</div>
                      <div className="text-[9px] uppercase tracking-wider text-muted mt-1">Reps</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                      <div className="text-lg font-black text-green">{formScore}%</div>
                      <div className="text-[9px] uppercase tracking-wider text-muted mt-1">Precision</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                      <div className="text-lg font-black text-white">{goodReps}</div>
                      <div className="text-[9px] uppercase tracking-wider text-muted mt-1">Clean</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
                      <div className="text-lg font-black text-red">{badReps}</div>
                      <div className="text-[9px] uppercase tracking-wider text-muted mt-1">Faults</div>
                    </div>
                  </div>

                  {reportData?.headline && (
                    <div className="p-3 rounded-xl bg-green/10 border border-green/30 text-sm font-bold text-green">
                      {reportData.headline}
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs leading-relaxed text-secondary space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck size={14} className="text-green" />
                      Executive Posture & Kinetic Chain Analysis
                    </h4>
                    <p>{reportData?.summary || reportData?.executiveSummary}</p>
                  </div>

                  {reportData?.jointStability && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs leading-relaxed text-secondary space-y-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Activity size={14} className="text-green" />
                        Joint Alignment & Symmetry
                      </h4>
                      <p>{reportData.jointStability}</p>
                    </div>
                  )}

                  {reportData?.cuesForNextSet && reportData.cuesForNextSet.length > 0 && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs leading-relaxed text-secondary space-y-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Sparkles size={14} className="text-yellow" />
                        Target Form Corrections for Set {setsCount + 1}
                      </h4>
                      <ul className="list-disc pl-4 space-y-1 text-muted">
                        {reportData.cuesForNextSet.map((cue, idx) => (
                          <li key={idx} className="text-secondary">
                            {cue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 rounded-xl bg-green/10 border border-green/30 text-xs">
                    <div className="flex items-center gap-2 text-green font-bold">
                      <CheckCircle2 size={15} />
                      <span>Synchronized to Member Progress & Trainer Portal</span>
                    </div>
                    <button
                      className="dash-btn-primary py-1.5 px-3 text-xs"
                      onClick={() => setIsReportModalOpen(false)}
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
