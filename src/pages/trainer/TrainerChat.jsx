import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Send,
  User,
  Search,
  MessageSquare,
  Dumbbell,
  Users,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import {
  getMembersList,
  getConversationMessages,
  sendChatMessage,
} from "../../services/mockData";

export default function TrainerChat() {
  const [athletes, setAthletes] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef(null);

  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("fittrack_user") || "{}");
    } catch {
      return {};
    }
  });

  const trainerId = currentUser.id || currentUser._id || currentUser.email || "trainer_default";

  const loadAthletes = async () => {
    let list = [];
    try {
      const api = (await import("../../services/api")).default;
      const res = await api.get("/chat/contacts");
      if (res.data?.success && Array.isArray(res.data?.contacts)) {
        list = res.data.contacts.map((c) => ({
          ...c,
          id: c._id || c.id,
        }));
      }
    } catch {
      // Fallback to local
    }

    if (list.length === 0) {
      const allMembers = getMembersList();
      list = allMembers.filter(
        (m) =>
          m.trainerId === trainerId ||
          m.trainerId === currentUser._id ||
          m.trainerId === currentUser.id ||
          m.trainerName === currentUser.name
      );
    }

    setAthletes(list);
    if (list.length > 0 && !selectedAthlete) {
      setSelectedAthlete(list[0]);
    }
  };

  const loadMessagesForAthlete = async (ath) => {
    if (!ath) return;
    const athId = ath.id || ath._id;

    try {
      const api = (await import("../../services/api")).default;
      const res = await api.get(`/chat/conversation/${athId}`);
      if (res.data?.success && Array.isArray(res.data?.messages)) {
        setMessages(res.data.messages);
        return;
      }
    } catch {
      // Fallback
    }

    const localMsgs = getConversationMessages(trainerId, athId);
    setMessages(localMsgs);
  };

  useEffect(() => {
    loadAthletes();

    const handleChat = () => {
      loadAthletes();
      if (selectedAthlete) {
        loadMessagesForAthlete(selectedAthlete);
      }
    };

    window.addEventListener("fittrack:chat-changed", handleChat);
    window.addEventListener("fittrack:assignment-changed", handleChat);
    return () => {
      window.removeEventListener("fittrack:chat-changed", handleChat);
      window.removeEventListener("fittrack:assignment-changed", handleChat);
    };
  }, []);

  useEffect(() => {
    if (selectedAthlete) {
      loadMessagesForAthlete(selectedAthlete);
    }
  }, [selectedAthlete]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (customText) => {
    const content = typeof customText === "string" ? customText : input;
    if (!content || !content.trim() || !selectedAthlete) return;

    const athId = selectedAthlete.id || selectedAthlete._id;

    const newMsg = {
      id: `temp_${Date.now()}`,
      senderId: trainerId,
      receiverId: athId,
      senderName: currentUser.name || "Coach",
      senderRole: "trainer",
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    try {
      const api = (await import("../../services/api")).default;
      await api.post("/chat/send", {
        receiverId: athId,
        content: content.trim(),
      });
    } catch {
      // Fallback
    }

    sendChatMessage({
      senderId: trainerId,
      receiverId: athId,
      senderName: currentUser.name || "Coach",
      senderRole: "trainer",
      content: content.trim(),
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickCoachReplies = [
    "Great form on your lifts today! 🔥",
    "Remember to stay hydrated (3L+) 💧",
    "I'll adjust your volume for tomorrow 📋",
    "Focus on slow eccentric tempo on squats 🏋️",
  ];

  const filteredAthletes = athletes.filter(
    (a) =>
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase()) ||
      a.goal?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout
      title="Athlete Communication Hub"
      subtitle="Send instructions, workout guidance, and motivational check-ins to your assigned athletes."
    >
      <div
        className="dash-card p-0 overflow-hidden flex flex-col md:flex-row"
        style={{ height: "calc(100vh - 240px)", minHeight: "580px", border: "1px solid rgba(85, 231, 255, 0.2)" }}
      >
        {/* Left Sidebar: Athlete Roster */}
        <div
          className="w-full md:w-80 border-b md:border-b-0 md:border-r flex flex-col"
          style={{
            borderColor: "var(--border)",
            background: "rgba(14, 18, 28, 0.8)",
          }}
        >
          <div className="p-3 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="search-input-wrap mb-2">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                placeholder="Search athlete..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input text-xs py-1.5"
              />
            </div>
            <div className="flex items-center justify-between text-2xs text-muted font-semibold px-1">
              <span>ASSIGNED ATHLETES</span>
              <span>{athletes.length} Total</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {athletes.length === 0 ? (
              <div className="p-6 text-center text-muted text-xs">
                <Users size={28} className="mx-auto mb-2 opacity-50 text-cyan" />
                <p className="font-bold text-white mb-1">No Athletes Assigned</p>
                <p className="mb-4">Go to your Roster to claim available PRO members!</p>
                <Link to="/trainer/members" className="btn btn-primary btn-2xs">
                  Browse PRO Members
                </Link>
              </div>
            ) : (
              filteredAthletes.map((ath) => {
                const isSelected =
                  selectedAthlete &&
                  (selectedAthlete.id === ath.id || selectedAthlete._id === ath._id);

                return (
                  <div
                    key={ath.id || ath._id}
                    onClick={() => setSelectedAthlete(ath)}
                    className="p-3 border-b cursor-pointer transition-all flex items-center gap-3 hover:bg-white/5"
                    style={{
                      borderColor: "var(--border)",
                      background: isSelected ? "rgba(85, 231, 255, 0.12)" : "transparent",
                      borderLeft: isSelected ? "3px solid #55e7ff" : "3px solid transparent",
                    }}
                  >
                    <div className="client-avatar-sm" style={{ width: "38px", height: "38px" }}>
                      {ath.name?.charAt(0) || "A"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <strong className="text-white text-xs truncate block">{ath.name}</strong>
                        {ath.plan && <span className="badge badge-cyan text-3xs">{ath.plan}</span>}
                      </div>
                      <p className="text-muted text-2xs truncate mt-0.5">
                        {ath.lastMessage || `Goal: ${ath.goal || "Fitness"}`}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Main Area: Conversation Thread */}
        <div className="flex-1 flex flex-col bg-background/50">
          {!selectedAthlete ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <MessageSquare size={36} className="mx-auto text-muted mb-3 opacity-40" />
                <h4 className="text-lg font-bold text-white mb-1">Select an Athlete</h4>
                <p className="text-muted text-xs max-w-sm mx-auto">
                  Pick an athlete from your roster on the left to review messages and provide coaching guidance.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Active Conversation Header */}
              <div
                className="p-4 border-b flex items-center justify-between"
                style={{
                  borderColor: "var(--border)",
                  background: "rgba(18, 22, 34, 0.9)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="client-avatar-sm" style={{ width: "42px", height: "42px" }}>
                    {selectedAthlete.name?.charAt(0) || "A"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">{selectedAthlete.name}</h4>
                      <span className="badge badge-green text-2xs">Assigned Athlete</span>
                    </div>
                    <p className="text-muted text-xs mt-0.5">
                      Goal: <strong className="text-primary">{selectedAthlete.goal || "Strength"}</strong> • {selectedAthlete.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/trainer/assign-workout?member=${encodeURIComponent(selectedAthlete.name)}`}
                    className="btn btn-secondary btn-xs text-primary flex items-center gap-1"
                  >
                    <Dumbbell size={13} /> Assign Routine
                  </Link>
                </div>
              </div>

              {/* Message Feed */}
              <div
                className="flex-1 p-4 overflow-y-auto flex flex-col gap-3"
                style={{ background: "rgba(10, 12, 18, 0.6)" }}
              >
                {messages.length === 0 ? (
                  <div className="text-center my-auto py-8">
                    <MessageSquare size={24} className="mx-auto text-muted mb-2 opacity-50" />
                    <p className="font-bold text-white text-sm mb-1">
                      No Messages with {selectedAthlete.name} Yet
                    </p>
                    <p className="text-muted text-xs max-w-xs mx-auto">
                      Send a welcoming message or review their upcoming workout split to get them fired up!
                    </p>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const isMe =
                      m.senderRole === "trainer" ||
                      m.senderId === trainerId ||
                      m.senderName === currentUser.name;

                    return (
                      <div
                        key={m.id || idx}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-2xs text-muted font-medium">
                            {isMe ? "You (Coach)" : selectedAthlete.name}
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
                          className="p-3 rounded-2xl max-w-md text-sm leading-relaxed"
                          style={{
                            background: isMe
                              ? "linear-gradient(135deg, #1b3548, #0e2230)"
                              : "rgba(26, 32, 48, 0.9)",
                            border: isMe
                              ? "1px solid rgba(85, 231, 255, 0.35)"
                              : "1px solid rgba(255, 255, 255, 0.1)",
                            color: "#ffffff",
                            borderBottomRightRadius: isMe ? "4px" : "16px",
                            borderBottomLeftRadius: isMe ? "16px" : "4px",
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

              {/* Quick coach prompts */}
              <div
                className="px-6 py-3 flex items-center gap-2.5 overflow-x-auto border-t"
                style={{
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  background: "rgba(14, 18, 28, 0.95)",
                }}
              >
                <span className="text-xs text-muted font-bold whitespace-nowrap">Coach Cue:</span>
                {quickCoachReplies.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="btn btn-secondary btn-xs whitespace-nowrap"
                    style={{
                      padding: "6px 14px",
                      borderRadius: "999px",
                      background: "rgba(255, 255, 255, 0.04)",
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      fontSize: "12px",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div
                className="p-4 px-6 border-t flex items-center gap-3"
                style={{
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  background: "rgba(18, 22, 34, 0.98)",
                }}
              >
                <input
                  type="text"
                  placeholder={`Send instructions to ${selectedAthlete.name}... (Press Enter)`}
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
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
