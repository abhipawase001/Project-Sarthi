CREATE OR REPLACE FUNCTION public.grant_designated_depot_manager()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND lower(NEW.email) = 'abhipawase2005@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.grant_designated_depot_manager() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_depot_manager ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_grant_depot_manager
AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_designated_depot_manager();