-- ============================================================================
-- FIT-TRACK CLOUD DATABASE SCHEMA FOR SUPABASE (POSTGRESQL)
-- Run this SQL in your Supabase Project: SQL Editor -> New Query -> Run
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PUBLIC PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'trainer', 'admin')),
  phone TEXT,
  avatar_url TEXT,
  age INTEGER,
  gender TEXT,
  height NUMERIC,
  weight NUMERIC,
  target_weight NUMERIC,
  specialty TEXT,
  bio TEXT,
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MEMBERSHIPS & ACCESS SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  duration TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'online',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'expired', 'cancelled')),
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  qr_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. WORKOUT HEADERS
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  assigned_date TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. WORKOUT EXERCISES
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 3,
  reps INTEGER NOT NULL DEFAULT 12,
  weight_target TEXT DEFAULT 'Bodyweight',
  rest_seconds INTEGER DEFAULT 60,
  order_index INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_reps INTEGER,
  completed_weight NUMERIC,
  form_score NUMERIC,
  completed_at TIMESTAMPTZ
);

-- 6. ATTENDANCE & TURNSTILE LOGS
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  method TEXT NOT NULL DEFAULT 'turnstile_qr' CHECK (method IN ('turnstile_qr', 'manual', 'rfid')),
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late'))
);

-- 7. AI FORM COACH BIOMECHANICS & TELEMETRY SESSIONS
CREATE TABLE IF NOT EXISTS public.form_coach_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL,
  rep_count INTEGER NOT NULL DEFAULT 0,
  avg_form_score NUMERIC,
  flaws_detected JSONB DEFAULT '[]'::jsonb,
  session_duration_sec INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. LIVE CHAT & COACH MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. AUTOMATIC USER PROFILE TRIGGER
-- Auto-creates a record in public.profiles whenever a new user signs up in auth.users
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_coach_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all, update own
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Memberships: Members read/create their own; Admins read/update all
DROP POLICY IF EXISTS "Users can view their own membership" ON public.memberships;
CREATE POLICY "Users can view their own membership"
  ON public.memberships FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can insert their own membership requests" ON public.memberships;
CREATE POLICY "Users can insert their own membership requests"
  ON public.memberships FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update membership requests" ON public.memberships;
CREATE POLICY "Admins can update membership requests"
  ON public.memberships FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Workouts: Members view assigned; Trainers/Admins manage all
DROP POLICY IF EXISTS "Users can view workouts" ON public.workouts;
CREATE POLICY "Users can view workouts"
  ON public.workouts FOR SELECT TO authenticated
  USING (auth.uid() = member_id OR auth.uid() = trainer_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer')));

DROP POLICY IF EXISTS "Trainers and Admins can create workouts" ON public.workouts;
CREATE POLICY "Trainers and Admins can create workouts"
  ON public.workouts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer')));

DROP POLICY IF EXISTS "Trainers and Members can update workouts" ON public.workouts;
CREATE POLICY "Trainers and Members can update workouts"
  ON public.workouts FOR UPDATE TO authenticated USING (true);

-- Workout Exercises: Open to authenticated participants
DROP POLICY IF EXISTS "Exercises are readable by authenticated users" ON public.workout_exercises;
CREATE POLICY "Exercises are readable by authenticated users"
  ON public.workout_exercises FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Exercises can be inserted by trainers" ON public.workout_exercises;
CREATE POLICY "Exercises can be inserted by trainers"
  ON public.workout_exercises FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Exercises can be updated upon completion" ON public.workout_exercises;
CREATE POLICY "Exercises can be updated upon completion"
  ON public.workout_exercises FOR UPDATE TO authenticated USING (true);

-- Attendance: Members view own; Admins view all
DROP POLICY IF EXISTS "View attendance" ON public.attendance;
CREATE POLICY "View attendance"
  ON public.attendance FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer')));

DROP POLICY IF EXISTS "Record attendance" ON public.attendance;
CREATE POLICY "Record attendance"
  ON public.attendance FOR INSERT TO authenticated WITH CHECK (true);

-- Form Coach Sessions: Members log and view their sessions
DROP POLICY IF EXISTS "Form sessions accessible by owner and trainers" ON public.form_coach_sessions;
CREATE POLICY "Form sessions accessible by owner and trainers"
  ON public.form_coach_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer')));

DROP POLICY IF EXISTS "Record form coach session" ON public.form_coach_sessions;
CREATE POLICY "Record form coach session"
  ON public.form_coach_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Messages: Participants view and send
DROP POLICY IF EXISTS "Messages readable by sender or receiver" ON public.messages;
CREATE POLICY "Messages readable by sender or receiver"
  ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Send message" ON public.messages;
CREATE POLICY "Send message"
  ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- Enable Realtime for critical live tables (safe if already added)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'attendance') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'memberships') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.memberships;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'workouts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workouts;
  END IF;
END $$;
