
-- BUSES: drop open write/update/delete, keep public read, restrict writes to authenticated
DROP POLICY IF EXISTS "open buses write" ON public.buses;
DROP POLICY IF EXISTS "open buses update" ON public.buses;
DROP POLICY IF EXISTS "open buses delete" ON public.buses;
CREATE POLICY "auth buses write" ON public.buses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth buses update" ON public.buses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth buses delete" ON public.buses FOR DELETE TO authenticated USING (true);

-- DRIVERS: PII — restrict reads to authenticated, expose safe view publicly
DROP POLICY IF EXISTS "open drivers read" ON public.drivers;
DROP POLICY IF EXISTS "open drivers write" ON public.drivers;
DROP POLICY IF EXISTS "open drivers update" ON public.drivers;
DROP POLICY IF EXISTS "open drivers delete" ON public.drivers;
CREATE POLICY "auth drivers read" ON public.drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth drivers write" ON public.drivers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth drivers update" ON public.drivers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth drivers delete" ON public.drivers FOR DELETE TO authenticated USING (true);
REVOKE SELECT ON public.drivers FROM anon;

-- Safe public view of drivers (no PII)
CREATE OR REPLACE VIEW public.public_drivers
WITH (security_invoker = true)
AS SELECT id, name, rating, status, role FROM public.drivers;
GRANT SELECT ON public.public_drivers TO anon, authenticated;

-- ROSTER
DROP POLICY IF EXISTS "open roster write" ON public.roster;
DROP POLICY IF EXISTS "open roster update" ON public.roster;
DROP POLICY IF EXISTS "open roster delete" ON public.roster;
CREATE POLICY "auth roster write" ON public.roster FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth roster update" ON public.roster FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth roster delete" ON public.roster FOR DELETE TO authenticated USING (true);

-- ANOMALIES
DROP POLICY IF EXISTS "open anomalies write" ON public.anomalies;
DROP POLICY IF EXISTS "open anomalies update" ON public.anomalies;
CREATE POLICY "auth anomalies write" ON public.anomalies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth anomalies update" ON public.anomalies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- TRIP LOGS
DROP POLICY IF EXISTS "open trip_logs write" ON public.trip_logs;
DROP POLICY IF EXISTS "open trip_logs update" ON public.trip_logs;
CREATE POLICY "auth trip_logs write" ON public.trip_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth trip_logs update" ON public.trip_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- FUEL LOGS
DROP POLICY IF EXISTS "open fuel write" ON public.fuel_logs;
CREATE POLICY "auth fuel write" ON public.fuel_logs FOR INSERT TO authenticated WITH CHECK (true);

-- SERVICE LOGS
DROP POLICY IF EXISTS "open service write" ON public.service_logs;
CREATE POLICY "auth service write" ON public.service_logs FOR INSERT TO authenticated WITH CHECK (true);
