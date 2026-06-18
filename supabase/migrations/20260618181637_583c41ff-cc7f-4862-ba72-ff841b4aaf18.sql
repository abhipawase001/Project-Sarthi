
-- Role enum + user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'dispatcher', 'viewer');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Replace permissive (true) write policies with role-gated checks
DROP POLICY IF EXISTS "auth buses write" ON public.buses;
DROP POLICY IF EXISTS "auth buses update" ON public.buses;
DROP POLICY IF EXISTS "auth buses delete" ON public.buses;
CREATE POLICY "staff buses write" ON public.buses FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','dispatcher']::public.app_role[]));
CREATE POLICY "staff buses update" ON public.buses FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','dispatcher']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','dispatcher']::public.app_role[]));
CREATE POLICY "admin buses delete" ON public.buses FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "auth drivers read" ON public.drivers;
DROP POLICY IF EXISTS "auth drivers write" ON public.drivers;
DROP POLICY IF EXISTS "auth drivers update" ON public.drivers;
DROP POLICY IF EXISTS "auth drivers delete" ON public.drivers;
CREATE POLICY "staff drivers read" ON public.drivers FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','dispatcher','viewer']::public.app_role[]));
CREATE POLICY "staff drivers write" ON public.drivers FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','dispatcher']::public.app_role[]));
CREATE POLICY "staff drivers update" ON public.drivers FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','dispatcher']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','dispatcher']::public.app_role[]));
CREATE POLICY "admin drivers delete" ON public.drivers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "auth roster write" ON public.roster;
DROP POLICY IF EXISTS "auth roster update" ON public.roster;
DROP POLICY IF EXISTS "auth roster delete" ON public.roster;
CREATE POLICY "staff roster write" ON public.roster FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','dispatcher']::public.app_role[]));
CREATE POLICY "staff roster update" ON public.roster FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','dispatcher']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','dispatcher']::public.app_role[]));
CREATE POLICY "admin roster delete" ON public.roster FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "auth anomalies write" ON public.anomalies;
DROP POLICY IF EXISTS "auth anomalies update" ON public.anomalies;
CREATE POLICY "staff anomalies write" ON public.anomalies FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','dispatcher']::public.app_role[]));
CREATE POLICY "staff anomalies update" ON public.anomalies FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','dispatcher']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','dispatcher']::public.app_role[]));

DROP POLICY IF EXISTS "auth trip_logs write" ON public.trip_logs;
DROP POLICY IF EXISTS "auth trip_logs update" ON public.trip_logs;
CREATE POLICY "staff trip_logs write" ON public.trip_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','dispatcher']::public.app_role[]));
CREATE POLICY "staff trip_logs update" ON public.trip_logs FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','dispatcher']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','dispatcher']::public.app_role[]));

DROP POLICY IF EXISTS "auth fuel write" ON public.fuel_logs;
CREATE POLICY "staff fuel write" ON public.fuel_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','dispatcher']::public.app_role[]));

DROP POLICY IF EXISTS "auth service write" ON public.service_logs;
CREATE POLICY "staff service write" ON public.service_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','dispatcher']::public.app_role[]));
