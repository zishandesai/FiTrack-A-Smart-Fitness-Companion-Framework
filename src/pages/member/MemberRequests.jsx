import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare,
  Sparkles,
  FileText,
  X,
  Send,
  HelpCircle,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import {
  getAdminRequests,
  createAdminRequest,
} from "../../services/mockData";

export default function MemberRequests() {
  const [requests, setRequests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [notification, setNotification] = useState("");

  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("fittrack_user") || "{}");
    } catch {
      return {};
    }
  });

  const memberId = currentUser.id || currentUser._id || currentUser.email || "member_default";

  const [formData, setFormData] = useState({
    type: "membership_upgrade",
    title: "",
    details: "",
  });

  const loadRequests = async () => {
    try {
      const api = (await import("../../services/api")).default;
      const res = await api.get("/requests/my");
      if (res.data?.success && Array.isArray(res.data?.requests)) {
        setRequests(res.data.requests);
        return;
      }
    } catch {
      // Fallback
    }

    const localReqs = getAdminRequests({ requesterId: memberId, requesterEmail: currentUser.email });
    setRequests(localReqs);
  };

  useEffect(() => {
    loadRequests();

    const handleReq = () => {
      loadRequests();
    };

    window.addEventListener("fittrack:request-changed", handleReq);
    return () => window.removeEventListener("fittrack:request-changed", handleReq);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.details.trim()) return;

    try {
      const api = (await import("../../services/api")).default;
      await api.post("/requests", {
        type: formData.type,
        title: formData.title.trim(),
        details: formData.details.trim(),
      });
    } catch {
      // Fallback
    }

    createAdminRequest({
      requesterId: memberId,
      requesterName: currentUser.name || "Member",
      requesterEmail: currentUser.email || "member@fittrack.com",
      requesterRole: "member",
      type: formData.type,
      title: formData.title.trim(),
      details: formData.details.trim(),
    });

    setShowModal(false);
    setFormData({
      type: "membership_upgrade",
      title: "",
      details: "",
    });
    setNotification("✓ Your request was submitted to the Gym Administrator. You will be notified once reviewed.");
    setTimeout(() => setNotification(""), 5000);
    loadRequests();
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "membership_upgrade":
        return "Membership Upgrade / PRO Tier";
      case "membership_renewal":
        return "Membership Renewal";
      case "coach_change":
        return "Coach Change / Reassignment";
      case "custom_split":
        return "Custom Workout Split Approval";
      case "schedule_change":
        return "Time Slot / Schedule Request";
      default:
        return "General Desk Inquiry";
    }
  };

  return (
    <DashboardLayout
      title="Admin Requests & Approvals"
      subtitle="Submit requests for membership upgrades, coach reassignments, or plan changes, and track real-time Admin decisions."
    >
      {notification && (
        <div className="save-toast-pill mb-4">
          <CheckCircle2 size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="table-toolbar">
        <div>
          <h4 className="font-bold text-white text-base">Your Submitted Petitions</h4>
          <span className="text-muted text-xs">
            {requests.length} total request(s) submitted to Administration
          </span>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary btn-sm flex items-center gap-1.5"
        >
          <Plus size={15} /> Submit Request to Admin
        </button>
      </div>

      {/* Request Cards Grid */}
      <div className="mt-4 flex flex-col gap-3">
        {requests.length === 0 ? (
          <div className="dash-card text-center py-16">
            <HelpCircle size={40} className="mx-auto text-muted mb-3 opacity-40" />
            <h4 className="text-lg font-bold text-white mb-1">No Requests Submitted Yet</h4>
            <p className="text-muted text-xs max-w-sm mx-auto mb-4">
              Need a membership upgrade, a change in coach, or custom workout review? Submit a petition directly to the gym administrator.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary btn-sm mx-auto flex items-center gap-1.5"
            >
              <Plus size={15} /> Create First Request
            </button>
          </div>
        ) : (
          requests.map((r) => {
            const isApproved = r.status === "approved";
            const isRejected = r.status === "rejected";
            const isPending = !isApproved && !isRejected;

            return (
              <div
                key={r.id || r._id}
                className="dash-card p-4 transition-all"
                style={{
                  borderLeft: isApproved
                    ? "4px solid #b7ff3c"
                    : isRejected
                    ? "4px solid #ff5c67"
                    : "4px solid #ffaa00",
                }}
              >
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="badge badge-cyan text-2xs">
                        {getTypeLabel(r.type)}
                      </span>
                      <h4 className="font-bold text-white text-base">{r.title}</h4>
                    </div>
                    <span className="text-muted text-2xs mt-1 block">
                      Submitted on:{" "}
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Recently"}
                    </span>
                  </div>

                  <div>
                    {isApproved && (
                      <span className="badge badge-green text-xs font-bold py-1 px-2.5 flex items-center gap-1">
                        <CheckCircle2 size={13} /> APPROVED
                      </span>
                    )}
                    {isRejected && (
                      <span className="badge badge-danger text-xs font-bold py-1 px-2.5 flex items-center gap-1">
                        <XCircle size={13} /> REJECTED
                      </span>
                    )}
                    {isPending && (
                      <span className="badge badge-warning text-xs font-bold py-1 px-2.5 flex items-center gap-1">
                        <Clock size={13} /> PENDING ADMIN REVIEW
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-muted text-xs mt-3 leading-relaxed bg-white/5 p-3 rounded-lg">
                  {r.details}
                </p>

                {/* Admin Feedback Section */}
                {r.adminNote && (
                  <div
                    className="mt-3 p-3 rounded-lg flex items-start gap-2.5"
                    style={{
                      background: isApproved
                        ? "rgba(183, 255, 60, 0.08)"
                        : "rgba(255, 92, 103, 0.08)",
                      border: isApproved
                        ? "1px solid rgba(183, 255, 60, 0.25)"
                        : "1px solid rgba(255, 92, 103, 0.25)",
                    }}
                  >
                    <div
                      className="mt-0.5"
                      style={{ color: isApproved ? "#b7ff3c" : "#ff5c67" }}
                    >
                      {isApproved ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <strong
                          className="text-xs uppercase tracking-wider font-bold"
                          style={{ color: isApproved ? "#b7ff3c" : "#ff5c67" }}
                        >
                          Administrator Note & Decision
                        </strong>
                        {r.reviewedAt && (
                          <span className="text-3xs text-muted">
                            ({new Date(r.reviewedAt).toLocaleDateString()})
                          </span>
                        )}
                      </div>
                      <p className="text-white text-xs mt-1 font-medium leading-relaxed">
                        {r.adminNote}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-lg">
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <FileText className="text-primary" size={20} />
                <h3 className="font-bold text-lg text-white">Submit Request to Admin</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body space-y-4">
              <div className="form-group">
                <label className="form-label">Request Type</label>
                <select
                  className="form-input"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="membership_upgrade">👑 Upgrade Membership to PRO / Premium</option>
                  <option value="membership_renewal">🔄 Membership Renewal</option>
                  <option value="coach_change">🏋️ Change / Reassign Personal Coach</option>
                  <option value="custom_split">📋 Request Custom Workout Split Approval</option>
                  <option value="schedule_change">⏰ Gym Schedule / Training Slot Inquiry</option>
                  <option value="general">💬 General Front Desk Request</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Title / Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Requesting PRO tier upgrade for personal coaching"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Details / Justification</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain your request in detail. Admin will review and provide a direct decision with feedback notes."
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="modal-footer pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                >
                  <Send size={14} /> Submit to Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
