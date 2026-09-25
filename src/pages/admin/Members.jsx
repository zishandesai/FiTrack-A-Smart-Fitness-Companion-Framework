import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  Eye,
  User,
  Banknote,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  UserX,
  Dumbbell,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import {
  getMembersList,
  saveMembersList,
  getMemberships,
  saveMemberships,
  approveMemberPayment,
  toggleMemberPaymentStatus,
  getTrainersList,
  assignMemberToTrainer,
  removeMemberFromTrainer,
} from "../../services/mockData";

export default function Members() {
  const [members, setMembers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [search, setSearch] = useState("");
  const [editingMember, setEditingMember] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingMember, setViewingMember] = useState(null);
  const [assigningMember, setAssigningMember] = useState(null);
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [notification, setNotification] = useState("");

  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    phone: "",
    goal: "Muscle Gain",
    plan: "PRO",
    trainer: "",
    membershipStatus: "active",
  });

  const refresh = async () => {
    setMembers(getMembersList());
    setTrainers(getTrainersList());
    try {
      const api = (await import("../../services/api")).default;
      const [membersRes, trainersRes] = await Promise.allSettled([
        api.get("/members"),
        api.get("/trainers"),
      ]);

      if (membersRes.status === "fulfilled" && membersRes.value.data?.success) {
        const mapped = membersRes.value.data.members.map((m) => ({
          ...m,
          id: m._id || m.id,
          trainer: m.trainerId?.name || m.trainerName || m.trainer || "—",
        }));
        setMembers(mapped);
      }

      if (trainersRes.status === "fulfilled" && trainersRes.value.data?.success) {
        setTrainers(
          trainersRes.value.data.trainers.map((t) => ({
            ...t,
            id: t._id || t.id,
          }))
        );
      }
    } catch {
      // Fallback to local state
    }
  };

  useEffect(() => {
    refresh();
    window.addEventListener("fittrack:membership-changed", refresh);
    window.addEventListener("fittrack:assignment-changed", refresh);
    return () => {
      window.removeEventListener("fittrack:membership-changed", refresh);
      window.removeEventListener("fittrack:assignment-changed", refresh);
    };
  }, []);

  const handleAssignTrainerSubmit = async (e) => {
    e.preventDefault();
    if (!assigningMember || !selectedTrainerId) return;

    try {
      const api = (await import("../../services/api")).default;
      await api.post(`/members/${assigningMember.id}/assign-trainer`, {
        trainerId: selectedTrainerId,
      });
    } catch {
      // fallback
    }

    assignMemberToTrainer(assigningMember.id, selectedTrainerId);
    setMembers(getMembersList());
    setNotification(`✓ Coach successfully assigned to ${assigningMember.name}.`);
    setAssigningMember(null);
    setSelectedTrainerId("");
    setTimeout(() => setNotification(""), 4000);
    refresh();
  };

  const handleUnassignTrainer = async (member) => {
    if (!window.confirm(`Unassign coach from ${member.name}?`)) return;

    try {
      const api = (await import("../../services/api")).default;
      await api.post(`/members/${member.id}/remove-trainer`);
    } catch {
      // fallback
    }

    removeMemberFromTrainer(member.id);
    setMembers(getMembersList());
    setNotification(`↺ Coach unassigned from ${member.name}.`);
    setTimeout(() => setNotification(""), 4000);
    refresh();
  };

  const handleApprovePayment = async (member) => {
    try {
      const api = (await import("../../services/api")).default;
      await api.put(`/memberships/user/${member.id}/toggle`);
    } catch {
      // Graceful fallback to mock data
    }
    approveMemberPayment(member.id);
    setMembers(getMembersList());
    setNotification(`✓ Cash confirmed! ${member.name}'s ${member.plan || "PRO"} membership is now ACTIVE.`);
    setTimeout(() => setNotification(""), 4000);
  };

  const handleTogglePayment = async (member) => {
    try {
      const api = (await import("../../services/api")).default;
      await api.put(`/memberships/user/${member.id}/toggle`);
    } catch {
      // Graceful fallback to mock data
    }
    const newStatus = toggleMemberPaymentStatus(member.id);
    setMembers(getMembersList());
    if (newStatus === "active") {
      setNotification(`✓ Cash confirmed! ${member.name}'s membership is now ACTIVE.`);
    } else {
      setNotification(`↺ ${member.name}'s membership marked as PENDING (Unpaid).`);
    }
    setTimeout(() => setNotification(""), 4000);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this member?")) {
      const updated = members.filter((m) => m.id !== id);
      setMembers(updated);
      saveMembersList(updated);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const api = (await import("../../services/api")).default;
      await api.put(`/members/${editingMember.id}`, editingMember);
    } catch {
      // Graceful fallback
    }
    const updated = members.map((m) =>
      m.id === editingMember.id ? editingMember : m
    );
    setMembers(updated);
    saveMembersList(updated);

    // Sync memberships requests list
    const reqs = getMemberships();
    const updatedReqs = reqs.map((r) =>
      r.memberEmail === editingMember.email || r.memberName === editingMember.name
        ? { ...r, status: editingMember.membershipStatus || "active", plan: editingMember.plan }
        : r
    );
    saveMemberships(updatedReqs);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("fittrack:membership-changed", {
          detail: { memberId: editingMember.id, status: editingMember.membershipStatus },
        })
      );
    }

    setEditingMember(null);
    setNotification(`✓ Profile details updated for ${editingMember.name}.`);
    setTimeout(() => setNotification(""), 4000);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const created = {
      id: `mem_${Date.now()}`,
      ...newMember,
      membershipStatus: newMember.membershipStatus || "active",
      progress: 0,
      weight: 70,
      attendance: 0,
      workoutsCount: 0,
      formScore: 0,
    };
    const updated = [created, ...members];
    setMembers(updated);
    saveMembersList(updated);
    setShowAddModal(false);
    setNewMember({ name: "", email: "", phone: "", goal: "Muscle Gain", plan: "PRO", trainer: "", membershipStatus: "active" });
    setNotification(`✓ Registered new member ${created.name}.`);
    setTimeout(() => setNotification(""), 4000);
  };

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.plan.toLowerCase().includes(search.toLowerCase())
  );

  const handleRoleChange = async (memberId, newRole) => {
    try {
      const api = (await import("../../services/api")).default;
      await api.put(`/members/${memberId}`, { role: newRole });
    } catch {
      // Graceful fallback to mock data
    }
    const updated = members.map((m) =>
      m.id === memberId ? { ...m, role: newRole } : m
    );
    setMembers(updated);
    saveMembersList(updated);
  };

  const pendingCount = members.filter((m) => m.membershipStatus !== "active").length;

  return (
    <DashboardLayout
      title="Member & Role Authority Console"
      subtitle="View, edit, and assign administrative or trainer privileges across registered accounts."
    >
      {/* Cash Verification Workflow Notice & Link to Approval Desk */}
      <div className="cash-workflow-banner mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="cash-icon-circle">
              <Banknote size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-sm">Cash Payment Verification Desk</h4>
                {pendingCount > 0 ? (
                  <span className="badge badge-warning text-2xs font-bold">{pendingCount} Pending Cash</span>
                ) : (
                  <span className="badge badge-green text-2xs font-bold">All Accounts Paid</span>
                )}
              </div>
              <p className="text-muted text-xs mt-1 leading-relaxed">
                Members paying cash at the gym desk can be approved directly below using the <strong>[Approve Cash]</strong> button, or via the centralized <strong>Membership Approval Desk</strong>.
              </p>
            </div>
          </div>
          <Link to="/admin/memberships" className="btn btn-secondary btn-xs flex items-center gap-1 text-primary">
            Membership Approval Desk
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {notification && (
        <div className="save-toast-pill mb-3">
          <CheckCircle2 size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* Master Admin & Security Guidance Card */}
      <div className="cash-workflow-banner mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="cash-icon-circle" style={{ background: "rgba(255, 92, 103, 0.15)", color: "#ff5c67" }}>
              <User size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-sm">👑 Root Master Administrator: admin@fittrack.com</h4>
                <span className="badge badge-danger text-2xs">Permanent Keyholder</span>
              </div>
              <p className="text-muted text-xs mt-1 leading-relaxed">
                You can promote any user below to <strong>Admin</strong> or <strong>Trainer</strong>. To make yourself the permanent Root Admin with your personal email, set <code className="text-green font-mono">ADMIN_EMAIL=your_email@gmail.com</code> in <code className="text-green font-mono">backend/.env</code>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search members by name, email, or plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          <Plus size={15} /> Add Member
        </button>
      </div>

      {/* Members Table */}
      <div className="dash-card mt-4 p-0 overflow-hidden">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Assigned Role</th>
                <th>Phone</th>
                <th>Fitness Goal</th>
                <th>Plan Tier</th>
                <th>Trainer</th>
                <th>Status</th>
                <th className="text-right">Actions (Approve / Edit / Delete)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="client-avatar-sm">{m.name.charAt(0)}</div>
                      <div>
                        <strong className="block text-primary">{m.name}</strong>
                        <span className="text-muted text-xs">{m.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      className="form-input text-xs py-1 px-2"
                      style={{
                        background: m.role === "admin" ? "rgba(255, 92, 103, 0.15)" : m.role === "trainer" ? "rgba(85, 231, 255, 0.15)" : "rgba(183, 255, 60, 0.1)",
                        borderColor: m.role === "admin" ? "#ff5c67" : m.role === "trainer" ? "#55e7ff" : "rgba(183, 255, 60, 0.3)",
                        color: m.role === "admin" ? "#ff5c67" : m.role === "trainer" ? "#55e7ff" : "#b7ff3c",
                        fontWeight: "bold",
                        width: "auto",
                      }}
                      value={m.role || "member"}
                      onChange={(e) => handleRoleChange(m.id, e.target.value)}
                    >
                      <option value="member">🧑 Member</option>
                      <option value="trainer">🏋️ Trainer</option>
                      <option value="admin">👑 Admin</option>
                    </select>
                  </td>
                  <td>
                    <span className="text-muted text-xs">{m.phone || "—"}</span>
                  </td>
                  <td>
                    <span className="text-xs font-semibold">{m.goal || "Fitness"}</span>
                  </td>
                  <td>
                    <span className="badge badge-green">{m.plan || "PRO"}</span>
                  </td>
                  <td>
                    {m.trainer && m.trainer !== "—" && m.trainer !== "None" ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="badge badge-cyan text-2xs py-0.5 px-1.5 flex items-center gap-1 font-semibold">
                          <Dumbbell size={11} />
                          {m.trainer}
                        </span>
                        <button
                          onClick={() => {
                            setAssigningMember(m);
                            setSelectedTrainerId(m.trainerId?._id || m.trainerId || "");
                          }}
                          className="text-3xs text-muted hover:text-white underline cursor-pointer"
                          title="Change Coach"
                        >
                          Change
                        </button>
                        <button
                          onClick={() => handleUnassignTrainer(m)}
                          className="text-3xs text-danger hover:text-red-400 font-bold ml-1 cursor-pointer"
                          title="Unassign this member from coach"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAssigningMember(m);
                          setSelectedTrainerId("");
                        }}
                        className="btn btn-secondary btn-2xs text-3xs text-primary py-0.5 px-2 flex items-center gap-1"
                        title="Assign a coach to this member"
                      >
                        <Plus size={11} /> Assign Coach
                      </button>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className={`status-chip ${m.membershipStatus === "active" ? "active" : "pending"}`}>
                        <span className="dot" />
                        {m.membershipStatus === "active" ? "Active ✓" : "Pending Cash"}
                      </span>
                      {m.membershipStatus !== "active" && (
                        <button
                          className="btn btn-primary btn-xs py-0.5 px-2 text-2xs font-bold whitespace-nowrap"
                          onClick={() => handleApprovePayment(m)}
                          title="Confirm cash payment & grant immediate active access"
                        >
                          <CheckCircle2 size={11} className="inline mr-1" />
                          Approve
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end items-center gap-1.5">
                      {m.membershipStatus !== "active" ? (
                        <button
                          className="btn btn-primary btn-xs py-1 px-2.5 flex items-center gap-1 font-bold whitespace-nowrap shadow-sm"
                          onClick={() => handleApprovePayment(m)}
                          title="Confirm in-person cash payment & activate membership"
                        >
                          <CheckCircle2 size={13} />
                          Approve Cash
                        </button>
                      ) : (
                        <button
                          className="btn btn-secondary btn-xs py-0.5 px-2 text-2xs text-muted hover:text-danger whitespace-nowrap"
                          onClick={() => handleTogglePayment(m)}
                          title="Revoke active status / Mark as Unpaid"
                        >
                          Revoke
                        </button>
                      )}
                      <button
                        className="table-action-btn text-cyan"
                        onClick={() => setViewingMember(m)}
                        title="View Details"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        className="table-action-btn text-green"
                        onClick={() => setEditingMember(m)}
                        title="Edit Member"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        className="table-action-btn text-danger"
                        onClick={() => handleDelete(m.id)}
                        title="Delete Member"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center text-muted py-8">
                    No members registered yet. Click "Add Member" above to create an account.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="modal-overlay" onClick={() => setEditingMember(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Member Details</h3>
              <button className="modal-close-btn" onClick={() => setEditingMember(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="mt-4">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  value={editingMember.email}
                  onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  value={editingMember.phone}
                  onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Payment & Membership Status</label>
                <select
                  value={editingMember.membershipStatus || "pending"}
                  onChange={(e) => setEditingMember({ ...editingMember, membershipStatus: e.target.value })}
                  className="form-select"
                >
                  <option value="active">Active ✓ (Cash Verified / Paid)</option>
                  <option value="pending">Pending Cash (Unpaid)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Plan Tier</label>
                <select
                  value={editingMember.plan}
                  onChange={(e) => setEditingMember({ ...editingMember, plan: e.target.value })}
                  className="form-select"
                >
                  <option value="BASIC">BASIC (₹999)</option>
                  <option value="PRO">PRO (₹1,999)</option>
                  <option value="PREMIUM">PREMIUM (₹2,999)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fitness Goal</label>
                <select
                  value={editingMember.goal}
                  onChange={(e) => setEditingMember({ ...editingMember, goal: e.target.value })}
                  className="form-select"
                >
                  <option value="Muscle Gain">Muscle Gain</option>
                  <option value="Weight Loss">Weight Loss</option>
                  <option value="Strength">Strength</option>
                  <option value="General Fitness">General Fitness</option>
                </select>
              </div>

              <div className="modal-footer mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingMember(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Member Modal */}
      {viewingMember && (
        <div className="modal-overlay" onClick={() => setViewingMember(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Member Profile Details</h3>
              <button className="modal-close-btn" onClick={() => setViewingMember(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 text-center">
              <div className="profile-avatar-large">{viewingMember.name.charAt(0)}</div>
              <h3 className="mt-3">{viewingMember.name}</h3>
              <p className="text-muted text-xs">{viewingMember.email} • {viewingMember.phone}</p>
            </div>
            <div className="dash-card mt-3 bg-secondary">
              <div className="flex justify-between py-1 border-b border-border text-xs items-center">
                <span className="text-muted">Payment Status:</span>
                <span className={`status-chip ${viewingMember.membershipStatus === "active" ? "active" : "pending"}`}>
                  <span className="dot" />
                  {viewingMember.membershipStatus === "active" ? "Active ✓" : "Pending Cash"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border text-xs">
                <span className="text-muted">Plan:</span>
                <strong className="text-green">{viewingMember.plan}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-border text-xs">
                <span className="text-muted">Goal:</span>
                <strong className="text-primary">{viewingMember.goal}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-border text-xs">
                <span className="text-muted">Trainer:</span>
                <strong className="text-primary">{viewingMember.trainer || "—"}</strong>
              </div>
              <div className="flex justify-between py-1 text-xs">
                <span className="text-muted">Weight:</span>
                <strong className="text-primary">{viewingMember.weight ? `${viewingMember.weight} kg` : "—"}</strong>
              </div>
            </div>

            {viewingMember.membershipStatus !== "active" && (
              <div className="mt-3 p-3 rounded-lg bg-warning/10 border border-warning/25 flex items-center justify-between gap-2">
                <div className="text-xs text-warning">
                  <strong>Cash Pending:</strong> Awaiting in-person cash verification.
                </div>
                <button
                  className="btn btn-primary btn-xs flex items-center gap-1 font-bold whitespace-nowrap"
                  onClick={() => {
                    handleApprovePayment(viewingMember);
                    setViewingMember({ ...viewingMember, membershipStatus: "active" });
                  }}
                >
                  <CheckCircle2 size={13} />
                  Approve Cash
                </button>
              </div>
            )}

            <div className="modal-footer mt-4">
              <button className="btn btn-primary" onClick={() => setViewingMember(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Register New Member</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="mt-4">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="member@example.com"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  placeholder="9876543210"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Plan Tier</label>
                <select
                  value={newMember.plan}
                  onChange={(e) => setNewMember({ ...newMember, plan: e.target.value })}
                  className="form-select"
                >
                  <option value="BASIC">BASIC (₹999)</option>
                  <option value="PRO">PRO (₹1,999)</option>
                  <option value="PREMIUM">PREMIUM (₹2,999)</option>
                </select>
              </div>
              <div className="modal-footer mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign / Change Coach Modal */}
      {assigningMember && (
        <div className="modal-overlay" onClick={() => setAssigningMember(null)}>
          <div className="modal-box max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Dumbbell className="text-primary" size={20} />
                <h3 className="font-bold text-lg text-white">Assign Coach to Member</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setAssigningMember(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignTrainerSubmit} className="modal-body space-y-4">
              <div className="p-3 bg-white/5 rounded-lg">
                <span className="text-muted text-3xs uppercase font-bold">Selected Member</span>
                <div className="flex items-center justify-between mt-1">
                  <strong className="text-white text-sm">{assigningMember.name}</strong>
                  <span className="badge badge-green text-3xs">{assigningMember.plan || "PRO"}</span>
                </div>
                <span className="text-muted text-xs block">{assigningMember.email}</span>
                <span className="text-muted text-2xs block mt-1">
                  Current Coach: <strong className="text-cyan">{assigningMember.trainer || "None"}</strong>
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Select Certified Gym Trainer</label>
                {trainers.length === 0 ? (
                  <div className="p-3 rounded bg-warning/10 border border-warning/20 text-xs text-warning">
                    No trainers registered yet. Please add a trainer first in Trainer Management.
                  </div>
                ) : (
                  <select
                    className="form-input"
                    required
                    value={selectedTrainerId}
                    onChange={(e) => setSelectedTrainerId(e.target.value)}
                  >
                    <option value="">-- Choose Coach --</option>
                    {trainers.map((t) => (
                      <option key={t.id || t._id} value={t.id || t._id}>
                        {t.name} ({t.specialty || "Fitness Coach"})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="modal-footer pt-3">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setAssigningMember(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedTrainerId}
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                >
                  <UserCheck size={14} /> Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
