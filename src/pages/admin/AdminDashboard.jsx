import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  UserCheck,
  CalendarCheck,
  ArrowRight,
  Clock,
  DollarSign,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import StatCard from "../../components/StatCard";
import ProgressChart from "../../components/ProgressChart";
import { getMemberships, getAttendanceData, getMembersList, getTrainersList } from "../../services/mockData";

export default function AdminDashboard() {
  const [memberships, setMemberships] = useState([]);
  const [members, setMembers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [attData, setAttData] = useState({ summary: { present: 0, absent: 0, total: 0 } });

  useEffect(() => {
    const loadData = async () => {
      setMemberships(getMemberships());
      setMembers(getMembersList());
      setTrainers(getTrainersList());
      setAttData(getAttendanceData());

      // Attempt to load live backend records if server is running
      try {
        const api = (await import("../../services/api")).default;
        const [mRes, tRes, reqRes] = await Promise.allSettled([
          api.get("/members"),
          api.get("/trainers"),
          api.get("/memberships"),
        ]);
        if (mRes.status === "fulfilled") {
          const list = mRes.value?.data?.members || mRes.value?.data?.data || [];
          if (Array.isArray(list)) setMembers(list);
        }
        if (tRes.status === "fulfilled") {
          const list = tRes.value?.data?.trainers || tRes.value?.data?.data || [];
          if (Array.isArray(list)) setTrainers(list);
        }
        if (reqRes.status === "fulfilled") {
          const list = reqRes.value?.data?.requests || reqRes.value?.data?.data || [];
          if (Array.isArray(list)) setMemberships(list);
        }
      } catch {
        // Fallback to local state
      }
    };

    loadData();
    window.addEventListener("fittrack:membership-changed", loadData);
    return () => window.removeEventListener("fittrack:membership-changed", loadData);
  }, []);

  const pendingRequests = memberships.filter((m) => m.status === "pending");
  const activeMembersCount = members.filter((m) => m.membershipStatus === "active").length;
  const occupancyRate =
    attData.summary.total > 0
      ? Math.round((attData.summary.present / attData.summary.total) * 100)
      : 0;

  return (
    <DashboardLayout
      title="Admin Command Center"
      subtitle="Gym management, membership approvals, trainer records, and real-time attendance."
    >
      {/* 4 Stat Cards: Dynamic real-time statistics */}
      <div className="dash-grid-4">
        <div className="dash-box-card">
          <span className="dash-box-label">MEMBERS</span>
          <span className="dash-box-value">{members.length}</span>
          <span className="dash-box-sub">Total Registered</span>
        </div>

        <div className="dash-box-card active-card">
          <span className="dash-box-label">ACTIVE</span>
          <span className="dash-box-value text-green">{activeMembersCount}</span>
          <span className="dash-box-sub">Paid Memberships</span>
        </div>

        <div className="dash-box-card pending-card">
          <span className="dash-box-label">PENDING</span>
          <span className="dash-box-value text-warning">{pendingRequests.length}</span>
          <span className="dash-box-sub">Cash Approvals Needed</span>
        </div>

        <div className="dash-box-card trainer-card-box">
          <span className="dash-box-label">TRAINERS</span>
          <span className="dash-box-value text-cyan">{trainers.length}</span>
          <span className="dash-box-sub">Certified Coaches</span>
        </div>
      </div>

      {/* Attendance & Pending Requests Grid */}
      <div className="dash-grid-2 mt-4">
        {/* Today's Attendance Overview */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <span className="dash-card-badge">LIVE CHECK-INS</span>
              <h3 className="dash-card-title">Today's Attendance</h3>
            </div>
            <Link to="/admin/attendance" className="text-green text-xs font-bold hover:underline">
              View Log →
            </Link>
          </div>

          <div className="attendance-metric-split mt-3">
            <div className="att-box present">
              <span className="att-label">PRESENT</span>
              <span className="att-number">{attData.summary.present}</span>
              <span className="att-sub">Checked-In Today</span>
            </div>
            <div className="att-box absent">
              <span className="att-label">ABSENT</span>
              <span className="att-number">{attData.summary.absent}</span>
              <span className="att-sub">Resting / Inactive</span>
            </div>
          </div>

          <div className="occupancy-progress-track mt-4">
            <div
              className="occupancy-progress-fill"
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
          <p className="text-muted text-xs mt-2">
            {occupancyRate}% attendance rate today. Turnstiles operating with QR Code and RFID pass scans.
          </p>
        </div>

        {/* Pending Cash Approvals Widget */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <span className="dash-card-badge">CASH VERIFICATION</span>
              <h3 className="dash-card-title">Membership Requests</h3>
            </div>
            <span className="badge badge-warning">{pendingRequests.length} PENDING</span>
          </div>

          <div className="admin-request-list mt-3">
            {pendingRequests.length === 0 ? (
              <p className="text-muted text-xs py-5 text-center">No pending cash verification requests.</p>
            ) : (
              pendingRequests.slice(0, 3).map((req) => (
                <div key={req.id} className="admin-req-item">
                  <div className="req-avatar">{req.memberName?.charAt(0) || "M"}</div>
                  <div className="req-details">
                    <h4 className="font-bold">{req.memberName}</h4>
                    <span className="text-muted text-xs">
                      Plan: <strong className="text-primary">{req.plan}</strong> • Payment: <strong>{req.paymentMethod}</strong>
                    </span>
                  </div>
                  <Link to="/admin/membership-requests" className="btn btn-primary btn-xs">
                    Review
                  </Link>
                </div>
              ))
            )}
          </div>

          <div className="dash-card-footer mt-4">
            <Link to="/admin/membership-requests" className="btn btn-secondary full-width">
              Go to Approval Desk
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Admin Fast Navigation */}
      <div className="dash-grid-3 mt-4">
        <Link to="/admin/members" className="dash-quick-card">
          <Users size={22} className="text-green" />
          <div>
            <h4>Members Directory</h4>
            <p>View, Edit, and Delete gym members</p>
          </div>
          <ArrowRight size={16} />
        </Link>

        <Link to="/admin/trainers" className="dash-quick-card">
          <UserCheck size={22} className="text-cyan" />
          <div>
            <h4>Trainers Directory</h4>
            <p>Add, Edit, and Remove fitness coaches</p>
          </div>
          <ArrowRight size={16} />
        </Link>

        <Link to="/admin/membership-requests" className="dash-quick-card">
          <ClipboardList size={22} className="text-warning" />
          <div>
            <h4>Cash Approvals</h4>
            <p>Review and verify cash payments</p>
          </div>
          <ArrowRight size={16} />
        </Link>
      </div>
    </DashboardLayout>
  );
}
