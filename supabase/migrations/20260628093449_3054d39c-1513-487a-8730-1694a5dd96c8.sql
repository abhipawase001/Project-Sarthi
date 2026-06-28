
-- 1) Move SECURITY DEFINER helpers out of the exposed API schema
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, anon;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM public;
REVOKE ALL ON FUNCTION private.has_any_role(uuid, public.app_role[]) FROM public;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_any_role(uuid, public.app_role[]) TO authenticated;

-- Recreate policies that referenced public.has_role / public.has_any_role
-- user_roles
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- buses
DROP POLICY IF EXISTS "staff buses write" ON public.buses;
CREATE POLICY "staff buses write" ON public.buses
  FOR INSERT TO authenticated
  WITH CHECK (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role]));

DROP POLICY IF EXISTS "staff buses update" ON public.buses;
CREATE POLICY "staff buses update" ON public.buses
  FOR UPDATE TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role]))
  WITH CHECK (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role]));

DROP POLICY IF EXISTS "admin buses delete" ON public.buses;
CREATE POLICY "admin buses delete" ON public.buses
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- service_logs
DROP POLICY IF EXISTS "staff service write" ON public.service_logs;
CREATE POLICY "staff service write" ON public.service_logs
  FOR INSERT TO authenticated
  WITH CHECK (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role]));

-- drivers
DROP POLICY IF EXISTS "staff drivers read" ON public.drivers;
CREATE POLICY "staff drivers read" ON public.drivers
  FOR SELECT TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role,'viewer'::public.app_role]));

DROP POLICY IF EXISTS "staff drivers write" ON public.drivers;
CREATE POLICY "staff drivers write" ON public.drivers
  FOR INSERT TO authenticated
  WITH CHECK (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role]));

DROP POLICY IF EXISTS "staff drivers update" ON public.drivers;
CREATE POLICY "staff drivers update" ON public.drivers
  FOR UPDATE TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role]))
  WITH CHECK (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role]));

DROP POLICY IF EXISTS "admin drivers delete" ON public.drivers;
CREATE POLICY "admin drivers delete" ON public.drivers
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- roster
DROP POLICY IF EXISTS "staff roster write" ON public.roster;
CREATE POLICY "staff roster write" ON public.roster
  FOR INSERT TO authenticated
  WITH CHECK (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role]));

DROP POLICY IF EXISTS "staff roster update" ON public.roster;
CREATE POLICY "staff roster update" ON public.roster
  FOR UPDATE TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role]))
  WITH CHECK (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role]));

DROP POLICY IF EXISTS "admin roster delete" ON public.roster;
CREATE POLICY "admin roster delete" ON public.roster
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- anomalies
DROP POLICY IF EXISTS "staff anomalies write" ON public.anomalies;
CREATE POLICY "staff anomalies write" ON public.anomalies
  FOR INSERT TO authenticated
  WITH CHECK (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role]));

DROP POLICY IF EXISTS "staff anomalies update" ON public.anomalies;
CREATE POLICY "staff anomalies update" ON public.anomalies
  FOR UPDATE TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role]))
  WITH CHECK (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role]));

-- trip_logs
DROP POLICY IF EXISTS "staff trip_logs write" ON public.trip_logs;
CREATE POLICY "staff trip_logs write" ON public.trip_logs
  FOR INSERT TO authenticated
  WITH CHECK (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role]));

DROP POLICY IF EXISTS "staff trip_logs update" ON public.trip_logs;
CREATE POLICY "staff trip_logs update" ON public.trip_logs
  FOR UPDATE TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role]))
  WITH CHECK (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role]));

-- fuel_logs
DROP POLICY IF EXISTS "staff fuel write" ON public.fuel_logs;
CREATE POLICY "staff fuel write" ON public.fuel_logs
  FOR INSERT TO authenticated
  WITH CHECK (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role]));

-- Now safe to drop the public-schema copies
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.has_any_role(uuid, public.app_role[]);

-- 2) Replace overly permissive WITH CHECK (true) on public-insert policies
DROP POLICY IF EXISTS "Anyone can post pings" ON public.bus_pings;
CREATE POLICY "Anyone can post pings" ON public.bus_pings
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(bus_id) BETWEEN 1 AND 64
    AND length(route) BETWEEN 1 AND 64
    AND speed >= 0 AND speed <= 200
    AND lat BETWEEN -90 AND 90
    AND lng BETWEEN -180 AND 180
    AND occupancy IN ('low','medium','high')
  );

DROP POLICY IF EXISTS "Anyone can report incidents" ON public.incident_reports;
CREATE POLICY "Anyone can report incidents" ON public.incident_reports
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(kind) BETWEEN 1 AND 64
    AND (message IS NULL OR length(message) <= 1000)
    AND (bus_id IS NULL OR length(bus_id) <= 64)
    AND (stop_id IS NULL OR length(stop_id) <= 64)
    AND (lat IS NULL OR (lat BETWEEN -90 AND 90))
    AND (lng IS NULL OR (lng BETWEEN -180 AND 180))
  );
