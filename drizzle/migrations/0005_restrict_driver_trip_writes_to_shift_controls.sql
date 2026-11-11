DROP POLICY IF EXISTS "Assigned drivers start trips" ON public.trip_logs;
DROP POLICY IF EXISTS "Assigned drivers finish own trips" ON public.trip_logs;
CREATE UNIQUE INDEX trip_logs_one_open_per_driver ON public.trip_logs (driver_id) WHERE driver_id IS NOT NULL AND ended_at IS NULL;