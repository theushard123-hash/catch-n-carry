ALTER TABLE public.products ADD COLUMN variable_weight boolean NOT NULL DEFAULT false;
UPDATE public.products SET variable_weight = true WHERE lower(trim(unit)) = 'kg';