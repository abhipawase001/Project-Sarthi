
-- BUSES
CREATE TABLE public.buses (
  reg_no text PRIMARY KEY,
  route text,
  capacity int NOT NULL DEFAULT 42,
  fuel_type text NOT NULL DEFAULT 'diesel',
  status text NOT NULL DEFAULT 'active',
  odometer_km int NOT NULL DEFAULT 0,
  last_service_at timestamptz,
  next_service_km int,
  health_score int NOT NULL DEFAULT 90,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buses TO anon, authenticated;
GRANT ALL ON public.buses TO service_role;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open buses read"   ON public.buses FOR SELECT USING (true);
CREATE POLICY "open buses write"  ON public.buses FOR INSERT WITH CHECK (true);
CREATE POLICY "open buses update" ON public.buses FOR UPDATE USING (true);
CREATE POLICY "open buses delete" ON public.buses FOR DELETE USING (true);

-- DRIVERS / CREW
CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT 'driver', -- driver | conductor
  license_no text,
  license_expiry date,
  phone text,
  rating numeric(3,1) NOT NULL DEFAULT 4.5,
  status text NOT NULL DEFAULT 'available', -- available | on_duty | off_duty | leave
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO anon, authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open drivers read"   ON public.drivers FOR SELECT USING (true);
CREATE POLICY "open drivers write"  ON public.drivers FOR INSERT WITH CHECK (true);
CREATE POLICY "open drivers update" ON public.drivers FOR UPDATE USING (true);
CREATE POLICY "open drivers delete" ON public.drivers FOR DELETE USING (true);

-- ROSTER
CREATE TABLE public.roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duty_date date NOT NULL DEFAULT current_date,
  bus_reg text REFERENCES public.buses(reg_no) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  conductor_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  route text,
  shift_start time NOT NULL,
  shift_end time NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roster TO anon, authenticated;
GRANT ALL ON public.roster TO service_role;
ALTER TABLE public.roster ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open roster read"   ON public.roster FOR SELECT USING (true);
CREATE POLICY "open roster write"  ON public.roster FOR INSERT WITH CHECK (true);
CREATE POLICY "open roster update" ON public.roster FOR UPDATE USING (true);
CREATE POLICY "open roster delete" ON public.roster FOR DELETE USING (true);

-- TRIP LOGS
CREATE TABLE public.trip_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_reg text,
  driver_id uuid,
  route text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  distance_km numeric(6,2) DEFAULT 0,
  passengers_est int DEFAULT 0,
  fuel_liters numeric(6,2)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_logs TO anon, authenticated;
GRANT ALL ON public.trip_logs TO service_role;
ALTER TABLE public.trip_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open trip_logs read"  ON public.trip_logs FOR SELECT USING (true);
CREATE POLICY "open trip_logs write" ON public.trip_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "open trip_logs update" ON public.trip_logs FOR UPDATE USING (true);

-- FUEL LOGS
CREATE TABLE public.fuel_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_reg text NOT NULL,
  liters numeric(6,2) NOT NULL,
  cost numeric(8,2),
  odometer_km int,
  refueled_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fuel_logs TO anon, authenticated;
GRANT ALL ON public.fuel_logs TO service_role;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open fuel read"  ON public.fuel_logs FOR SELECT USING (true);
CREATE POLICY "open fuel write" ON public.fuel_logs FOR INSERT WITH CHECK (true);

-- SERVICE LOGS
CREATE TABLE public.service_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_reg text NOT NULL,
  kind text NOT NULL,
  notes text,
  serviced_at timestamptz NOT NULL DEFAULT now(),
  next_due_km int
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_logs TO anon, authenticated;
GRANT ALL ON public.service_logs TO service_role;
ALTER TABLE public.service_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open service read"  ON public.service_logs FOR SELECT USING (true);
CREATE POLICY "open service write" ON public.service_logs FOR INSERT WITH CHECK (true);

-- ANOMALIES
CREATE TABLE public.anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id text NOT NULL,
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  message text NOT NULL,
  lat double precision,
  lng double precision,
  ai_explanation text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.anomalies TO anon, authenticated;
GRANT ALL ON public.anomalies TO service_role;
ALTER TABLE public.anomalies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open anomalies read"   ON public.anomalies FOR SELECT USING (true);
CREATE POLICY "open anomalies write"  ON public.anomalies FOR INSERT WITH CHECK (true);
CREATE POLICY "open anomalies update" ON public.anomalies FOR UPDATE USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.anomalies;

-- SEED FLEET
INSERT INTO public.buses (reg_no, route, capacity, fuel_type, odometer_km, health_score, next_service_km, last_service_at) VALUES
('MH17-AB-1023','R1',42,'diesel',128430,94,135000, now() - interval '20 days'),
('MH17-CD-4521','R1',42,'diesel',141220,78,145000, now() - interval '55 days'),
('MH17-EF-7788','R2',42,'cng',  96340,91,100000, now() - interval '10 days'),
('MH17-GH-2210','R2',42,'diesel',152901,82,155000, now() - interval '40 days'),
('MH17-IJ-9090','R3',42,'cng',  74220,96, 80000, now() - interval '6 days'),
('MH17-KL-3344','R3',42,'diesel',118550,88,125000, now() - interval '18 days'),
('MH17-OP-6712',NULL,42,'diesel', 8420,99, 15000, now() - interval '2 days');

-- SEED CREW
INSERT INTO public.drivers (name, role, license_no, license_expiry, phone, rating, status) VALUES
('Ramesh Kulkarni','driver','MH1420180001234','2027-08-12','+919812340001',4.8,'on_duty'),
('Suresh Pawar','driver','MH1420170005678','2026-11-02','+919812340002',4.5,'on_duty'),
('Vijay More','driver','MH1420190009876','2028-02-19','+919812340003',4.9,'on_duty'),
('Anil Sonawane','driver','MH1420160003344','2025-12-30','+919812340004',4.2,'on_duty'),
('Pradeep Bhagat','driver','MH1420210004411','2029-04-08','+919812340005',4.7,'on_duty'),
('Mahesh Thorat','driver','MH1420180005522','2027-06-15','+919812340006',4.6,'on_duty'),
('Sandeep Gade','driver','MH1420200007733','2028-09-22','+919812340007',4.4,'available'),
('Kiran Jadhav','conductor',NULL,NULL,'+919812340101',4.7,'on_duty'),
('Priya Shinde','conductor',NULL,NULL,'+919812340102',4.8,'on_duty'),
('Nilesh Wagh','conductor',NULL,NULL,'+919812340103',4.5,'available');

-- SEED TODAY'S ROSTER
INSERT INTO public.roster (duty_date, bus_reg, driver_id, conductor_id, route, shift_start, shift_end, status)
SELECT current_date, b.reg_no, d.id, c.id, b.route, '06:00','14:00','scheduled'
FROM public.buses b
JOIN LATERAL (SELECT id FROM public.drivers WHERE role='driver' ORDER BY random() LIMIT 1) d ON true
JOIN LATERAL (SELECT id FROM public.drivers WHERE role='conductor' ORDER BY random() LIMIT 1) c ON true
WHERE b.route IS NOT NULL;
