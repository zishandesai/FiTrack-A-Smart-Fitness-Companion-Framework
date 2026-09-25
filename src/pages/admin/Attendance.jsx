import { useState, useEffect } from "react";
import {
  CalendarCheck,
  Search,
  Users,
  Clock,
  QrCode,
  CheckCircle2,
  XCircle,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
} from "lucide-react";
import QRCode from "qrcode";
import DashboardLayout from "../../components/DashboardLayout";
import { getAttendanceData, saveAttendanceData } from "../../services/mockData";

export default function Attendance() {
  const [attData, setAttData] = useState({
    summary: { present: 0, absent: 0, total: 0 },
    todayLogs: [],
  });
  const [search, setSearch] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);
  const [quickName, setQuickName] = useState("");

  const [qrDataUrl, setQrDataUrl] = useState("");
  const [customHost, setCustomHost] = useState(() => window.location.origin);
  const [showHostInput, setShowHostInput] = useState(false);
  const [copied, setCopied] = useState(false);

  const checkInUrl = `${customHost.replace(/\/$/, "")}/check-in`;

  useEffect(() => {
    const refreshAttendance = () => {
      setAttData(getAttendanceData());
    };
    refreshAttendance();

    window.addEventListener("fittrack:attendance-changed", refreshAttendance);
    window.addEventListener("storage", refreshAttendance);
    return () => {
      window.removeEventListener("fittrack:attendance-changed", refreshAttendance);
      window.removeEventListener("storage", refreshAttendance);
    };
  }, []);

  useEffect(() => {
    if (showQrModal) {
      QRCode.toDataURL(checkInUrl, {
        width: 260,
        margin: 1.5,
        color: {
          dark: "#0b0f0c",
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("QR Code Generation Error:", err));
    }
  }, [showQrModal, checkInUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(checkInUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleManualCheckIn = (e) => {
    e.preventDefault();
    if (!quickName.trim()) return;

    const newLog = {
      id: `att_${Date.now()}`,
      name: quickName.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      method: "Manual Desk Check-in",
      status: "Present",
    };

    const updated = {
      ...attData,
      summary: {
        ...attData.summary,
        present: attData.summary.present + 1,
        absent: Math.max(0, attData.summary.absent - 1),
      },
      todayLogs: [newLog, ...(attData.todayLogs || [])],
    };

    setAttData(updated);
    saveAttendanceData(updated);
    setQuickName("");
  };

  const filteredLogs = (attData.todayLogs || []).filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.method.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout
      title="Facility Attendance & Turnstiles"
      subtitle="Today's live attendance head-count, QR access scanner, and check-in stream."
    >
      {/* Exact Attendance Stats from Section 14: Present 87, Absent 37 */}
      <div className="dash-grid-2">
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <span className="dash-card-badge">TODAY'S ATTENDANCE</span>
              <h3 className="dash-card-title">Daily Headcount Summary</h3>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowQrModal(true)}
            >
              <QrCode size={15} /> Show Facility QR Code
            </button>
          </div>

          <div className="attendance-metric-split mt-3">
            <div className="att-box present">
              <span className="att-label">PRESENT</span>
              <span className="att-number">{attData.summary.present}</span>
              <span className="att-sub">Active in Gym</span>
            </div>
            <div className="att-box absent">
              <span className="att-label">ABSENT</span>
              <span className="att-number">{attData.summary.absent}</span>
              <span className="att-sub">Rest Day</span>
            </div>
          </div>

          <div className="occupancy-progress-track mt-4">
            <div
              className="occupancy-progress-fill"
              style={{
                width: `${Math.round(
                  (attData.summary.present / attData.summary.total) * 100
                )}%`,
              }}
            />
          </div>
          <span className="text-muted text-xs block mt-2">
            70% of 124 registered members have checked in today.
          </span>
        </div>

        {/* Quick Check-In Station */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <span className="dash-card-badge">DESK TERMINAL</span>
              <h3 className="dash-card-title">Quick Member Check-In</h3>
            </div>
            <span className="badge badge-green">SCANNER READY</span>
          </div>

          <form onSubmit={handleManualCheckIn} className="mt-4 flex gap-2">
            <input
              type="text"
              placeholder="Enter member name..."
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              className="form-input flex-1"
            />
            <button type="submit" className="btn btn-primary">
              <CheckCircle2 size={16} /> Mark Present
            </button>
          </form>

          <div className="qr-terminal-preview mt-4">
            <div className="flex items-center gap-3">
              <div className="qr-box-small">
                <QrCode size={26} className="text-green" />
              </div>
              <div>
                <h5 className="font-bold text-sm">QR Code & NFC Turnstiles</h5>
                <p className="text-muted text-xs">
                  Members scan their mobile QR or Apple Wallet NFC pass upon entering the turnstile.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Check-In Log Table */}
      <div className="table-toolbar mt-4">
        <div className="search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search check-in log..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
        <span className="text-muted text-xs">Live Turnstile Log</span>
      </div>

      <div className="dash-card mt-3 p-0 overflow-hidden">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Check-In Time</th>
                <th>Access Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center text-muted py-8">
                    No attendance records logged today.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="client-avatar-sm">{log.name.charAt(0)}</div>
                        <strong className="text-primary">{log.name}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs font-mono text-primary font-bold">{log.time}</span>
                    </td>
                    <td>
                      <span className="text-muted text-xs">{log.method}</span>
                    </td>
                    <td>
                      <span className="badge badge-green">✓ {log.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real Scannable QR Code Modal for Turnstile Entrance Terminal */}
      {showQrModal && (
        <div className="modal-overlay" onClick={() => setShowQrModal(false)}>
          <div
            className="modal-box text-center"
            style={{ maxWidth: "460px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-green" />
                <h3>Gym Turnstile QR Access</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setShowQrModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="qr-modal-body p-4">
              {/* Real QR Code Image with Scanner Frame */}
              <div className="turnstile-qr-container mx-auto my-2">
                {qrDataUrl ? (
                  <div className="turnstile-qr-frame">
                    <img
                      src={qrDataUrl}
                      alt="Turnstile QR Code"
                      className="turnstile-qr-img"
                    />
                    <div className="turnstile-qr-scanline" />
                  </div>
                ) : (
                  <div className="w-[240px] h-[240px] flex items-center justify-center bg-white/5 rounded-xl text-muted text-xs">
                    Generating scannable QR...
                  </div>
                )}
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
                  <h4 className="font-bold text-white text-sm">
                    FIT-TRACK Entrance Terminal
                  </h4>
                </div>
                <p className="text-muted text-xs mt-1 max-w-sm mx-auto leading-relaxed">
                  Point any smartphone camera (iOS or Android) at this code to open the turnstile mobile check-in portal.
                </p>
              </div>

              {/* Scannable Link with Copy & Open Actions */}
              <div className="mt-4 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-2">
                <div className="text-left min-w-0 flex-1">
                  <div className="text-[10px] text-muted uppercase font-bold tracking-wider">
                    Check-In Target URL
                  </div>
                  <div className="text-xs font-mono text-cyan truncate">
                    {checkInUrl}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleCopyLink}
                    className="btn btn-secondary btn-xs flex items-center gap-1"
                    title="Copy Check-In Link"
                  >
                    {copied ? <Check size={13} className="text-green" /> : <Copy size={13} />}
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>

                  <a
                    href={checkInUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-xs flex items-center gap-1 text-green hover:text-white"
                    title="Open in new tab to test check-in"
                  >
                    <ExternalLink size={13} />
                    <span>Open</span>
                  </a>
                </div>
              </div>

              {/* Network IP Configuration for Mobile Wi-Fi */}
              <div className="mt-3 pt-3 border-t border-white/[0.06] text-left">
                <button
                  type="button"
                  onClick={() => setShowHostInput(!showHostInput)}
                  className="text-[11px] text-muted hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <Smartphone size={12} className="text-green" />
                  <span>Scanning from phone on local Wi-Fi? Click to set host IP</span>
                </button>

                {showHostInput && (
                  <div className="mt-2 space-y-1.5 animate-fade-in">
                    <p className="text-[10px] text-muted leading-relaxed">
                      If scanning with a smartphone on the same local Wi-Fi, change "localhost" to your PC's Wi-Fi IP (e.g. <code>http://192.168.1.50:5173</code>):
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customHost}
                        onChange={(e) => setCustomHost(e.target.value)}
                        placeholder="http://192.168.x.x:5173"
                        className="form-input text-xs font-mono py-1 px-2 flex-1"
                      />
                      <button
                        onClick={() => setCustomHost(window.location.origin)}
                        className="btn btn-ghost btn-xs text-[11px]"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer flex items-center justify-between gap-2">
              <a
                href={checkInUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs"
              >
                <Smartphone size={14} className="text-cyan" />
                <span>Test Check-In Simulator</span>
              </a>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowQrModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
