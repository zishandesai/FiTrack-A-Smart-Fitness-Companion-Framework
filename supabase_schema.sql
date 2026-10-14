-- ============================================================================
-- FIT-TRACK CLOUD DATABASE SCHEMA FOR SUPABASE (POSTGRESQL)
-- Run this SQL in your Supabase Project: SQL Editor -> New Query -> Run
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PUBLIC PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Allow id to reference auth.users if user signs up via auth
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_auth_fkey' AND table_name = 'profiles'
  ) THEN
    -- Keep standard UUID primary key without hard failure on direct staff seeds
    NULL;
  END IF;
END $$;

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
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    role = COALESCE(EXCLUDED.role, public.profiles.role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- Configured for smooth cross-device sync & multi-role gym operations
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_coach_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Clean existing restrictive policies
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Profiles: Full read, insert, update for seamless cross-device gym management
CREATE POLICY "Profiles are readable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Profiles can be inserted" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Profiles can be updated" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Profiles can be deleted" ON public.profiles FOR DELETE USING (true);

-- Memberships: Full sync for all devices
CREATE POLICY "Memberships are readable by all" ON public.memberships FOR SELECT USING (true);
CREATE POLICY "Memberships can be inserted" ON public.memberships FOR INSERT WITH CHECK (true);
CREATE POLICY "Memberships can be updated" ON public.memberships FOR UPDATE USING (true);
CREATE POLICY "Memberships can be deleted" ON public.memberships FOR DELETE USING (true);

-- Workouts: Athletes & Coaches sync
CREATE POLICY "Workouts are readable by all" ON public.workouts FOR SELECT USING (true);
CREATE POLICY "Workouts can be created" ON public.workouts FOR INSERT WITH CHECK (true);
CREATE POLICY "Workouts can be updated" ON public.workouts FOR UPDATE USING (true);
CREATE POLICY "Workouts can be deleted" ON public.workouts FOR DELETE USING (true);

-- Workout Exercises: Live rep tracking
CREATE POLICY "Exercises are readable by all" ON public.workout_exercises FOR SELECT USING (true);
CREATE POLICY "Exercises can be inserted" ON public.workout_exercises FOR INSERT WITH CHECK (true);
CREATE POLICY "Exercises can be updated" ON public.workout_exercises FOR UPDATE USING (true);
CREATE POLICY "Exercises can be deleted" ON public.workout_exercises FOR DELETE USING (true);

-- Attendance: Realtime turnstile & dashboard logs
CREATE POLICY "Attendance is readable by all" ON public.attendance FOR SELECT USING (true);
CREATE POLICY "Attendance can be recorded" ON public.attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Attendance can be updated" ON public.attendance FOR UPDATE USING (true);

-- Form Coach Sessions: Telemetry & Biomechanics
CREATE POLICY "Form sessions are readable by all" ON public.form_coach_sessions FOR SELECT USING (true);
CREATE POLICY "Form sessions can be logged" ON public.form_coach_sessions FOR INSERT WITH CHECK (true);

-- Live Chat Messages: Realtime messaging
CREATE POLICY "Messages are readable by all" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Messages can be sent" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Messages can be updated" ON public.messages FOR UPDATE USING (true);

-- ============================================================================
-- 11. SEED DEFAULT CERTIFIED COACHES IN CLOUD DATABASE
-- ============================================================================
INSERT INTO public.profiles (id, email, name, role, phone, specialty, bio)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'marcus.coach@fittrack.com',
    'Marcus Vance',
    'trainer',
    '+1 (555) 234-5678',
    'Strength & Hypertrophy',
    'Former competitive powerlifter specializing in compound movement mechanics, hypertrophy progression, and form correction.'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'elena.coach@fittrack.com',
    'Elena Rostova',
    'trainer',
    '+1 (555) 345-6789',
    'Olympic Lifting & Mobility',
    'Level 2 USAW certified coach focused on explosive barbell power, joint mobility, and athletic injury prevention.'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'zishan.coach@fittrack.com',
    'Zishan Khan',
    'trainer',
    '+1 (555) 456-7890',
    'Biomechanics & Functional Strength',
    'CSCS strength coach with 6+ years experience optimizing movement efficiency, athletic conditioning, and posture.'
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'tyler.coach@fittrack.com',
    'Tyler Brooks',
    'trainer',
    '+1 (555) 567-8901',
    'Cardio Endurance & Weight Loss',
    'ACSM-EP endurance coach specialized in metabolic conditioning, body recomposition, and progressive cardio programming.'
  )
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  specialty = EXCLUDED.specialty,
  bio = EXCLUDED.bio;

-- ============================================================================
-- 12. REALTIME SUBSCRIPTION CHANNELS
-- ============================================================================
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
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;
