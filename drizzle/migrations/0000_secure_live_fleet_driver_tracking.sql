ALTER TABLE public.drivers ADD COLUMN email text;
ALTER TABLE public.drivers ADD COLUMN auth_user_id uuid;
CREATE UNIQUE INDEX drivers_auth_user_id_unique ON public.drivers (auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE UNIQUE INDEX drivers_email_lower_unique ON public.drivers (lower(email)) WHERE email IS NOT NULL;

ALTER TABLE public.bus_pings ADD COLUMN driver_id uuid REFERENCES public.drivers(id);
ALTER TABLE public.bus_pings ADD COLUMN roster_id uuid REFERENCES public.roster(id);
ALTER TABLE public.bus_pings ADD COLUMN observed_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.bus_pings ADD COLUMN accuracy_m double precision;
ALTER TABLE public.bus_pings ADD COLUMN client_ping_id uuid;
CREATE UNIQUE INDEX bus_pings_driver_client_id_unique ON public.bus_pings (driver_id, client_ping_id) WHERE client_ping_id IS NOT NULL;
CREATE INDEX bus_pings_roster_observed_at_idx ON public.bus_pings (roster_id, observed_at DESC);

ALTER TABLE public.trip_logs ADD COLUMN roster_id uuid REFERENCES public.roster(id);
CREATE UNIQUE INDEX trip_logs_one_open_per_roster ON public.trip_logs (roster_id) WHERE roster_id IS NOT NULL AND ended_at IS NULL;
CREATE INDEX trip_logs_roster_started_at_idx ON public.trip_logs (roster_id, started_at DESC);

CREATE TABLE public.live_bus_positions (
  bus_id text PRIMARY KEY REFERENCES public.buses(reg_no) ON DELETE CASCADE,
  route text NOT NULL,
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  speed double precision NOT NULL CHECK (speed BETWEEN 0 AND 200),
  heading double precision NOT NULL CHECK (heading BETWEEN 0 AND 360),
  occupancy text NOT NULL CHECK (occupancy IN ('low','medium','high')),
  observed_at timestamptz NOT NULL,
  accuracy_m double precision CHECK (accuracy_m IS NULL OR accuracy_m BETWEEN 0 AND 1000),
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.live_bus_positions TO anon, authenticated;
GRANT ALL ON public.live_bus_positions TO service_role;
ALTER TABLE public.live_bus_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read live bus positions" ON public.live_bus_positions FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION private.sync_live_bus_position()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.observed_at >= now() - interval '60 seconds'
     AND NEW.observed_at <= now() + interval '30 seconds' THEN
    INSERT INTO public.live_bus_positions
      (bus_id, route, lat, lng, speed, heading, occupancy, observed_at, accuracy_m, received_at)
    VALUES
      (NEW.bus_id, NEW.route, NEW.lat, NEW.lng, NEW.speed, NEW.heading, NEW.occupancy, NEW.observed_at, NEW.accuracy_m, now())
    ON CONFLICT (bus_id) DO UPDATE SET
      route = EXCLUDED.route,
      lat = EXCLUDED.lat,
      lng = EXCLUDED.lng,
      speed = EXCLUDED.speed,
      heading = EXCLUDED.heading,
      occupancy = EXCLUDED.occupancy,
      observed_at = EXCLUDED.observed_at,
      accuracy_m = EXCLUDED.accuracy_m,
      received_at = EXCLUDED.received_at
    WHERE EXCLUDED.observed_at > public.live_bus_positions.observed_at;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.sync_live_bus_position() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_live_bus_position_after_ping
AFTER INSERT ON public.bus_pings
FOR EACH ROW EXECUTE FUNCTION private.sync_live_bus_position();

DROP POLICY IF EXISTS "Anyone can post pings" ON public.bus_pings;
DROP POLICY IF EXISTS "Anyone can read pings" ON public.bus_pings;
REVOKE ALL ON TABLE public.bus_pings FROM anon;
GRANT SELECT, INSERT ON public.bus_pings TO authenticated;
GRANT ALL ON public.bus_pings TO service_role;
CREATE POLICY "Drivers read their own pings" ON public.bus_pings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.id = bus_pings.driver_id AND d.auth_user_id = auth.uid()
  ));
CREATE POLICY "Staff read bus pings" ON public.bus_pings FOR SELECT TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role]));
CREATE POLICY "Assigned drivers post verified pings" ON public.bus_pings FOR INSERT TO authenticated
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
        AND r.status IN ('scheduled','active','in_progress')
        AND b.status = 'active'
    )
  );

DROP POLICY IF EXISTS "open roster read" ON public.roster;
CREATE POLICY "staff read roster" ON public.roster FOR SELECT TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role,'viewer'::public.app_role]));
CREATE POLICY "assigned drivers read own roster" ON public.roster FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.id = roster.driver_id AND d.auth_user_id = auth.uid()
  ));
REVOKE ALL ON TABLE public.roster FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roster TO authenticated;
GRANT ALL ON public.roster TO service_role;

CREATE POLICY "Drivers read own profile" ON public.drivers FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());
REVOKE ALL ON TABLE public.drivers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;

DROP POLICY IF EXISTS "open fuel read" ON public.fuel_logs;
CREATE POLICY "Staff read fuel logs" ON public.fuel_logs FOR SELECT TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role]));
REVOKE ALL ON TABLE public.fuel_logs FROM anon;
GRANT SELECT, INSERT ON public.fuel_logs TO authenticated;
GRANT ALL ON public.fuel_logs TO service_role;

DROP POLICY IF EXISTS "open service read" ON public.service_logs;
CREATE POLICY "Staff read service logs" ON public.service_logs FOR SELECT TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role]));
REVOKE ALL ON TABLE public.service_logs FROM anon;
GRANT SELECT, INSERT ON public.service_logs TO authenticated;
GRANT ALL ON public.service_logs TO service_role;

DROP POLICY IF EXISTS "open trip_logs read" ON public.trip_logs;
CREATE POLICY "Staff read trip logs" ON public.trip_logs FOR SELECT TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::public.app_role,'dispatcher'::public.app_role]));
CREATE POLICY "Drivers read own trip logs" ON public.trip_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.id = trip_logs.driver_id AND d.auth_user_id = auth.uid()
  ));
CREATE POLICY "Assigned drivers start trips" ON public.trip_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.drivers d JOIN public.roster r ON r.driver_id = d.id
    WHERE d.id = trip_logs.driver_id AND d.auth_user_id = auth.uid()
      AND r.id = trip_logs.roster_id AND r.bus_reg = trip_logs.bus_reg
      AND r.route = trip_logs.route
      AND r.duty_date = (now() AT TIME ZONE 'Asia/Kolkata')::date
      AND r.status IN ('scheduled','active','in_progress')
  ));
CREATE POLICY "Assigned drivers finish own trips" ON public.trip_logs FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.id = trip_logs.driver_id AND d.auth_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.drivers d JOIN public.roster r ON r.driver_id = d.id
    WHERE d.id = trip_logs.driver_id AND d.auth_user_id = auth.uid()
      AND r.id = trip_logs.roster_id AND r.bus_reg = trip_logs.bus_reg
      AND r.route = trip_logs.route
  ));
REVOKE ALL ON TABLE public.trip_logs FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.trip_logs TO authenticated;
GRANT ALL ON public.trip_logs TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'live_bus_positions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_bus_positions;
  END IF;
END;
$$;