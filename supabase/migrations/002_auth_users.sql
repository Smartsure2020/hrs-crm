-- ============================================================
-- 002_auth_users.sql
-- Profiles table linked to Supabase auth.users
-- ============================================================

CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email       text,
  full_name   text,
  role        text DEFAULT 'broker',
  status      text DEFAULT 'pending',
  phone       text,
  avatar_url  text,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Users can read and update their own profile
CREATE POLICY "users_own_profile_read"   ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users_own_profile_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE INDEX idx_profiles_email  ON profiles (email);
CREATE INDEX idx_profiles_role   ON profiles (role);
CREATE INDEX idx_profiles_status ON profiles (status);

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'broker'),
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
