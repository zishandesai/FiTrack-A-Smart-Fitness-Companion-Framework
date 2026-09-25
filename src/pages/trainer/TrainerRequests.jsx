import { useState, useEffect } from "react";
import {
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  X,
  Send,
  HelpCircle,
  Wrench,
  Dumbbell,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import {
  getAdminRequests,
  createAdminRequest,
} from "../../services/mockData";

export default function TrainerRequests() {
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

  const trainerId = currentUser.id || currentUser._id || currentUser.email || "trainer_default";

  const [formData, setFormData] = useState({
    type: "equipment_request",
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

    const localReqs = getAdminRequests({ requesterId: trainerId, requesterEmail: currentUser.email });
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
      requesterId: trainerId,
      requesterName: currentUser.name || "Coach",
      requesterEmail: currentUser.email || "coach@fittrack.com",
      requesterRole: "trainer",
      type: formData.type,
      title: formData.title.trim(),
      details: formData.details.trim(),
    });

    setShowModal(false);
    setFormData({
      type: "equipment_request",
      title: "",
      details: "",
    });
    setNotification("✓ Staff request submitted to Admin. You will see their decision and feedback note right here.");
    setTimeout(() => setNotification(""), 5000);
    loadRequests();
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "equipment_request":
        return "Equipment Repair & Gear Requisition";
      case "schedule_change":
        return "Coaching Slot / Class Schedule";
      case "custom_split":
        return "Special Program / Athlete Exemption";
      default:
        return "General Administration Request";
    }
  };

  return (
    <DashboardLayout
      title="Staff Petitions & Approvals"
      subtitle="Submit requests to gym management for equipment maintenance, new gear, class slots, or client approvals."
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
          <h4 className="font-bold text-white text-base">Your Staff Requests</h4>
          <span className="text-muted text-xs">
            {requests.length} request(s) submitted to Gym Management
          </span>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary btn-sm flex items-center gap-1.5"
        >
          <Plus size={15} /> Submit Staff Request
        </button>
      </div>

      {/* Request Cards Grid */}
      <div className="mt-4 flex flex-col gap-3">
        {requests.length === 0 ? (
          <div className="dash-card text-center py-16">
            <Wrench size={40} className="mx-auto text-muted mb-3 opacity-40" />
            <h4 className="text-lg font-bold text-white mb-1">No Staff Petitions Submitted</h4>
            <p className="text-muted text-xs max-w-sm mx-auto mb-4">
              Need dumbbell replacements, cable machine servicing, or special schedule slots? Send a direct petition to gym administration.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary btn-sm mx-auto flex items-center gap-1.5"
            >
              <Plus size={15} /> Submit Staff Request
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
                        <CheckCircle2 size={13} /> APPROVED BY ADMIN
                      </span>
                    )}
                    {isRejected && (
                      <span className="badge badge-danger text-xs font-bold py-1 px-2.5 flex items-center gap-1">
                        <XCircle size={13} /> REJECTED BY ADMIN
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
                <h3 className="font-bold text-lg text-white">Submit Staff Request to Admin</h3>
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
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="equipment_request">🔧 Gym Equipment Maintenance / Repair</option>
                  <option value="equipment_request">🏋️ New Equipment / Accessory Purchase</option>
                  <option value="schedule_change">⏰ Personal Training Slot / Studio Booking</option>
                  <option value="custom_split">📋 Special Athlete Exception / Program Approval</option>
                  <option value="general">💬 General Management Petition</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Subject / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lat pulldown cable fraying - urgent repair requested"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Details / Specifications</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide complete details, station location, or reasons for this request."
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
                  <Send size={14} /> Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
