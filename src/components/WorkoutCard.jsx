import {
  Check,
  Dumbbell,
  Clock3,
} from "lucide-react";

export default function WorkoutCard({
  exercise,
  sets,
  reps,
  completed = false,
  onComplete,
}) {
  return (
    <div className="workout-card">

      <div className="workout-icon">
        <Dumbbell size={20} />
      </div>

      <div className="workout-info">
        <h4>{exercise}</h4>

        <div className="workout-meta">
          <span>{sets} sets</span>
          <span>•</span>
          <span>{reps} reps</span>
        </div>
      </div>

      {completed ? (
        <div className="completed-icon">
          <Check size={16} />
        </div>
      ) : (
        <button
          className="workout-complete"
          onClick={onComplete}
        >
          Complete
        </button>
      )}

    </div>
  );
}