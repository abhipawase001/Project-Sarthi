
-- Incident reports (SOS, crowd, delay, generic)
CREATE TABLE public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('sos','crowd','delay','other')),
  bus_id text,
  stop_id text,
  message text,
  lat double precision,
  lng double precision,
  status text not null default 'open' check (status in ('open','ack','resolved')),
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT ON public.incident_reports TO anon, authenticated;
GRANT ALL ON public.incident_reports TO service_role;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read incidents" ON public.incident_reports FOR SELECT USING (true);
CREATE POLICY "Anyone can report incidents" ON public.incident_reports FOR INSERT WITH CHECK (true);

-- Live bus pings (from driver app)
CREATE TABLE public.bus_pings (
  id uuid primary key default gen_random_uuid(),
  bus_id text not null,
  route text not null,
  lat double precision not null,
  lng double precision not null,
  speed double precision not null default 0,
  heading double precision not null default 0,
  occupancy text not null default 'medium' check (occupancy in ('low','medium','high')),
  created_at timestamptz not null default now()
);
CREATE INDEX bus_pings_bus_idx ON public.bus_pings(bus_id, created_at desc);
GRANT SELECT, INSERT ON public.bus_pings TO anon, authenticated;
GRANT ALL ON public.bus_pings TO service_role;
ALTER TABLE public.bus_pings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pings" ON public.bus_pings FOR SELECT USING (true);
CREATE POLICY "Anyone can post pings" ON public.bus_pings FOR INSERT WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bus_pings;
