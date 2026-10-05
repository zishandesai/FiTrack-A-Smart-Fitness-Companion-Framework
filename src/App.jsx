import { Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import MemberDashboard from "./pages/member/MemberDashboard";
import MyWorkout from "./pages/member/MyWorkout";
import AIFormCoach from "./pages/member/AIFormCoach";
import Progress from "./pages/member/Progress";
import Profile from "./pages/member/Profile";

import TrainerDashboard from "./pages/trainer/TrainerDashboard";
import TrainerMembers from "./pages/trainer/TrainerMembers";
import AssignWorkout from "./pages/trainer/AssignWorkout";

import AdminDashboard from "./pages/admin/AdminDashboard";
import Members from "./pages/admin/Members";
import Trainers from "./pages/admin/Trainers";
import MembershipRequests from "./pages/admin/MembershipRequests";
import Attendance from "./pages/admin/Attendance";

import MemberCoaches from "./pages/member/MemberCoaches";
import MemberChat from "./pages/member/MemberChat";
import MemberRequests from "./pages/member/MemberRequests";
import TrainerChat from "./pages/trainer/TrainerChat";
import TrainerRequests from "./pages/trainer/TrainerRequests";
import NutriCoachStudio from "./pages/member/NutriCoachStudio";
import TurnstileCheckIn from "./pages/TurnstileCheckIn";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* PUBLIC & TURNSTILE ACCESS */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/check-in" element={<TurnstileCheckIn />} />
      <Route path="/turnstile" element={<TurnstileCheckIn />} />

      {/* MEMBER */}
      <Route
        path="/member"
        element={
          <ProtectedRoute role="member">
            <MemberDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/member/nutricoach"
        element={
          <ProtectedRoute role="member">
            <NutriCoachStudio />
          </ProtectedRoute>
        }
      />
      <Route
        path="/member/workout"
        element={
          <ProtectedRoute role="member">
            <MyWorkout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/member/ai-coach"
        element={
          <ProtectedRoute role="member">
            <AIFormCoach />
          </ProtectedRoute>
        }
      />
      <Route
        path="/member/progress"
        element={
          <ProtectedRoute role="member">
            <Progress />
          </ProtectedRoute>
        }
      />
      <Route
        path="/member/profile"
        element={
          <ProtectedRoute role="member">
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/member/coaches"
        element={
          <ProtectedRoute role="member">
            <MemberCoaches />
          </ProtectedRoute>
        }
      />
      <Route
        path="/member/chat"
        element={
          <ProtectedRoute role="member">
            <MemberChat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/member/requests"
        element={
          <ProtectedRoute role="member">
            <MemberRequests />
          </ProtectedRoute>
        }
      />

      {/* TRAINER */}
      <Route
        path="/trainer"
        element={
          <ProtectedRoute role="trainer">
            <TrainerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trainer/nutricoach"
        element={
          <ProtectedRoute role="trainer">
            <NutriCoachStudio />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trainer/members"
        element={
          <ProtectedRoute role="trainer">
            <TrainerMembers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trainer/assign-workout"
        element={
          <ProtectedRoute role="trainer">
            <AssignWorkout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trainer/workout"
        element={
          <ProtectedRoute role="trainer">
            <AssignWorkout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trainer/chat"
        element={
          <ProtectedRoute role="trainer">
            <TrainerChat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trainer/requests"
        element={
          <ProtectedRoute role="trainer">
            <TrainerRequests />
          </ProtectedRoute>
        }
      />

      {/* ADMIN */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/members"
        element={
          <ProtectedRoute role="admin">
            <Members />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/trainers"
        element={
          <ProtectedRoute role="admin">
            <Trainers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/membership-requests"
        element={
          <ProtectedRoute role="admin">
            <MembershipRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/memberships"
        element={
          <ProtectedRoute role="admin">
            <MembershipRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/requests"
        element={
          <ProtectedRoute role="admin">
            <MembershipRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/attendance"
        element={
          <ProtectedRoute role="admin">
            <Attendance />
          </ProtectedRoute>
        }
      />

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;