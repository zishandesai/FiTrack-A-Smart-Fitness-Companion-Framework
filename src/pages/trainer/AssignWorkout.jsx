import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  BookOpen,
  Dumbbell,
  ArrowRight,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { saveAssignedWorkout, getMembersList } from "../../services/mockData";
import { useAuth } from "../../context/AuthContext";

export default function AssignWorkout() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const members = getMembersList();
  const initialMember = searchParams.get("member") || members[0]?.name || "";

  const [selectedMember, setSelectedMember] = useState(initialMember);
  const [workoutTitle, setWorkoutTitle] = useState("Chest + Triceps");
  const [assignedSuccess, setAssignedSuccess] = useState(false);

  // Exact exercise configuration from Section 6 of Specification
  const [exercises, setExercises] = useState([
    { id: 1, name: "Bench Press", sets: 3, reps: 10 },
    { id: 2, name: "Incline Press", sets: 3, reps: 12 },
    { id: 3, name: "Triceps Pushdown", sets: 3, reps: 12 },
  ]);

  const addExercise = () => {
    setExercises([
      ...exercises,
      { id: Date.now(), name: "", sets: 3, reps: 12 },
    ]);
  };

  const removeExercise = (id) => {
    setExercises(exercises.filter((ex) => ex.id !== id));
  };

  const updateExercise = (id, field, value) => {
    setExercises(
      exercises.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex))
    );
  };

  const loadPreset = (type) => {
    if (type === "chest") {
      setWorkoutTitle("Chest + Triceps");
      setExercises([
        { id: 1, name: "Bench Press", sets: 3, reps: 10 },
        { id: 2, name: "Incline Press", sets: 3, reps: 12 },
        { id: 3, name: "Triceps Pushdown", sets: 3, reps: 12 },
      ]);
    } else if (type === "back") {
      setWorkoutTitle("Back + Biceps");
      setExercises([
        { id: 1, name: "Deadlift", sets: 3, reps: 8 },
        { id: 2, name: "Lat Pulldown", sets: 3, reps: 12 },
        { id: 3, name: "Bicep Curls", sets: 3, reps: 12 },
      ]);
    } else if (type === "legs") {
      setWorkoutTitle("Legs + Core");
      setExercises([
        { id: 1, name: "Squats", sets: 4, reps: 10 },
        { id: 2, name: "Leg Press", sets: 3, reps: 12 },
        { id: 3, name: "Calf Raises", sets: 4, reps: 15 },
      ]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveAssignedWorkout(selectedMember, {
      name: workoutTitle,
      trainer: user?.name || "Trainer",
      date: "Today",
      exercises: exercises.map((ex) => ({ ...ex, completed: false })),
    });

    setAssignedSuccess(true);
    setTimeout(() => {
      setAssignedSuccess(false);
    }, 3000);
  };

  return (
    <DashboardLayout
      title="Assign Workout"
      subtitle="Create and assign workout routines directly to gym members."
    >
      {/* Template Presets */}
      <div className="template-preset-bar">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-green" />
          <span className="text-xs font-bold">QUICK SPLIT PRESETS:</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => loadPreset("chest")}
          >
            Chest + Triceps
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => loadPreset("back")}
          >
            Back + Biceps
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => loadPreset("legs")}
          >
            Legs + Core
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4">
        <div className="dash-grid-3">
          {/* Main Exercise Table (2 Cols) */}
          <div className="dash-two-cols">
            <div className="dash-card">
              <div className="dash-card-header">
                <div>
                  <span className="dash-card-badge">ROUTINE EXERCISES</span>
                  <h3 className="dash-card-title">{workoutTitle}</h3>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={addExercise}
                >
                  <Plus size={15} /> Add Exercise
                </button>
              </div>

              <div className="exercise-builder-list mt-3">
                {exercises.map((ex, idx) => (
                  <div key={ex.id} className="builder-row items-center">
                    <div className="builder-num">{idx + 1}</div>
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        placeholder="Exercise name (e.g. Bench Press)"
                        value={ex.name}
                        onChange={(e) => updateExercise(ex.id, "name", e.target.value)}
                        className="form-input flex-2"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Sets"
                        value={ex.sets}
                        onChange={(e) => updateExercise(ex.id, "sets", Number(e.target.value))}
                        className="form-input flex-1"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Reps"
                        value={ex.reps}
                        onChange={(e) => updateExercise(ex.id, "reps", e.target.value)}
                        className="form-input flex-1"
                        required
                      />
                    </div>
                    {exercises.length > 1 && (
                      <button
                        type="button"
                        className="builder-remove-btn"
                        onClick={() => removeExercise(ex.id)}
                        title="Delete Exercise"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Member & Assignment Details (1 Col) */}
          <div className="dash-one-col">
            <div className="dash-card">
              <span className="dash-card-badge">ASSIGNMENT CONFIG</span>
              <h3 className="dash-card-title mt-2">Target Member</h3>

              <div className="form-group mt-3">
                <label className="form-label">Select Member</label>
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="form-select"
                >
                  {members.length === 0 ? (
                    <option value="">No members registered</option>
                  ) : (
                    members.map((m) => (
                      <option key={m.id || m.name} value={m.name}>
                        {m.name} ({m.goal || "General Fitness"})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Workout Title</label>
                <input
                  type="text"
                  value={workoutTitle}
                  onChange={(e) => setWorkoutTitle(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="assigned-summary-preview mt-3 p-3 bg-secondary rounded-lg border border-border">
                <span className="text-xs text-muted font-bold block mb-2">PREVIEW FOR {selectedMember.toUpperCase()}:</span>
                <p className="font-bold text-sm text-green">{workoutTitle}</p>
                <ul className="text-xs text-muted mt-2 space-y-1">
                  {exercises.map((ex) => (
                    <li key={ex.id} className="flex justify-between">
                      <span>{ex.name || "Exercise"}</span>
                      <strong className="text-primary">{ex.sets} × {ex.reps}</strong>
                    </li>
                  ))}
                </ul>
              </div>

              {assignedSuccess && (
                <div className="save-toast-pill mt-3 mb-2">
                  <CheckCircle2 size={15} />
                  <span>Workout assigned to {selectedMember}!</span>
                </div>
              )}

              <button type="submit" className="btn btn-primary full-width mt-4">
                <Dumbbell size={16} />
                Assign Workout
              </button>
            </div>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}
