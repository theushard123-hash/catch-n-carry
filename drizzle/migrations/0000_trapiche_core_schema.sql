-- ===== ENUMS =====
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.customer_type AS ENUM ('atacado', 'varejo');
CREATE TYPE public.order_status AS ENUM ('pendente', 'aprovado', 'faturado', 'cancelado');

-- ===== ROLES =====
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text,
  full_name text NOT NULL DEFAULT '',
  company_name text NOT NULL DEFAULT '',
  document text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT 'PR',
  zip text NOT NULL DEFAULT '',
  customer_type public.customer_type NOT NULL DEFAULT 'varejo',
  approved boolean NOT NULL DEFAULT false,
  external_code text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Non-admins cannot change protected fields
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.approved := OLD.approved;
    NEW.customer_type := OLD.customer_type;
    NEW.external_code := OLD.external_code;
    NEW.admin_notes := OLD.admin_notes;
    NEW.user_id := OLD.user_id;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- Auto-create profile on signup; first user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type public.customer_type := 'varejo';
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'customer_type','') = 'atacado' THEN
    v_type := 'atacado';
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, company_name, document, phone, customer_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'document', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    v_type
  );

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    UPDATE public.profiles SET approved = true WHERE user_id = NEW.id;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== CATEGORIES =====
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read categories" ON public.categories
  FOR SELECT TO authenticated USING (active = true OR public.is_admin());
CREATE POLICY "Admins manage categories" ON public.categories
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== PRODUCTS =====
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  unit text NOT NULL DEFAULT 'kg',
  price_atacado numeric(12,2) NOT NULL DEFAULT 0,
  price_varejo numeric(12,2) NOT NULL DEFAULT 0,
  min_qty numeric(12,3) NOT NULL DEFAULT 1,
  step_qty numeric(12,3) NOT NULL DEFAULT 1,
  image_url text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read products" ON public.products
  FOR SELECT TO authenticated USING (active = true OR public.is_admin());
CREATE POLICY "Admins manage products" ON public.products
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== PAYMENT CONDITIONS =====
CREATE TABLE public.payment_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  customer_type public.customer_type NULL, -- NULL = ambos
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_conditions TO authenticated;
GRANT ALL ON public.payment_conditions TO service_role;
ALTER TABLE public.payment_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read payment conditions" ON public.payment_conditions
  FOR SELECT TO authenticated USING (active = true OR public.is_admin());
CREATE POLICY "Admins manage payment conditions" ON public.payment_conditions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== SETTINGS (singleton) =====
CREATE TABLE public.app_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name text NOT NULL DEFAULT 'Trapiche Pescados',
  whatsapp text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  min_order_atacado numeric(12,2) NOT NULL DEFAULT 0,
  min_order_varejo numeric(12,2) NOT NULL DEFAULT 0,
  notice text NOT NULL DEFAULT '',
  require_approval boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read settings" ON public.app_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage settings" ON public.app_settings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
INSERT INTO public.app_settings (id, whatsapp, contact_email) VALUES (1, '4130147701', 'comunicacao@trapichepescados.com.br');

-- ===== ORDERS =====
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number bigint GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pendente',
  customer_type public.customer_type NOT NULL,
  payment_condition_id uuid REFERENCES public.payment_conditions(id) ON DELETE SET NULL,
  payment_condition_name text NOT NULL DEFAULT '',
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  delivery_date date,
  external_id text,
  admin_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own orders" ON public.orders
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users create own orders" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users cancel own pending orders" ON public.orders
  FOR UPDATE TO authenticated USING (user_id = auth.uid() AND status = 'pendente')
  WITH CHECK (user_id = auth.uid() AND status IN ('pendente','cancelado'));
CREATE POLICY "Admins manage orders" ON public.orders
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  sku text,
  unit text NOT NULL DEFAULT 'kg',
  qty numeric(12,3) NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  total numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own order items" ON public.order_items
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Users insert own order items" ON public.order_items
  FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid() AND o.status = 'pendente'));
CREATE POLICY "Admins manage order items" ON public.order_items
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== SEED =====
INSERT INTO public.categories (id, name, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Peixes', 1),
  ('11111111-1111-1111-1111-111111111102', 'Camarões', 2),
  ('11111111-1111-1111-1111-111111111103', 'Frutos do Mar', 3),
  ('11111111-1111-1111-1111-111111111104', 'Bacalhau e Salgados', 4);

INSERT INTO public.products (sku, name, description, category_id, unit, price_atacado, price_varejo, min_qty, step_qty, sort_order) VALUES
  ('SAL-001', 'Salmão Fresco Inteiro', 'Salmão chileno fresco, calibre 6-7 kg.', '11111111-1111-1111-1111-111111111101', 'kg', 62.90, 79.90, 1, 0.5, 1),
  ('SAL-002', 'Filé de Salmão sem Pele', 'Filé limpo, porcionado sob demanda.', '11111111-1111-1111-1111-111111111101', 'kg', 89.90, 109.90, 0.5, 0.5, 2),
  ('TIL-001', 'Filé de Tilápia Congelado', 'Filé de tilápia congelado IQF, pacote 1 kg.', '11111111-1111-1111-1111-111111111101', 'kg', 34.90, 44.90, 1, 1, 3),
  ('ATU-001', 'Atum Fresco (Lombo)', 'Lombo de atum sashimi grade.', '11111111-1111-1111-1111-111111111101', 'kg', 98.00, 129.00, 0.5, 0.5, 4),
  ('LIN-001', 'Linguado Fresco', 'Linguado inteiro eviscerado.', '11111111-1111-1111-1111-111111111101', 'kg', 54.90, 69.90, 1, 0.5, 5),
  ('CAM-001', 'Camarão Cinza Limpo 36/40', 'Camarão descascado e eviscerado, caixa 1 kg.', '11111111-1111-1111-1111-111111111102', 'kg', 58.90, 74.90, 1, 1, 1),
  ('CAM-002', 'Camarão Rosa Inteiro G', 'Camarão rosa inteiro, calibre grande.', '11111111-1111-1111-1111-111111111102', 'kg', 79.90, 99.90, 1, 1, 2),
  ('CAM-003', 'Camarão VG Limpo 16/20', 'Camarão extra grande limpo.', '11111111-1111-1111-1111-111111111102', 'kg', 94.90, 119.90, 1, 1, 3),
  ('POL-001', 'Polvo Limpo Congelado', 'Polvo inteiro limpo, 1-2 kg.', '11111111-1111-1111-1111-111111111103', 'kg', 69.90, 89.90, 1, 0.5, 1),
  ('LUL-001', 'Anel de Lula Congelado', 'Anéis de lula limpos, pacote 1 kg.', '11111111-1111-1111-1111-111111111103', 'kg', 39.90, 52.90, 1, 1, 2),
  ('MEX-001', 'Mexilhão Meia Concha', 'Mexilhão chileno meia concha, caixa 1 kg.', '11111111-1111-1111-1111-111111111103', 'kg', 32.90, 42.90, 1, 1, 3),
  ('VIE-001', 'Vieira sem Coral', 'Vieiras congeladas selecionadas.', '11111111-1111-1111-1111-111111111103', 'kg', 129.00, 159.00, 0.5, 0.5, 4),
  ('BAC-001', 'Bacalhau Gadus Morhua Lombo', 'Lombo de bacalhau do Porto dessalgado congelado.', '11111111-1111-1111-1111-111111111104', 'kg', 119.00, 149.00, 0.5, 0.5, 1),
  ('BAC-002', 'Bacalhau Saithe Desfiado', 'Bacalhau desfiado dessalgado, pacote 1 kg.', '11111111-1111-1111-1111-111111111104', 'kg', 44.90, 59.90, 1, 1, 2);

INSERT INTO public.payment_conditions (name, description, customer_type, sort_order) VALUES
  ('PIX à vista', 'Pagamento via PIX na confirmação do pedido.', NULL, 1),
  ('Cartão de crédito', 'Pagamento no cartão na entrega.', 'varejo', 2),
  ('Boleto 7 dias', 'Boleto bancário com vencimento em 7 dias.', 'atacado', 3),
  ('Boleto 14 dias', 'Boleto bancário com vencimento em 14 dias.', 'atacado', 4),
  ('Boleto 21/28 dias', 'Boleto parcelado em 2x (21 e 28 dias).', 'atacado', 5),
  ('Dinheiro na entrega', 'Pagamento em espécie no ato da entrega.', 'varejo', 6);