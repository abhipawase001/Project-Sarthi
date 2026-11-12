CREATE OR REPLACE VIEW public.public_buses
WITH (security_invoker = on)
AS
SELECT reg_no, route, capacity, status, health_score
FROM public.buses;
GRANT SELECT ON public.public_buses TO anon, authenticated;
DROP POLICY IF EXISTS "open buses read" ON public.buses;
CREATE POLICY "staff and drivers read full bus records" ON public.buses FOR SELECT TO authenticated
  USING (
    private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role,'viewer'::public.app_role])
    OR EXISTS (
      SELECT 1 FROM public.roster r JOIN public.drivers d ON d.id = r.driver_id
      WHERE r.bus_reg = buses.reg_no AND d.auth_user_id = auth.uid()
    )
  );
CREATE POLICY "deny direct anonymous bus reads" ON public.buses FOR SELECT TO anon USING (false);
REVOKE SELECT ON public.buses FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buses TO authenticated;
GRANT ALL ON public.buses TO service_role;
GRANT SELECT ON public.public_buses TO anon, authenticated;