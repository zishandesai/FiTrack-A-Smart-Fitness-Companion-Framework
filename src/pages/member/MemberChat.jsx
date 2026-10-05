import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Send,
  User,
  MessageSquare,
  Sparkles,
  Phone,
  Mail,
  ShieldCheck,
  CheckCheck,
  Star,
  UserCheck,
  ArrowRight,
  RotateCw,
  Dumbbell,
  CheckCircle2,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import {
  getTrainersList,
  getConversationMessages,
  sendChatMessage,
  getMembersList,
  assignMemberToTrainer,
  DEFAULT_CERTIFIED_TRAINERS,
} from "../../services/mockData";

export default function MemberChat() {
  const { user: authUser, refreshUserData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [coach, setCoach] = useState(null);
  const [availableCoaches, setAvailableCoaches] = useState([]);
  const [isSwitchingCoach, setIsSwitchingCoach] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Read current user reactively
  const getCurrentUser = () => {
    try {
      const local = JSON.parse(localStorage.getItem("fittrack_user") || "{}");
      return { ...(authUser || {}), ...local };
    } catch {
      return authUser || {};
    }
  };

  const currentUser = getCurrentUser();
  const memberId = currentUser.id || currentUser._id || currentUser.email || "member_default";

  // Load chat contacts, assigned coach, and message thread
  const loadChatData = async () => {
    const freshUser = getCurrentUser();
    const trainers = getTrainersList();
    setAvailableCoaches(trainers);

    let resolvedCoach = null;

    // 1. Try Backend Chat Contacts first
    try {
      const api = (await import("../../services/api")).default;
      const contactsRes = await api.get("/chat/contacts");
      if (contactsRes.data?.success && Array.isArray(contactsRes.data?.contacts) && contactsRes.data.contacts.length > 0) {
        resolvedCoach = contactsRes.data.contacts[0];
      }
    } catch {
      // Backend offline or fallback
    }

    // 2. Cross-reference local member & user records
    if (!resolvedCoach) {
      const members = getMembersList();
      const currentMem = members.find(
        (m) =>
          (freshUser.email && m.email?.toLowerCase() === freshUser.email.toLowerCase()) ||
          (freshUser.name && m.name?.toLowerCase() === freshUser.name.toLowerCase()) ||
          (freshUser.id && String(m.id) === String(freshUser.id)) ||
          (freshUser._id && String(m._id) === String(freshUser._id))
      );

      const targetTrainerId = freshUser.trainerId || currentMem?.trainerId;
      const targetTrainerName = freshUser.trainerName || freshUser.trainer || currentMem?.trainerName;

      if (targetTrainerId || targetTrainerName) {
        // Look up in trainers directory
        const tIdStr = targetTrainerId ? String(targetTrainerId).toLowerCase().trim() : "";
        const tNameStr = targetTrainerName ? String(targetTrainerName).toLowerCase().trim().replace(/^coach\s+/i, "") : "";

        resolvedCoach = trainers.find((t) => {
          const idMatch = tIdStr && (String(t.id).toLowerCase() === tIdStr || String(t._id).toLowerCase() === tIdStr);
          const nameClean = (t.name || "").toLowerCase().trim().replace(/^coach\s+/i, "");
          const nameMatch = tNameStr && (nameClean === tNameStr || nameClean.includes(tNameStr) || tNameStr.includes(nameClean));
          return idMatch || nameMatch;
        });

        // If not found in static list, synthesize valid coach profile so chat never locks out
        if (!resolvedCoach && targetTrainerName) {
          resolvedCoach = {
            id: targetTrainerId || `tr_assigned_${Date.now()}`,
            _id: targetTrainerId || `tr_assigned_${Date.now()}`,
            name: targetTrainerName.replace(/^coach\s+/i, ""),
            specialty: freshUser.trainerSpecialty || currentMem?.trainerSpecialty || "Certified Fitness Specialist",
            email: freshUser.trainerEmail || currentMem?.trainerEmail || "coach@fittrack.com",
            phone: freshUser.trainerPhone || currentMem?.trainerPhone || "+1 (555) 234-5678",
            rating: 4.9,
            experience: "5+ years",
          };
        }
      }
    }

    setCoach(resolvedCoach);

    // 3. Load message conversation if coach is resolved
    if (resolvedCoach) {
      const coachId = resolvedCoach._id || resolvedCoach.id;
      const coachIdentifiers = [resolvedCoach.id, resolvedCoach._id, resolvedCoach.name, resolvedCoach.email].filter(Boolean);
      const memberIdentifiers = [freshUser.id, freshUser._id, freshUser.email, freshUser.name, memberId].filter(Boolean);

      const localMsgs = getConversationMessages(memberIdentifiers, coachIdentifiers);
      let combined = [...localMsgs];

      try {
        const api = (await import("../../services/api")).default;
        const convRes = await api.get(`/chat/conversation/${coachId}`);
        if (convRes.data?.success && Array.isArray(convRes.data?.messages)) {
          convRes.data.messages.forEach((bm) => {
            const exists = combined.some(
              (m) => m.id === bm._id || m.id === bm.id || (m.content === bm.content && m.createdAt === bm.createdAt)
            );
            if (!exists) {
              combined.push({
                id: bm._id || bm.id,
                senderId: bm.senderId,
                receiverId: bm.receiverId,
                senderName: bm.senderName,
                senderRole: bm.senderRole,
                content: bm.content,
                createdAt: bm.createdAt,
              });
            }
          });
        }
      } catch {
        // Local fallback
      }

      combined.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      // If no messages exist yet, show initial welcome message in thread directly (without dispatching loop)
      if (combined.length === 0) {
        combined = [
          {
            id: `welcome_${Date.now()}`,
            senderId: coachId,
            receiverId: memberId,
            senderName: `Coach ${resolvedCoach.name}`,
            senderRole: "trainer",
            content: `Hi ${freshUser.name || "there"}! I'm Coach ${resolvedCoach.name}, your assigned personal trainer. I'm here to guide your workouts, review your form, and answer your diet and training questions. How can I help you reach your goals today?`,
            createdAt: new Date().toISOString(),
          },
        ];
      }

      setMessages(combined);
    }
  };

  useEffect(() => {
    loadChatData();

    // Listen to new messages without re-querying everything to prevent infinite re-render loops
    const handleChatSync = (e) => {
      const incoming = e?.detail;
      if (incoming && incoming.content) {
        setMessages((prev) => {
          if (
            prev.some(
              (m) =>
                m.id === incoming.id ||
                (m.content === incoming.content && Math.abs(new Date(m.createdAt) - new Date(incoming.createdAt)) < 1500)
            )
          ) {
            return prev;
          }
          return [...prev, incoming];
        });
      }
    };

    const handleAssignmentSync = () => {
      loadChatData();
    };

    window.addEventListener("fittrack:chat-changed", handleChatSync);
    window.addEventListener("fittrack:assignment-changed", handleAssignmentSync);

    return () => {
      window.removeEventListener("fittrack:chat-changed", handleChatSync);
      window.removeEventListener("fittrack:assignment-changed", handleAssignmentSync);
    };
  }, [authUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Handle in-page coach connection
  const handleSelectCoach = async (trainer) => {
    const cur = getCurrentUser();
    try {
      const api = (await import("../../services/api")).default;
      const mId = cur.id || cur._id;
      if (mId) {
        await api.post(`/members/${mId}/assign-trainer`, { trainerId: trainer.id || trainer._id });
      }
    } catch {
      // Local fallback
    }

    assignMemberToTrainer(cur.id || cur.email || cur.name, trainer.id || trainer._id, trainer);
    setIsSwitchingCoach(false);
    if (refreshUserData) refreshUserData();
    await loadChatData();
  };

  // Handle message sending
  const handleSend = async (textToSend) => {
    const content = typeof textToSend === "string" ? textToSend : input;
    if (!content || !content.trim()) return;

    const activeCoach = coach || availableCoaches[0] || DEFAULT_CERTIFIED_TRAINERS[0];
    const coachId = activeCoach._id || activeCoach.id || "tr_marcus";
    const cleanContent = content.trim();

    // Reset input immediately
    setInput("");

    // 1. Optimistic UI update
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newMsg = {
      id: msgId,
      senderId: String(memberId),
      receiverId: String(coachId),
      senderName: currentUser.name || "Member",
      senderRole: "member",
      content: cleanContent,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);

    // 2. Save locally
    sendChatMessage({
      senderId: memberId,
      receiverId: coachId,
      senderName: currentUser.name || "Member",
      senderRole: "member",
      content: cleanContent,
    });

    // 3. Send to backend if connected (asynchronously)
    try {
      const api = (await import("../../services/api")).default;
      api.post("/chat/send", {
        receiverId: coachId,
        content: cleanContent,
      }).catch(() => {});
    } catch {
      // Local fallback
    }

    // 4. Interactive Coach simulated response for testing and demonstration
    simulateCoachReply(cleanContent, activeCoach);
  };

  // Intelligent simulated coach feedback
  const simulateCoachReply = (userQuery, coachObj) => {
    setIsTyping(true);

    setTimeout(() => {
      let replyText = `Thanks for checking in! Keep up the dedication. Focus on high-quality reps and let me know if you need any adjustments to your workout program.`;
      const q = userQuery.toLowerCase();

      if (q.includes("form") || q.includes("technique") || q.includes("squat") || q.includes("deadlift") || q.includes("bench")) {
        replyText = `Regarding your form: Ensure your core remains braced and feet are firmly rooted throughout the eccentric phase. Send me a quick clip or check the AI Pose Analysis tab anytime for real-time rep feedback!`;
      } else if (q.includes("workout logged") || q.includes("done") || q.includes("finished") || q.includes("completed")) {
        replyText = `Outstanding effort today! I've registered your session completion. Make sure to hydrate, stretch, and hit your protein target this evening to maximize recovery. 💪`;
      } else if (q.includes("rep") || q.includes("set") || q.includes("weight") || q.includes("routine")) {
        replyText = `Great question on progressive overload. If you hit your target reps with clean tempo on your last two sessions, feel free to increase weight by 2.5kg to 5kg next time!`;
      } else if (q.includes("diet") || q.includes("meal") || q.includes("protein") || q.includes("food") || q.includes("pre-workout")) {
        replyText = `For pre-workout fueling: aim for a balance of easily digestible complex carbs with moderate lean protein 60-90 minutes before your workout. Check our AI NutriCoach Studio tab for instant macro breakdowns!`;
      } else if (q.includes("hi") || q.includes("hello") || q.includes("hey")) {
        replyText = `Hello! Coach ${coachObj.name} here. I'm actively monitoring your training logs. What are you looking to achieve in today's gym session?`;
      }

      const coachMsg = {
        id: `coach_reply_${Date.now()}`,
        senderId: String(coachObj._id || coachObj.id),
        receiverId: String(memberId),
        senderName: `Coach ${coachObj.name}`,
        senderRole: "trainer",
        content: replyText,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, coachMsg]);

      sendChatMessage({
        senderId: coachObj._id || coachObj.id,
        receiverId: memberId,
        senderName: `Coach ${coachObj.name}`,
        senderRole: "trainer",
        content: replyText,
      });

      setIsTyping(false);
    }, 1200);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSend();
  };

  const quickReplies = [
    "Form check request 🏋️",
    "Workout logged for today! 💪",
    "Can we update my sets / reps?",
    "Need advice on pre-workout meal 🥗",
  ];

  return (
    <DashboardLayout
      title="Coach Communication Hub"
      subtitle="Direct 1-on-1 private messaging with your personal trainer."
    >
      {/* CASE 1: NO COACH ASSIGNED YET OR USER WANTS TO SWITCH COACH */}
      {(!coach || isSwitchingCoach) ? (
        <div className="dash-card p-8" style={{ border: "1px solid rgba(85, 231, 255, 0.25)" }}>
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="badge badge-cyan text-2xs">PERSONAL COACH DIRECTORY</span>
                {coach && (
                  <button
                    type="button"
                    onClick={() => setIsSwitchingCoach(false)}
                    className="text-xs text-muted hover:text-white underline ml-2"
                  >
                    ← Back to active chat with Coach {coach.name}
                  </button>
                )}
              </div>
              <h2 className="text-xl font-bold text-white">
                {coach ? "Select a New Personal Trainer" : "Connect With Your Dedicated Coach"}
              </h2>
              <p className="text-muted text-xs mt-1 max-w-xl">
                Choose any of our certified trainers below to unlock direct 1-on-1 messaging, customized training plans, and real-time guidance.
              </p>
            </div>
            <Link to="/member/coaches" className="btn btn-secondary btn-sm flex items-center gap-1.5">
              <User size={14} /> View Full Profiles
            </Link>
          </div>

          <div className="dash-grid-2">
            {(availableCoaches.length > 0 ? availableCoaches : DEFAULT_CERTIFIED_TRAINERS).map((tr) => {
              const isCurrent = coach && (coach.id === tr.id || coach._id === tr.id || coach.name === tr.name);
              return (
                <div
                  key={tr.id || tr._id}
                  className="dash-card flex flex-col justify-between"
                  style={{
                    background: isCurrent ? "rgba(14, 28, 48, 0.9)" : "rgba(16, 20, 32, 0.8)",
                    border: isCurrent ? "1px solid rgba(85, 231, 255, 0.5)" : "1px solid rgba(255, 255, 255, 0.08)",
                    boxShadow: isCurrent ? "0 0 24px rgba(56, 189, 248, 0.15)" : undefined,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="trainer-avatar-large font-bold flex items-center justify-center"
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "50%",
                            background: "var(--blue-vibrant)",
                            color: "#000",
                            fontSize: "1.2rem",
                          }}
                        >
                          {tr.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-base leading-tight">{tr.name}</h4>
                            {isCurrent && <span className="badge badge-cyan text-2xs">Your Coach</span>}
                          </div>
                          <p className="text-cyan text-xs font-medium mt-0.5">{tr.specialty}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="badge badge-green text-2xs flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green inline-block animate-pulse" />
                          Online
                        </span>
                      </div>
                    </div>

                    <p className="text-muted text-xs leading-relaxed mb-4">
                      {tr.bio || "Certified fitness expert offering personalized progressive overloading splits, posture monitoring, and nutrition guidance."}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted mb-4">
                      <span className="flex items-center gap-1 text-yellow">
                        <Star size={13} fill="currentColor" /> {tr.rating || 5.0} Rating
                      </span>
                      <span>• {tr.experience || "5+ yrs exp"}</span>
                      <span>• {tr.clients || 10}+ Active Athletes</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectCoach(tr)}
                    className="btn btn-primary btn-sm w-full flex items-center justify-center gap-2"
                    style={{ borderRadius: "10px" }}
                  >
                    <UserCheck size={16} />
                    <span>{isCurrent ? "Resume Chat with Coach " + tr.name : "Start Chat with Coach " + tr.name}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* CASE 2: ACTIVE 1-ON-1 COACH CHAT WINDOW */
        <div
          className="dash-card p-0 overflow-hidden flex flex-col"
          style={{
            height: "calc(100vh - 210px)",
            minHeight: "600px",
            border: "1px solid rgba(85, 231, 255, 0.25)",
            boxShadow: "0 20px 50px -15px rgba(0, 0, 0, 0.7)",
            background: "rgba(11, 14, 22, 0.95)",
            borderRadius: "18px",
          }}
        >
          {/* Active Chat Header */}
          <div
            className="px-6 py-4 flex items-center justify-between border-b flex-wrap gap-3"
            style={{
              borderColor: "rgba(255, 255, 255, 0.08)",
              background: "linear-gradient(135deg, rgba(16, 22, 38, 0.95), rgba(12, 16, 26, 0.95))",
            }}
          >
            <div className="flex items-center gap-3.5">
              <div
                className="trainer-avatar-large flex items-center justify-center font-bold text-black"
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  fontSize: "1.2rem",
                  background: "var(--blue-vibrant)",
                  boxShadow: "0 0 16px rgba(56, 189, 248, 0.4)",
                }}
              >
                {coach.name?.charAt(0) || "C"}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h4 className="font-bold text-white text-base leading-none">
                    Coach {coach.name}
                  </h4>
                  <span className="badge badge-green text-2xs py-0.5 px-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green inline-block animate-pulse" />
                    Online & Active
                  </span>
                </div>
                <p className="text-muted text-xs mt-1">
                  {coach.specialty || "Certified Personal Trainer"} • 1-on-1 Dedicated Support
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/member/workout"
                className="btn btn-secondary btn-sm flex items-center gap-1.5"
                style={{ borderRadius: "10px", fontSize: "12px" }}
                title="View workout program assigned by your coach"
              >
                <Dumbbell size={13} /> View Workout
              </Link>
              <button
                type="button"
                onClick={() => setIsSwitchingCoach(true)}
                className="btn btn-secondary btn-sm text-cyan flex items-center gap-1.5 hover:bg-cyan/10"
                style={{ borderRadius: "10px", fontSize: "12px" }}
                title="Switch to another certified trainer"
              >
                <RotateCw size={13} /> Change Coach
              </button>
            </div>
          </div>

          {/* Message Thread Area */}
          <div
            className="flex-1 p-6 overflow-y-auto flex flex-col gap-4"
            style={{
              background: "radial-gradient(ellipse at top, rgba(14, 20, 36, 0.6) 0%, rgba(8, 10, 16, 0.95) 100%)",
            }}
          >
            {messages.length === 0 ? (
              <div className="text-center my-auto py-12 px-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{
                    background: "rgba(56, 189, 248, 0.12)",
                    color: "#38bdf8",
                    border: "1px solid rgba(56, 189, 248, 0.25)",
                  }}
                >
                  <MessageSquare size={28} />
                </div>
                <h5 className="font-bold text-white text-lg mb-1.5">Connected to Coach {coach.name}</h5>
                <p className="text-muted text-xs max-w-md mx-auto leading-relaxed">
                  Start the conversation below! Ask about your form, request routine adjustments, or share workout feedback.
                </p>
              </div>
            ) : (
              messages.map((m, idx) => {
                const isMe =
                  m.senderRole === "member" ||
                  m.senderId === memberId ||
                  m.senderId === currentUser.id ||
                  m.senderId === currentUser._id ||
                  m.senderName === currentUser.name ||
                  m.senderName === "Member";

                return (
                  <div
                    key={m.id || idx}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-2xs text-muted font-medium">
                        {isMe ? "You" : `Coach ${coach.name}`}
                      </span>
                      <span className="text-2xs text-muted opacity-60">
                        {m.createdAt
                          ? new Date(m.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>

                    <div
                      className="p-3.5 rounded-2xl max-w-lg text-sm leading-relaxed"
                      style={{
                        background: isMe
                          ? "linear-gradient(135deg, #0284c7, #1d4ed8)"
                          : "rgba(22, 28, 44, 0.92)",
                        border: isMe
                          ? "1px solid rgba(56, 189, 248, 0.45)"
                          : "1px solid rgba(85, 231, 255, 0.2)",
                        color: "#ffffff",
                        borderBottomRightRadius: isMe ? "4px" : "18px",
                        borderBottomLeftRadius: isMe ? "18px" : "4px",
                        boxShadow: isMe
                          ? "0 4px 16px rgba(37, 99, 235, 0.35)"
                          : "0 4px 16px rgba(0, 0, 0, 0.35)",
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex flex-col items-start">
                <span className="text-2xs text-muted font-medium mb-1 px-1">Coach {coach.name} is typing...</span>
                <div
                  className="p-3 px-4 rounded-2xl flex items-center gap-1.5"
                  style={{
                    background: "rgba(22, 28, 44, 0.92)",
                    border: "1px solid rgba(85, 231, 255, 0.2)",
                    borderRadius: "18px",
                    borderBottomLeftRadius: "4px",
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-cyan inline-block animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-cyan inline-block animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-cyan inline-block animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies Strip */}
          <div
            className="px-6 py-2.5 flex items-center gap-2 overflow-x-auto border-t"
            style={{
              borderColor: "rgba(255, 255, 255, 0.08)",
              background: "rgba(14, 18, 28, 0.95)",
            }}
          >
            <span className="text-2xs text-muted font-bold whitespace-nowrap">Suggested:</span>
            {quickReplies.map((qr, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(qr)}
                className="btn btn-secondary btn-xs whitespace-nowrap text-xs cursor-pointer"
                style={{
                  padding: "5px 12px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.04)",
                  borderColor: "rgba(255, 255, 255, 0.12)",
                }}
              >
                {qr}
              </button>
            ))}
          </div>

          {/* Message Input Form */}
          <form
            onSubmit={handleFormSubmit}
            className="p-4 px-6 border-t flex items-center gap-3"
            style={{
              borderColor: "rgba(255, 255, 255, 0.08)",
              background: "rgba(16, 20, 32, 0.98)",
            }}
          >
            <input
              type="text"
              placeholder={`Message Coach ${coach.name}... (Press Enter to send)`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="form-input flex-1 text-sm py-2.5 px-4"
              style={{
                borderRadius: "12px",
                height: "46px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#fff",
              }}
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="btn btn-primary btn-sm px-6 flex items-center gap-2"
              style={{ borderRadius: "12px", height: "46px", fontWeight: "700" }}
            >
              <Send size={15} />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
