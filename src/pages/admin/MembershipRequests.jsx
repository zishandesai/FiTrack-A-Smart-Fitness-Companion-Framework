import { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ShieldCheck,
  Banknote,
  AlertCircle,
  FileText,
  User,
  Wrench,
  Dumbbell,
  MessageSquare,
  Send,
  X,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import {
  getMemberships,
  approveMembership,
  rejectMembership,
  revokeMembership,
  getAdminRequests,
  updateAdminRequestStatus,
} from "../../services/mockData";

export default function MembershipRequests() {
  const [activeTab, setActiveTab] = useState("petitions"); // "petitions" or "memberships"
  const [membershipReqs, setMembershipReqs] = useState([]);
  const [petitions, setPetitions] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [notification, setNotification] = useState("");

  // Review modal state for petitions
  const [reviewingItem, setReviewingItem] = useState(null); // { item, action: 'approved' | 'rejected' }
  const [adminNoteInput, setAdminNoteInput] = useState("");

  const refreshData = async () => {
    // 1. Memberships
    setMembershipReqs(getMemberships());
    try {
      const api = (await import("../../services/api")).default;
      const memRes = await api.get("/memberships");
      if (memRes.data?.success && Array.isArray(memRes.data?.memberships)) {
        setMembershipReqs(memRes.data.memberships);
      }
    } catch {
      // local
    }

    // 2. Petitions & Requests
    setPetitions(getAdminRequests());
    try {
      const api = (await import("../../services/api")).default;
      const petRes = await api.get("/requests");
      if (petRes.data?.success && Array.isArray(petRes.data?.requests)) {
        setPetitions(petRes.data.requests);
      }
    } catch {
      // local
    }
  };

  useEffect(() => {
    refreshData();
    window.addEventListener("fittrack:membership-changed", refreshData);
    window.addEventListener("fittrack:request-changed", refreshData);
    return () => {
      window.removeEventListener("fittrack:membership-changed", refreshData);
      window.removeEventListener("fittrack:request-changed", refreshData);
    };
  }, []);

  // Membership actions
  const handleApproveMembership = async (id, memberName, plan) => {
    try {
      const api = (await import("../../services/api")).default;
      await api.put(`/memberships/${id}/approve`);
    } catch {
      // local fallback
    }
    approveMembership(id);
    refreshData();
    setNotification(`✓ Cash confirmed! ${memberName}'s ${plan} membership is now ACTIVE.`);
    setTimeout(() => setNotification(""), 4000);
  };

  const handleRejectMembership = async (id, memberName) => {
    try {
      const api = (await import("../../services/api")).default;
      await api.put(`/memberships/${id}/reject`);
    } catch {
      // local fallback
    }
    rejectMembership(id);
    refreshData();
    setNotification(`✗ ${memberName}'s membership request has been rejected.`);
    setTimeout(() => setNotification(""), 4000);
  };

  const handleRevokeMembership = async (id, memberName) => {
    try {
      const api = (await import("../../services/api")).default;
      await api.put(`/memberships/${id}/revoke`);
    } catch {
      // local fallback
    }
    revokeMembership(id);
    refreshData();
    setNotification(`↺ ${memberName}'s membership marked as UNPAID.`);
    setTimeout(() => setNotification(""), 4000);
  };

  // Petition review
  const openReviewModal = (item, action) => {
    setReviewingItem({ item, action });
    setAdminNoteInput(
      action === "approved"
        ? "Approved by Admin. Changes take effect immediately."
        : "Rejected by Admin. Please contact the front desk for further details."
    );
  };

  const submitPetitionDecision = async (e) => {
    e.preventDefault();
    if (!reviewingItem) return;

    const { item, action } = reviewingItem;
    const itemId = item._id || item.id;

    try {
      const api = (await import("../../services/api")).default;
      await api.put(`/requests/${itemId}/review`, {
        status: action,
        adminNote: adminNoteInput.trim(),
      });
    } catch {
      // local fallback
    }

    updateAdminRequestStatus(itemId, action, adminNoteInput.trim());
    refreshData();
    setReviewingItem(null);
    setAdminNoteInput("");
    setNotification(`✓ Request marked as ${action.toUpperCase()} with your feedback note.`);
    setTimeout(() => setNotification(""), 4000);
  };

  // Filtered lists
  const pendingPetitionsCount = petitions.filter((p) => p.status === "pending").length;
  const pendingMembershipsCount = membershipReqs.filter((m) => m.status === "pending").length;

  const filteredPetitions = petitions.filter((p) => {
    const matchesFilter = filter === "all" || p.status === filter;
    const matchesRole = roleFilter === "all" || p.requesterRole === roleFilter;
    const matchesSearch =
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.requesterName?.toLowerCase().includes(search.toLowerCase()) ||
      p.details?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesRole && matchesSearch;
  });

  const filteredMemberships = membershipReqs.filter((r) => {
    const matchesFilter = filter === "all" || r.status === filter;
    const matchesSearch =
      r.memberName?.toLowerCase().includes(search.toLowerCase()) ||
      r.plan?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getTypeBadge = (type) => {
    switch (type) {
      case "membership_upgrade":
        return <span className="badge badge-cyan text-3xs">👑 Membership Upgrade</span>;
      case "coach_change":
        return <span className="badge badge-purple text-3xs">🏋️ Coach Change</span>;
      case "equipment_request":
        return <span className="badge badge-warning text-3xs">🔧 Equipment Request</span>;
      case "custom_split":
        return <span className="badge badge-green text-3xs">📋 Workout Split Approval</span>;
      default:
        return <span className="badge badge-secondary text-3xs">💬 General Inquiry</span>;
    }
  };

  return (
    <DashboardLayout
      title="Admin Approval & Request Center"
      subtitle="Review petitions from members and trainers, manage membership payments, and provide official feedback notes."
    >
      {notification && (
        <div className="save-toast-pill mb-4">
          <CheckCircle2 size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Tabs */}
      <div className="flex items-center gap-3 border-b mb-4 pb-2" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={() => setActiveTab("petitions")}
          className={`flex items-center gap-2 py-2 px-4 rounded-xl font-bold text-sm transition-all ${
            activeTab === "petitions"
              ? "bg-primary text-black shadow-lg"
              : "text-muted hover:text-white bg-white/5"
          }`}
        >
          <FileText size={16} />
          <span>Member & Trainer Petitions</span>
          {pendingPetitionsCount > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.2 text-2xs font-extrabold ${
                activeTab === "petitions" ? "bg-black text-white" : "bg-warning text-black"
              }`}
            >
              {pendingPetitionsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("memberships")}
          className={`flex items-center gap-2 py-2 px-4 rounded-xl font-bold text-sm transition-all ${
            activeTab === "memberships"
              ? "bg-primary text-black shadow-lg"
              : "text-muted hover:text-white bg-white/5"
          }`}
        >
          <Banknote size={16} />
          <span>Cash & Membership Desk</span>
          {pendingMembershipsCount > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.2 text-2xs font-extrabold ${
                activeTab === "memberships" ? "bg-black text-white" : "bg-warning text-black"
              }`}
            >
              {pendingMembershipsCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Member & Trainer Petitions */}
      {activeTab === "petitions" && (
        <>
          <div className="table-toolbar">
            <div className="search-input-wrap">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search petitions by title, requester, or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="form-input text-xs py-1 px-2.5"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ width: "auto" }}
              >
                <option value="all">All Roles</option>
                <option value="member">🧑 Members Only</option>
                <option value="trainer">🏋️ Trainers Only</option>
              </select>

              <div className="filter-btn-group">
                <button
                  className={`filter-btn ${filter === "pending" ? "active" : ""}`}
                  onClick={() => setFilter("pending")}
                >
                  Pending ({pendingPetitionsCount})
                </button>
                <button
                  className={`filter-btn ${filter === "approved" ? "active" : ""}`}
                  onClick={() => setFilter("approved")}
                >
                  Approved
                </button>
                <button
                  className={`filter-btn ${filter === "rejected" ? "active" : ""}`}
                  onClick={() => setFilter("rejected")}
                >
                  Rejected
                </button>
                <button
                  className={`filter-btn ${filter === "all" ? "active" : ""}`}
                  onClick={() => setFilter("all")}
                >
                  All History
                </button>
              </div>
            </div>
          </div>

          <div className="dash-card mt-4 p-0 overflow-hidden">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Requester</th>
                    <th>Role</th>
                    <th>Request Subject</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Admin Feedback Note</th>
                    <th className="text-right">Decision Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPetitions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted text-sm">
                        No petitions found in this filter view.
                      </td>
                    </tr>
                  ) : (
                    filteredPetitions.map((p) => {
                      const isPending = p.status === "pending";
                      const isApproved = p.status === "approved";
                      const isRejected = p.status === "rejected";

                      return (
                        <tr key={p.id || p._id}>
                          <td>
                            <div className="flex items-center gap-2.5">
                              <div className="client-avatar-sm">
                                {p.requesterName?.charAt(0) || "U"}
                              </div>
                              <div>
                                <strong className="text-white text-xs block">
                                  {p.requesterName}
                                </strong>
                                <span className="text-muted text-3xs">{p.requesterEmail}</span>
                              </div>
                            </div>
                          </td>

                          <td>
                            {p.requesterRole === "trainer" ? (
                              <span className="badge badge-cyan text-3xs">🏋️ Trainer</span>
                            ) : (
                              <span className="badge badge-green text-3xs">🧑 Member</span>
                            )}
                          </td>

                          <td>
                            <div>
                              <strong className="text-white text-xs block">{p.title}</strong>
                              <p className="text-muted text-2xs truncate max-w-xs mt-0.5">
                                {p.details}
                              </p>
                            </div>
                          </td>

                          <td>{getTypeBadge(p.type)}</td>

                          <td>
                            {isApproved && (
                              <span className="badge badge-green text-2xs font-bold flex items-center gap-1 w-fit">
                                <CheckCircle2 size={12} /> APPROVED
                              </span>
                            )}
                            {isRejected && (
                              <span className="badge badge-danger text-2xs font-bold flex items-center gap-1 w-fit">
                                <XCircle size={12} /> REJECTED
                              </span>
                            )}
                            {isPending && (
                              <span className="badge badge-warning text-2xs font-bold flex items-center gap-1 w-fit">
                                <Clock size={12} /> PENDING
                              </span>
                            )}
                          </td>

                          <td>
                            {p.adminNote ? (
                              <span className="text-xs text-white bg-white/5 py-1 px-2 rounded block max-w-xs truncate" title={p.adminNote}>
                                {p.adminNote}
                              </span>
                            ) : (
                              <span className="text-muted text-xs italic">Awaiting review</span>
                            )}
                          </td>

                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending ? (
                                <>
                                  <button
                                    onClick={() => openReviewModal(p, "approved")}
                                    className="btn btn-primary btn-2xs flex items-center gap-1"
                                    title="Approve request and add feedback"
                                  >
                                    <CheckCircle2 size={13} /> Approve
                                  </button>
                                  <button
                                    onClick={() => openReviewModal(p, "rejected")}
                                    className="btn btn-danger btn-2xs flex items-center gap-1"
                                    title="Reject request and specify reason"
                                  >
                                    <XCircle size={13} /> Reject
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => openReviewModal(p, isApproved ? "rejected" : "approved")}
                                  className="btn btn-secondary btn-2xs text-muted hover:text-white"
                                  title="Update decision and feedback"
                                >
                                  Modify Decision
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: Cash & Membership Desks */}
      {activeTab === "memberships" && (
        <>
          <div className="cash-workflow-banner mb-4">
            <div className="flex items-center gap-3">
              <div className="cash-icon-circle">
                <Banknote size={22} />
              </div>
              <div>
                <h4 className="font-bold">Front Desk In-Person Cash Verification</h4>
                <p className="text-muted text-xs mt-1">
                  Member pays at the front desk ➔ Admin clicks <strong>[Approve]</strong> ➔ Member immediately receives active 1-year access with PRO features unlocked.
                </p>
              </div>
            </div>
          </div>

          <div className="table-toolbar">
            <div className="search-input-wrap">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search applicant name or plan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-btn-group">
              <button
                className={`filter-btn ${filter === "pending" ? "active" : ""}`}
                onClick={() => setFilter("pending")}
              >
                Pending Cash ({pendingMembershipsCount})
              </button>
              <button
                className={`filter-btn ${filter === "active" ? "active" : ""}`}
                onClick={() => setFilter("active")}
              >
                Active Memberships
              </button>
              <button
                className={`filter-btn ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                All History
              </button>
            </div>
          </div>

          <div className="dash-card mt-4 p-0 overflow-hidden">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Applicant Member</th>
                    <th>Plan Tier</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                    <th>Submission Time</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMemberships.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted text-sm">
                        No membership records in this view.
                      </td>
                    </tr>
                  ) : (
                    filteredMemberships.map((r) => (
                      <tr key={r.id || r._id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="client-avatar-sm">
                              {r.memberName?.charAt(0) || "M"}
                            </div>
                            <div>
                              <strong className="text-white text-xs block">{r.memberName}</strong>
                              <span className="text-muted text-3xs">{r.memberEmail}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`badge ${
                              r.plan === "PREMIUM"
                                ? "badge-cyan"
                                : r.plan === "PRO"
                                ? "badge-green"
                                : "badge-secondary"
                            }`}
                          >
                            {r.plan} ({r.price || "₹1,999"})
                          </span>
                        </td>

                        <td>
                          <span className="text-xs flex items-center gap-1 text-muted">
                            <Banknote size={14} className="text-green" /> Cash Desk
                          </span>
                        </td>

                        <td>
                          {r.status === "active" ? (
                            <span className="badge badge-green text-xs font-bold flex items-center gap-1 w-fit">
                              <CheckCircle2 size={13} /> ACTIVE
                            </span>
                          ) : r.status === "rejected" ? (
                            <span className="badge badge-danger text-xs font-bold flex items-center gap-1 w-fit">
                              <XCircle size={13} /> REJECTED
                            </span>
                          ) : (
                            <span className="badge badge-warning text-xs font-bold flex items-center gap-1 w-fit">
                              <Clock size={13} /> PENDING CASH
                            </span>
                          )}
                        </td>

                        <td>
                          <span className="text-muted text-xs">{r.requestedAt || "Recent"}</span>
                        </td>

                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {r.status === "pending" ? (
                              <>
                                <button
                                  onClick={() => handleApproveMembership(r.id || r._id, r.memberName, r.plan)}
                                  className="btn btn-primary btn-2xs flex items-center gap-1"
                                >
                                  <CheckCircle2 size={13} /> Confirm Cash
                                </button>
                                <button
                                  onClick={() => handleRejectMembership(r.id || r._id, r.memberName)}
                                  className="btn btn-danger btn-2xs"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleRevokeMembership(r.id || r._id, r.memberName)}
                                className="btn btn-secondary btn-2xs text-muted hover:text-white"
                              >
                                Revoke Access
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Decision Modal with Feedback Note */}
      {reviewingItem && (
        <div className="modal-overlay">
          <div className="modal-box max-w-md">
            <div className="modal-header">
              <div className="flex items-center gap-2">
                {reviewingItem.action === "approved" ? (
                  <CheckCircle2 className="text-green" size={20} />
                ) : (
                  <XCircle className="text-danger" size={20} />
                )}
                <h3 className="font-bold text-lg text-white">
                  {reviewingItem.action === "approved" ? "Approve Request" : "Reject Request"}
                </h3>
              </div>
              <button
                onClick={() => setReviewingItem(null)}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitPetitionDecision} className="modal-body space-y-4">
              <div className="p-3 bg-white/5 rounded-lg">
                <span className="text-muted text-3xs block uppercase font-bold">Subject</span>
                <strong className="text-white text-sm block mt-0.5">
                  {reviewingItem.item.title}
                </strong>
                <span className="text-muted text-xs block mt-1">
                  Requested by: <strong>{reviewingItem.item.requesterName}</strong> ({reviewingItem.item.requesterRole})
                </span>
                <p className="text-muted text-xs mt-2 italic bg-black/20 p-2 rounded">
                  "{reviewingItem.item.details}"
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Feedback Note for {reviewingItem.item.requesterName}
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this request is approved or rejected. This note will be visibly displayed to the user."
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  className="form-input text-xs"
                />
              </div>

              <div className="modal-footer pt-3">
                <button
                  type="button"
                  onClick={() => setReviewingItem(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn btn-sm ${
                    reviewingItem.action === "approved" ? "btn-primary" : "btn-danger"
                  }`}
                >
                  Confirm {reviewingItem.action === "approved" ? "Approval" : "Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
