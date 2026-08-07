CREATE TABLE public.sms_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_hash text NOT NULL UNIQUE,
  route text,
  stop_id text,
  lang text NOT NULL DEFAULT 'en',
  last_buses jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sms_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_hash text NOT NULL,
  bus_id text NOT NULL,
  route text,
  stop_id text,
  stop_name text,
  threshold_min integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.sms_sessions TO service_role;
GRANT ALL ON public.sms_alerts TO service_role;

ALTER TABLE public.sms_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read sms sessions" ON public.sms_sessions
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "staff read sms alerts" ON public.sms_alerts
  FOR SELECT TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'dispatcher'::app_role]));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_sms_sessions_updated_at BEFORE UPDATE ON public.sms_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sms_alerts_updated_at BEFORE UPDATE ON public.sms_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_sms_alerts_status ON public.sms_alerts (status, created_at DESC);