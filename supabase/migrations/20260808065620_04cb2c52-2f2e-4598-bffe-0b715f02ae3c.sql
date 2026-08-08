CREATE TABLE public.ivr_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_hash TEXT NOT NULL UNIQUE,
  phone_hash TEXT,
  lang TEXT NOT NULL DEFAULT 'en',
  route TEXT,
  stop_id TEXT,
  state TEXT NOT NULL DEFAULT 'lang',
  attempts INT NOT NULL DEFAULT 0,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ivr_calls_created_at_idx ON public.ivr_calls (created_at DESC);

GRANT SELECT ON public.ivr_calls TO authenticated;
GRANT ALL ON public.ivr_calls TO service_role;

ALTER TABLE public.ivr_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view IVR calls"
ON public.ivr_calls FOR SELECT TO authenticated
USING (private.has_any_role(auth.uid(), ARRAY['admin','dispatcher']::public.app_role[]));

CREATE TRIGGER update_ivr_calls_updated_at
BEFORE UPDATE ON public.ivr_calls
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ivr_audio_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phrase_key TEXT NOT NULL UNIQUE,
  lang TEXT NOT NULL,
  text TEXT NOT NULL,
  audio_base64 TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'mp3',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.ivr_audio_cache TO service_role;

ALTER TABLE public.ivr_audio_cache ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_ivr_audio_cache_updated_at
BEFORE UPDATE ON public.ivr_audio_cache
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();