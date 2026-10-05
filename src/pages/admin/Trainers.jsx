import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Star,
  Users,
  Mail,
  Phone,
  X,
  UserCheck,
  UserX,
  Dumbbell,
  CheckCircle2,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import {
  getTrainersList,
  saveTrainersList,
  getMembersList,
  assignMemberToTrainer,
  removeMemberFromTrainer,
} from "../../services/mockData";

export default function Trainers() {
  const [trainers, setTrainers] = useState([]);
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [assigningTrainer, setAssigningTrainer] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [notification, setNotification] = useState("");

  const [newTrainer, setNewTrainer] = useState({
    name: "",
    specialty: "Strength & Hypertrophy",
    phone: "",
    email: "",
    password: "Trainer@12345",
    experience: "5 years",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trainerError, setTrainerError] = useState("");

  const refreshData = async () => {
    setTrainers(getTrainersList());
    setMembers(getMembersList());
    try {
      const api = (await import("../../services/api")).default;
      const [trRes, memRes] = await Promise.allSettled([
        api.get("/trainers"),
        api.get("/members"),
      ]);

      if (trRes.status === "fulfilled" && trRes.value.data?.success) {
        setTrainers(
          trRes.value.data.trainers.map((t) => ({
            ...t,
            id: t._id || t.id,
          }))
        );
      }

      if (memRes.status === "fulfilled" && memRes.value.data?.success) {
        setMembers(
          memRes.value.data.members.map((m) => ({
            ...m,
            id: m._id || m.id,
          }))
        );
      }
    } catch {
      // Fallback to local state
    }
  };

  useEffect(() => {
    refreshData();
    window.addEventListener("fittrack:assignment-changed", refreshData);
    window.addEventListener("fittrack:membership-changed", refreshData);
    return () => {
      window.removeEventListener("fittrack:assignment-changed", refreshData);
      window.removeEventListener("fittrack:membership-changed", refreshData);
    };
  }, []);

  const handleRemoveMember = async (ath, trainerName) => {
    if (!window.confirm(`Remove ${ath.name} from ${trainerName}'s assigned roster?`)) return;

    try {
      const api = (await import("../../services/api")).default;
      await api.post(`/members/${ath.id || ath._id}/remove-trainer`);
    } catch {
      // fallback
    }

    removeMemberFromTrainer(ath.id || ath._id);
    refreshData();
    setNotification(`✓ ${ath.name} removed from ${trainerName}'s roster.`);
    setTimeout(() => setNotification(""), 4000);
  };

  const handleAssignMemberSubmit = async (e) => {
    e.preventDefault();
    if (!assigningTrainer || !selectedMemberId) return;

    const trId = assigningTrainer.id || assigningTrainer._id;

    try {
      const api = (await import("../../services/api")).default;
      await api.post(`/members/${selectedMemberId}/assign-trainer`, {
        trainerId: trId,
      });
    } catch {
      // fallback
    }

    assignMemberToTrainer(selectedMemberId, trId);
    refreshData();
    setNotification(`✓ Member added to Coach ${assigningTrainer.name}'s roster.`);
    setAssigningTrainer(null);
    setSelectedMemberId("");
    setTimeout(() => setNotification(""), 4000);
  };

  const handleDelete = (id) => {
    if (window.confirm("Remove this trainer from active staff?")) {
      const updated = trainers.filter((t) => t.id !== id);
      setTrainers(updated);
      saveTrainersList(updated);
    }
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const updated = trainers.map((t) =>
      t.id === editingTrainer.id ? editingTrainer : t
    );
    setTrainers(updated);
    saveTrainersList(updated);
    setEditingTrainer(null);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setTrainerError("");
    setIsSubmitting(true);

    try {
      const api = (await import("../../services/api")).default;
      const res = await api.post("/trainers", {
        name: newTrainer.name,
        email: newTrainer.email,
        password: newTrainer.password || "Trainer@12345",
        phone: newTrainer.phone,
        specialty: newTrainer.specialty,
        experience: newTrainer.experience || "5 years",
      });

      if (res.data?.success && res.data?.trainer) {
        await refreshTrainers();
        setShowAddModal(false);
        setNewTrainer({
          name: "",
          specialty: "Strength & Hypertrophy",
          phone: "",
          email: "",
          password: "Trainer@12345",
          experience: "5 years",
        });
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      console.warn("Backend trainer creation fallback to local:", err.message);
    }

    // Fallback to local storage if offline
    const created = {
      id: `tr_${Date.now()}`,
      ...newTrainer,
      clients: 0,
      rating: 5.0,
      status: "Active",
    };
    const updated = [created, ...trainers];
    setTrainers(updated);
    saveTrainersList(updated);
    setShowAddModal(false);
    setNewTrainer({
      name: "",
      specialty: "Strength & Hypertrophy",
      phone: "",
      email: "",
      password: "Trainer@12345",
      experience: "5 years",
    });
    setIsSubmitting(false);
  };

  const filtered = trainers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.specialty.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout
      title="Trainer Management"
      subtitle="Add, edit, and remove certified fitness trainers on staff, and manage assigned athlete rosters."
    >
      {notification && (
        <div className="save-toast-pill mb-4">
          <CheckCircle2 size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search coaches by name or specialization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          <Plus size={15} /> Add Trainer
        </button>
      </div>

      {/* Grid of Trainer Cards */}
      <div className="dash-grid-2 mt-4">
        {filtered.length === 0 ? (
          <div className="dash-card text-center py-12" style={{ gridColumn: "1 / -1" }}>
            <p className="text-muted text-base mb-3">No trainers on staff yet.</p>
            <button className="btn btn-primary btn-sm mx-auto" onClick={() => setShowAddModal(true)}>
              <Plus size={15} /> Add First Trainer
            </button>
          </div>
        ) : (
          filtered.map((t) => {
            const trId = t.id || t._id;
            const assignedAthletes = members.filter(
              (m) =>
                m.trainerId === trId ||
                m.trainerId === t.id ||
                m.trainerId === t._id ||
                (m.trainerId && (m.trainerId._id === trId || m.trainerId.id === trId)) ||
                m.trainerName === t.name ||
                m.trainer === t.name
            );

            return (
              <div key={trId} className="dash-card trainer-card">
                <div className="trainer-card-top">
                  <div className="trainer-avatar-large">{t.name.charAt(0)}</div>
                  <div className="trainer-info">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-lg">{t.name}</h4>
                      <span className="badge badge-green">{t.status || "Active"}</span>
                    </div>
                    <p className="text-muted text-xs mt-1">{t.specialty}</p>
                    <div className="trainer-rating-row mt-2">
                      <Star size={14} className="star-icon" fill="currentColor" />
                      <span className="rating-val">{t.rating || 5.0}</span>
                      <span className="text-muted text-xs">• {t.experience || "5 yrs exp"}</span>
                    </div>
                  </div>

                  {/* Action Buttons: Edit & Delete */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingTrainer(t)}
                      className="table-action-btn text-cyan"
                      title="Edit Trainer"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="table-action-btn text-danger"
                      title="Remove Trainer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="trainer-meta-strip mt-3">
                  <div className="t-meta-item">
                    <Users size={14} />
                    <span>{assignedAthletes.length} Assigned Athletes</span>
                  </div>
                  <div className="t-meta-item">
                    <Mail size={14} />
                    <span>{t.email}</span>
                  </div>
                  {t.phone && (
                    <div className="t-meta-item">
                      <Phone size={14} />
                      <span>{t.phone}</span>
                    </div>
                  )}
                </div>

                {/* Assigned Athletes Section */}
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xs uppercase font-bold text-muted">Assigned Members</span>
                    <button
                      onClick={() => {
                        setAssigningTrainer(t);
                        setSelectedMemberId("");
                      }}
                      className="btn btn-secondary btn-2xs text-3xs text-primary py-0.5 px-2 flex items-center gap-1"
                      title="Assign a member to this coach"
                    >
                      <Plus size={11} /> Add Member
                    </button>
                  </div>

                  {assignedAthletes.length === 0 ? (
                    <p className="text-3xs text-muted italic">No members currently assigned to this coach.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {assignedAthletes.map((ath) => (
                        <span
                          key={ath.id || ath._id}
                          className="badge badge-secondary text-3xs py-0.5 px-2 flex items-center gap-1.5"
                          style={{ background: "rgba(255, 255, 255, 0.06)", borderColor: "rgba(255, 255, 255, 0.12)" }}
                        >
                          <span className="font-semibold text-white">{ath.name}</span>
                          <button
                            onClick={() => handleRemoveMember(ath, t.name)}
                            className="text-danger hover:text-red-400 ml-0.5 font-bold cursor-pointer"
                            title={`Remove ${ath.name} from this trainer`}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Trainer Modal */}
      {editingTrainer && (
        <div className="modal-overlay" onClick={() => setEditingTrainer(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Trainer</h3>
              <button className="modal-close-btn" onClick={() => setEditingTrainer(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="mt-4">
              <div className="form-group">
                <label className="form-label">Coach Name</label>
                <input
                  type="text"
                  required
                  value={editingTrainer.name}
                  onChange={(e) => setEditingTrainer({ ...editingTrainer, name: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Specialization</label>
                <input
                  type="text"
                  required
                  value={editingTrainer.specialty}
                  onChange={(e) => setEditingTrainer({ ...editingTrainer, specialty: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  value={editingTrainer.email}
                  onChange={(e) => setEditingTrainer({ ...editingTrainer, email: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  value={editingTrainer.phone || ""}
                  onChange={(e) => setEditingTrainer({ ...editingTrainer, phone: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="modal-footer mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingTrainer(null)}>
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

      {/* Add Trainer Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Trainer</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="mt-4">
              <div className="form-group">
                <label className="form-label">Coach Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Coach Alex"
                  value={newTrainer.name}
                  onChange={(e) => setNewTrainer({ ...newTrainer, name: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Specialization</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Strength & Hypertrophy"
                  value={newTrainer.specialty}
                  onChange={(e) => setNewTrainer({ ...newTrainer, specialty: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="coach@fittrack.com"
                  value={newTrainer.email}
                  onChange={(e) => setNewTrainer({ ...newTrainer, email: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Temporary / Login Password</label>
                <input
                  type="password"
                  required
                  placeholder="Trainer@12345"
                  value={newTrainer.password}
                  onChange={(e) => setNewTrainer({ ...newTrainer, password: e.target.value })}
                  className="form-input"
                />
                <span className="text-muted text-xs" style={{ display: "block", marginTop: "4px" }}>
                  Default is Trainer@12345 (Trainer can use this to login)
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  placeholder="9876543001"
                  value={newTrainer.phone}
                  onChange={(e) => setNewTrainer({ ...newTrainer, phone: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Experience</label>
                <input
                  type="text"
                  placeholder="e.g. 5 years"
                  value={newTrainer.experience}
                  onChange={(e) => setNewTrainer({ ...newTrainer, experience: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="modal-footer mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Adding Coach..." : "Add Coach"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Member to Coach Modal */}
      {assigningTrainer && (
        <div className="modal-overlay" onClick={() => setAssigningTrainer(null)}>
          <div className="modal-box max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <UserCheck className="text-primary" size={20} />
                <h3 className="font-bold text-lg text-white">
                  Assign Member to {assigningTrainer.name}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setAssigningTrainer(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignMemberSubmit} className="modal-body space-y-4">
              <div className="p-3 bg-white/5 rounded-lg">
                <span className="text-muted text-3xs uppercase font-bold">Coach Details</span>
                <strong className="text-white text-sm block mt-0.5">{assigningTrainer.name}</strong>
                <span className="text-muted text-xs block">{assigningTrainer.specialty}</span>
              </div>

              <div className="form-group">
                <label className="form-label">Select Gym Member to Assign</label>
                {members.length === 0 ? (
                  <p className="text-xs text-warning">No gym members registered yet.</p>
                ) : (
                  <select
                    className="form-input"
                    required
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                  >
                    <option value="">-- Choose Member --</option>
                    {members.map((m) => {
                      const mId = m.id || m._id;
                      const hasThisTrainer =
                        m.trainerId === assigningTrainer.id ||
                        m.trainerId === assigningTrainer._id ||
                        m.trainerName === assigningTrainer.name;
                      return (
                        <option key={mId} value={mId} disabled={hasThisTrainer}>
                          {m.name} ({m.plan || "PRO"}) {hasThisTrainer ? "— [Already Assigned]" : ""}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              <div className="modal-footer pt-3">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setAssigningTrainer(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedMemberId}
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                >
                  <UserCheck size={14} /> Assign to Coach Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
