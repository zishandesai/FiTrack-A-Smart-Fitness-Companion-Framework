import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Lock } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="policy-page">
      <div className="policy-container">
        <div className="policy-header">
          <Link to="/" className="policy-back-link">
            <ArrowLeft size={16} />
            <span>Return to Application</span>
          </Link>
          <div className="policy-title-group">
            <span className="policy-badge">DATA GOVERNANCE & PRIVACY</span>
            <h1>Privacy Policy</h1>
            <p className="policy-meta">Last Updated: October 2026 • Strict Local Processing Standard</p>
          </div>
        </div>

        <div className="policy-content">
          <section className="policy-section">
            <h2>1. Core Privacy Architecture: On-Device Biometrics</h2>
            <p>
              FIT-TRACK is engineered around an <strong>on-device privacy architecture</strong>. Unlike legacy cloud vision systems that stream athlete video feeds across the internet, the FIT-TRACK AI Form Coach evaluates your movement entirely on your local hardware:
            </p>
            <ul className="policy-list">
              <li>
                <strong>Zero Video Storage:</strong> Your camera frames are processed directly inside your browser's WebAssembly runtime. Video frames never leave your device and are never recorded to disk.
              </li>
              <li>
                <strong>Mathematical Coordinate Extraction:</strong> Only numeric joint angles (e.g. knee flexion: 88°, hip hinge: 112°) and rep counters are computed.
              </li>
              <li>
                <strong>Encrypted Telemetry Sync:</strong> Only aggregated numerical metrics (completed reps, sets, and overall form precision score) are transmitted to your secure profile to maintain your training log.
              </li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>2. Information We Collect</h2>
            <p>When you register and use FIT-TRACK, we collect only operational fitness data necessary to power your gym membership:</p>
            <ul className="policy-list">
              <li><strong>Account Credentials:</strong> Name, verified email address, phone number, and hashed authentication tokens.</li>
              <li><strong>Athletic Profile Data:</strong> Body weight, target weight goal, training split, and selected membership tier.</li>
              <li><strong>Facility Attendance Records:</strong> Timestamps of turnstile QR check-ins and verified sessions.</li>
              <li><strong>Trainer Interaction:</strong> Workout assignments and direct messaging between you and your designated personal trainer.</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>3. How Your Information Is Used</h2>
            <p>Your data is used strictly for the following purposes:</p>
            <ul className="policy-list">
              <li>Authenticating turnstile entry into the gym facility.</li>
              <li>Calculating progressive overload recommendations, rest intervals, and volume tracking.</li>
              <li>Enabling certified trainers to review assigned athlete sets and update workout splits.</li>
              <li>Managing membership renewals and cash verification at the reception desk.</li>
            </ul>
            <p>We do not sell, license, or monetize your health data to third-party advertisers or insurance providers.</p>
          </section>

          <section className="policy-section">
            <h2>4. Security & Data Protection</h2>
            <p>
              All data transmitted between your device and the FIT-TRACK cloud database is encrypted in transit using industry-standard TLS 1.3 encryption. Passwords and credentials are cryptographically hashed, and database rows are isolated through strict PostgreSQL Row Level Security (RLS) policies.
            </p>
          </section>

          <section className="policy-section">
            <h2>5. Your Rights: Access, Export & Deletion</h2>
            <p>
              You maintain complete ownership of your athletic records. You may update your profile information, request a complete export of your workout history, or permanently delete your account and all associated telemetry at any time by contacting gym administration.
            </p>
          </section>

          <div className="policy-footer-note">
            <p>
              For privacy inquiries or data rights requests, contact data protection administration at privacy@fittrack.com or visit the reception desk.
            </p>
            <div className="policy-footer-links">
              <Link to="/terms">View Terms of Service</Link>
              <span>•</span>
              <Link to="/login">Account Portal</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
