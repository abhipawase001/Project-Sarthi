CREATE UNIQUE INDEX bus_pings_client_ping_id_unique ON public.bus_pings (client_ping_id) WHERE client_ping_id IS NOT NULL;
DROP POLICY IF EXISTS "Assigned drivers post verified pings" ON public.bus_pings;
CREATE POLICY "Active assigned drivers post verified pings" ON public.bus_pings FOR INSERT TO authenticated
  WITH CHECK (
    driver_id IS NOT NULL AND roster_id IS NOT NULL AND client_ping_id IS NOT NULL
    AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180
    AND speed BETWEEN 0 AND 200 AND heading BETWEEN 0 AND 360
    AND (accuracy_m IS NULL OR accuracy_m BETWEEN 0 AND 1000)
    AND observed_at >= now() - interval '24 hours'
    AND observed_at <= now() + interval '30 seconds'
    AND EXISTS (
      SELECT 1
      FROM public.roster r
      JOIN public.drivers d ON d.id = r.driver_id
      JOIN public.buses b ON b.reg_no = r.bus_reg
      WHERE r.id = bus_pings.roster_id
        AND d.id = bus_pings.driver_id
        AND d.auth_user_id = auth.uid()
        AND r.bus_reg = bus_pings.bus_id
        AND r.route = bus_pings.route
        AND r.duty_date = (now() AT TIME ZONE 'Asia/Kolkata')::date
        AND r.status IN ('active', 'in_progress')
        AND b.status = 'active'
    )
  );