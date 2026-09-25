import React from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("FIT-TRACK UI Error Caught:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#070807",
            color: "#f5f7f5",
            fontFamily: "Inter, sans-serif",
            padding: "24px",
          }}
        >
          <div
            style={{
              maxWidth: "480px",
              width: "100%",
              background: "rgba(18, 21, 19, 0.95)",
              border: "1px solid rgba(255, 92, 103, 0.3)",
              borderRadius: "20px",
              padding: "32px",
              textAlign: "center",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "rgba(255, 92, 103, 0.12)",
                color: "#ff5c67",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <h2 style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "8px" }}>
              Something went wrong
            </h2>
            <p style={{ color: "#a4aaa5", fontSize: "0.92rem", marginBottom: "16px", lineHeight: 1.5 }}>
              FIT-TRACK encountered an unexpected state. Click reload to refresh or reset demo data.
            </p>

            {this.state.error && (
              <div
                style={{
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid rgba(255, 92, 103, 0.3)",
                  borderRadius: "10px",
                  padding: "12px",
                  marginBottom: "20px",
                  textAlign: "left",
                  overflowX: "auto",
                }}
              >
                <div style={{ color: "#ff5c67", fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px" }}>
                  {this.state.error.name}: {this.state.error.message}
                </div>
                {this.state.error.stack && (
                  <pre
                    style={{
                      color: "#a4aaa5",
                      fontSize: "0.75rem",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      maxHeight: "120px",
                      overflowY: "auto",
                      fontFamily: "monospace",
                    }}
                  >
                    {this.state.error.stack.split("\n").slice(0, 5).join("\n")}
                  </pre>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  background: "#b7ff3c",
                  color: "#070807",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={16} />
                Reload Page
              </button>

              <button
                onClick={this.handleReset}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  background: "rgba(255, 255, 255, 0.06)",
                  color: "#f5f7f5",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "12px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                <Home size={16} />
                Reset Demo
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
