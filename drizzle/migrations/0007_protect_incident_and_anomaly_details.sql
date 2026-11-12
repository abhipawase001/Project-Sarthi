CREATE OR REPLACE VIEW public.public_buses
WITH (security_invoker = false)
AS
SELECT reg_no, route, capacity, status, health_score
FROM public.buses;
GRANT SELECT ON public.public_buses TO anon, authenticated;

DROP POLICY IF EXISTS "staff and drivers read full bus records" ON public.buses;
CREATE POLICY "Staff and assigned drivers read full bus records" ON public.buses FOR SELECT TO authenticated
  USING (
    private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role,'viewer'::public.app_role])
    OR EXISTS (
      SELECT 1 FROM public.roster r JOIN public.drivers d ON d.id = r.driver_id
      WHERE r.bus_reg = buses.reg_no AND d.auth_user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "deny direct anonymous bus reads" ON public.buses;
CREATE POLICY "Deny direct anonymous bus reads" ON public.buses FOR SELECT TO anon USING (false);
REVOKE SELECT ON public.buses FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buses TO authenticated;
GRANT ALL ON public.buses TO service_role;

CREATE OR REPLACE VIEW public.public_incident_reports
AS
SELECT id, kind, bus_id, stop_id, status, created_at
FROM public.incident_reports;
GRANT SELECT ON public.public_incident_reports TO anon, authenticated;
DROP POLICY IF EXISTS "Anyone can read incidents" ON public.incident_reports;
CREATE POLICY "Staff read incident reports" ON public.incident_reports FOR SELECT TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role,'viewer'::public.app_role]));
REVOKE SELECT ON public.incident_reports FROM anon;
GRANT SELECT ON public.incident_reports TO authenticated;
GRANT INSERT ON public.incident_reports TO anon, authenticated;
GRANT ALL ON public.incident_reports TO service_role;

DROP POLICY IF EXISTS "open anomalies read" ON public.anomalies;
CREATE POLICY "Staff read anomalies" ON public.anomalies FOR SELECT TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role,'viewer'::public.app_role]));
REVOKE SELECT ON public.anomalies FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.anomalies TO authenticated;
GRANT ALL ON public.anomalies TO service_role;