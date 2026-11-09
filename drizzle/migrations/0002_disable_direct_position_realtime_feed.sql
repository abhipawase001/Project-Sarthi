DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'live_bus_positions'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.live_bus_positions;
  END IF;
END;
$$;