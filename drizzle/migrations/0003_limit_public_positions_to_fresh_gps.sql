DROP POLICY IF EXISTS "Anyone can read live bus positions" ON public.live_bus_positions;
CREATE POLICY "Anyone can read fresh live bus positions" ON public.live_bus_positions
  FOR SELECT TO anon, authenticated
  USING (observed_at >= now() - interval '60 seconds' AND observed_at <= now() + interval '30 seconds');