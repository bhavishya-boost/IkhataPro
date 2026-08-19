-- ============================================================
-- 003_profiles.sql
-- iKhataPro — User Profiles (extends Supabase auth.users)
-- One profile per auth.users row.
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id            uuid          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Display info
  full_name     text,
  avatar_url    text,
  phone         text,

  -- Timestamps
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS
  'One-to-one extension of auth.users. Stores display name and profile info for each authenticated user.';

COMMENT ON COLUMN profiles.id IS
  'Matches auth.users.id exactly. Used to join with business_members.';

-- Auto-create a profile row on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger: fire after every new auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
