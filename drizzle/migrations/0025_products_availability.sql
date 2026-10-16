ALTER TABLE public.products ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'disponivel';
ALTER TABLE public.products ADD CONSTRAINT products_availability_check CHECK (availability IN ('disponivel','sob_consulta','indisponivel'));
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_updated_at timestamptz NOT NULL DEFAULT now();