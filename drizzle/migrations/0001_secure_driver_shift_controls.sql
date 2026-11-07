CREATE OR REPLACE FUNCTION public.link_driver_account()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_driver_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;
  SELECT lower(u.email) INTO v_email
  FROM auth.users u
  WHERE u.id = v_user_id AND u.email_confirmed_at IS NOT NULL;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Confirm your email before linking your crew account';
  END IF;
  UPDATE public.drivers d
  SET auth_user_id = v_user_id
  WHERE lower(d.email) = v_email
    AND (d.auth_user_id IS NULL OR d.auth_user_id = v_user_id)
  RETURNING d.id INTO v_driver_id;
  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'No available crew record matches this confirmed email';
  END IF;
  RETURN v_driver_id;
END;
$$;
REVOKE ALL ON FUNCTION public.link_driver_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_driver_account() TO authenticated;

CREATE OR REPLACE FUNCTION public.driver_start_shift(_roster_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_bus_reg text;
  v_route text;
  v_driver_id uuid;
  v_trip_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;
  SELECT r.bus_reg, r.route, d.id
  INTO v_bus_reg, v_route, v_driver_id
  FROM public.roster r
  JOIN public.drivers d ON d.id = r.driver_id
  JOIN public.buses b ON b.reg_no = r.bus_reg
  WHERE r.id = _roster_id
    AND d.auth_user_id = v_user_id
    AND r.duty_date = (now() AT TIME ZONE 'Asia/Kolkata')::date
    AND r.status IN ('scheduled', 'active', 'in_progress')
    AND b.status = 'active'
  FOR UPDATE OF r;
  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'No active bus assignment is available for this account';
  END IF;
  UPDATE public.roster SET status = 'active' WHERE id = _roster_id;
  INSERT INTO public.trip_logs (roster_id, bus_reg, driver_id, route, started_at)
  VALUES (_roster_id, v_bus_reg, v_driver_id, v_route, now())
  ON CONFLICT (roster_id) WHERE (roster_id IS NOT NULL AND ended_at IS NULL) DO NOTHING;
  SELECT id INTO v_trip_id FROM public.trip_logs WHERE roster_id = _roster_id AND ended_at IS NULL;
  RETURN v_trip_id;
END;
$$;
REVOKE ALL ON FUNCTION public.driver_start_shift(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.driver_start_shift(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.driver_end_shift(_roster_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_trip_id uuid;
  v_distance numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;
  SELECT t.id INTO v_trip_id
  FROM public.trip_logs t
  JOIN public.drivers d ON d.id = t.driver_id
  WHERE t.roster_id = _roster_id
    AND t.ended_at IS NULL
    AND d.auth_user_id = v_user_id
  FOR UPDATE OF t;
  IF v_trip_id IS NULL THEN
    RAISE EXCEPTION 'No open trip exists for this shift';
  END IF;
  WITH points AS (
    SELECT p.lat, p.lng,
      lead(p.lat) OVER (ORDER BY p.observed_at, p.id) AS next_lat,
      lead(p.lng) OVER (ORDER BY p.observed_at, p.id) AS next_lng
    FROM public.bus_pings p
    WHERE p.roster_id = _roster_id
  ), distance AS (
    SELECT sum(6371.0 * 2 * asin(sqrt(least(1.0, greatest(0.0,
      power(sin(radians(next_lat - lat) / 2), 2)
      + cos(radians(lat)) * cos(radians(next_lat)) * power(sin(radians(next_lng - lng) / 2), 2)
    ))))) AS km
    FROM points WHERE next_lat IS NOT NULL AND next_lng IS NOT NULL
  )
  SELECT COALESCE(km, 0)::numeric INTO v_distance FROM distance;
  UPDATE public.trip_logs SET ended_at = now(), distance_km = v_distance WHERE id = v_trip_id;
  UPDATE public.roster SET status = 'completed' WHERE id = _roster_id;
  RETURN v_distance;
END;
$$;
REVOKE ALL ON FUNCTION public.driver_end_shift(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.driver_end_shift(uuid) TO authenticated;