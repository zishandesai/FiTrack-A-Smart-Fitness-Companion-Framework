import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Send,
  User,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  Phone,
  Mail,
  ShieldCheck,
  CheckCheck,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import {
  getTrainersList,
  getConversationMessages,
  sendChatMessage,
  getMembersList,
} from "../../services/mockData";

export default function MemberChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [coach, setCoach] = useState(null);
  const messagesEndRef = useRef(null);

  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("fittrack_user") || "{}");
    } catch {
      return {};
    }
  });

  const memberId = currentUser.id || currentUser._id || currentUser.email || "member_default";

  // Fetch coach and message history
  const loadChatData = async () => {
    let coachObj = null;

    // Check backend first
    try {
      const api = (await import("../../services/api")).default;
      const contactsRes = await api.get("/chat/contacts");
      if (contactsRes.data?.success && contactsRes.data?.contacts?.length > 0) {
        coachObj = contactsRes.data.contacts[0];
        setCoach(coachObj);
      }
    } catch {
      // Local fallback
    }

    if (!coachObj) {
      // Find coach from trainers list using trainerId
      const trainers = getTrainersList();
      const members = getMembersList();
      const currentMem = members.find((m) => m.email === currentUser.email || m.name === currentUser.name);
      const targetTrainerId = currentMem?.trainerId || currentUser.trainerId;

      coachObj = trainers.find(
        (t) => t.id === targetTrainerId || t._id === targetTrainerId || t.name === currentUser.trainerName
      );
      if (coachObj) {
        setCoach(coachObj);
      }
    }

    const coachId = coachObj?._id || coachObj?.id;
    if (coachId) {
      // Fetch conversation messages
      try {
        const api = (await import("../../services/api")).default;
        const convRes = await api.get(`/chat/conversation/${coachId}`);
        if (convRes.data?.success && Array.isArray(convRes.data?.messages)) {
          setMessages(convRes.data.messages);
          return;
        }
      } catch {
        // Local fallback
      }

      const localMsgs = getConversationMessages(memberId, coachId);
      setMessages(localMsgs);
    }
  };

  useEffect(() => {
    loadChatData();

    const handleChat = () => {
      loadChatData();
    };

    window.addEventListener("fittrack:chat-changed", handleChat);
    window.addEventListener("fittrack:assignment-changed", handleChat);

    return () => {
      window.removeEventListener("fittrack:chat-changed", handleChat);
      window.removeEventListener("fittrack:assignment-changed", handleChat);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (textToSend) => {
    const content = typeof textToSend === "string" ? textToSend : input;
    if (!content || !content.trim() || !coach) return;

    const coachId = coach._id || coach.id;

    // Optimistic UI update
    const newMsg = {
      id: `temp_${Date.now()}`,
      senderId: memberId,
      receiverId: coachId,
      senderName: currentUser.name || "Member",
      senderRole: "member",
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    // Send to backend
    try {
      const api = (await import("../../services/api")).default;
      await api.post("/chat/send", {
        receiverId: coachId,
        content: content.trim(),
      });
    } catch {
      // Local fallback
    }

    sendChatMessage({
      senderId: memberId,
      receiverId: coachId,
      senderName: currentUser.name || "Member",
      senderRole: "member",
      content: content.trim(),
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
      subtitle="Direct 1-on-1 private messaging with your assigned personal trainer."
    >
      {!coach ? (
        <div className="dash-card text-center py-16">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(85, 231, 255, 0.1)", color: "#55e7ff" }}
          >
            <MessageSquare size={32} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Coach Assigned Yet</h3>
          <p className="text-muted text-sm max-w-md mx-auto mb-6">
            You need an assigned personal trainer to start direct 1-on-1 messaging. Active PRO members can select any certified coach from the directory!
          </p>
          <Link to="/member/coaches" className="btn btn-primary btn-sm mx-auto inline-flex items-center gap-2">
            <Sparkles size={16} /> Browse Coaches & Connect
          </Link>
        </div>
      ) : (
        <div
          className="dash-card p-0 overflow-hidden flex flex-col"
          style={{
            height: "calc(100vh - 220px)",
            minHeight: "580px",
            border: "1px solid rgba(85, 231, 255, 0.2)",
            boxShadow: "0 20px 50px -15px rgba(0, 0, 0, 0.6)",
            background: "rgba(12, 15, 22, 0.9)",
          }}
        >
          {/* Chat Header */}
          <div
            className="px-6 py-4 flex items-center justify-between border-b"
            style={{
              borderColor: "rgba(255, 255, 255, 0.08)",
              background: "rgba(18, 22, 34, 0.85)",
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="trainer-avatar-large flex items-center justify-center font-bold text-black"
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  fontSize: "1.2rem",
                  background: "var(--green)",
                  boxShadow: "0 0 16px rgba(183, 255, 60, 0.3)",
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
                    Online
                  </span>
                </div>
                <p className="text-muted text-xs mt-1">
                  {coach.specialty || "Certified Personal Trainer"} • 1-on-1 Direct Chat
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/member/coaches"
                className="btn btn-secondary btn-sm text-cyan flex items-center gap-1.5 hover:bg-cyan/10"
                style={{ borderRadius: "10px" }}
                title="View coach profile or change coach"
              >
                <User size={14} /> View Coach Profile
              </Link>
            </div>
          </div>

          {/* Messages Area */}
          <div
            className="flex-1 p-6 overflow-y-auto flex flex-col gap-4"
            style={{ background: "rgba(9, 11, 16, 0.7)" }}
          >
            {messages.length === 0 ? (
              <div className="text-center my-auto py-12 px-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{
                    background: "rgba(183, 255, 60, 0.1)",
                    color: "#b7ff3c",
                    border: "1px solid rgba(183, 255, 60, 0.2)",
                  }}
                >
                  <MessageSquare size={28} />
                </div>
                <h5 className="font-bold text-white text-lg mb-1.5">Start the Conversation</h5>
                <p className="text-muted text-xs max-w-md mx-auto leading-relaxed">
                  Ask Coach {coach.name} about your workouts, form tips, diet advice, or request routine changes.
                </p>
              </div>
            ) : (
              messages.map((m, idx) => {
                const isMe =
                  m.senderRole === "member" ||
                  m.senderId === memberId ||
                  m.senderName === currentUser.name;

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
                      className="p-3.5 rounded-2xl max-w-md text-sm leading-relaxed"
                      style={{
                        background: isMe
                          ? "linear-gradient(135deg, #2b4515, #192a0d)"
                          : "rgba(26, 32, 48, 0.9)",
                        border: isMe
                          ? "1px solid rgba(183, 255, 60, 0.3)"
                          : "1px solid rgba(85, 231, 255, 0.2)",
                        color: isMe ? "#e8ffb0" : "#ffffff",
                        borderBottomRightRadius: isMe ? "4px" : "16px",
                        borderBottomLeftRadius: isMe ? "16px" : "4px",
                        boxShadow: isMe
                          ? "0 4px 14px rgba(183, 255, 60, 0.12)"
                          : "0 4px 14px rgba(0, 0, 0, 0.3)",
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies chip bar */}
          <div
            className="px-6 py-3 flex items-center gap-2.5 overflow-x-auto border-t"
            style={{
              borderColor: "rgba(255, 255, 255, 0.08)",
              background: "rgba(14, 18, 28, 0.95)",
            }}
          >
            <span className="text-xs text-muted font-bold whitespace-nowrap">Quick:</span>
            {quickReplies.map((qr, i) => (
              <button
                key={i}
                onClick={() => handleSend(qr)}
                className="btn btn-secondary btn-xs whitespace-nowrap"
                style={{
                  padding: "6px 14px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.04)",
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  fontSize: "12px",
                }}
              >
                {qr}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div
            className="p-4 px-6 border-t flex items-center gap-3"
            style={{
              borderColor: "rgba(255, 255, 255, 0.08)",
              background: "rgba(18, 22, 34, 0.98)",
            }}
          >
            <input
              type="text"
              placeholder={`Message Coach ${coach.name}... (Press Enter to send)`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="form-input flex-1 text-sm py-2.5 px-4"
              style={{
                borderRadius: "12px",
                height: "44px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#fff",
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="btn btn-primary btn-sm px-5 flex items-center gap-2"
              style={{ borderRadius: "12px", height: "44px" }}
            >
              <Send size={15} />
              <span>Send</span>
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
