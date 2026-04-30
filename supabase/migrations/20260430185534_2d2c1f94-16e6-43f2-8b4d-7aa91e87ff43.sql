-- Tabela de perfis
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles selecionáveis pelo dono"
  ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Profiles inseríveis pelo dono"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Profiles atualizáveis pelo dono"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Função genérica updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cria perfil automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Conferências
CREATE TABLE public.conferencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  competencia TEXT NOT NULL,
  empresa TEXT,
  cnpj TEXT,
  pdf_nome TEXT,
  planilhas_nomes TEXT[],
  esocial_nome TEXT,
  total_funcionarios INT NOT NULL DEFAULT 0,
  total_divergencias INT NOT NULL DEFAULT 0,
  total_comissao_pdf NUMERIC(14,2) DEFAULT 0,
  total_comissao_planilha NUMERIC(14,2) DEFAULT 0,
  total_gratificacao_pdf NUMERIC(14,2) DEFAULT 0,
  total_gratificacao_planilha NUMERIC(14,2) DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conferências do dono - select"
  ON public.conferencias FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Conferências do dono - insert"
  ON public.conferencias FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Conferências do dono - update"
  ON public.conferencias FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Conferências do dono - delete"
  ON public.conferencias FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER conferencias_updated_at
  BEFORE UPDATE ON public.conferencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Itens (uma linha por funcionário)
CREATE TABLE public.conferencia_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conferencia_id UUID NOT NULL REFERENCES public.conferencias(id) ON DELETE CASCADE,
  cpf TEXT,
  matricula TEXT,
  nome TEXT NOT NULL,
  setor TEXT,
  comissao_pdf NUMERIC(14,2) DEFAULT 0,
  comissao_planilha NUMERIC(14,2) DEFAULT 0,
  gratificacao_pdf NUMERIC(14,2) DEFAULT 0,
  gratificacao_planilha NUMERIC(14,2) DEFAULT 0,
  premio_pdf NUMERIC(14,2) DEFAULT 0,
  premio_planilha NUMERIC(14,2) DEFAULT 0,
  base_inss NUMERIC(14,2) DEFAULT 0,
  valor_fgts NUMERIC(14,2) DEFAULT 0,
  emprestimos_pdf NUMERIC(14,2) DEFAULT 0,
  emprestimos_esocial_qtd INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ok',
  divergencias JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conferencia_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Itens do dono da conferência - select"
  ON public.conferencia_itens FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conferencias c WHERE c.id = conferencia_id AND c.user_id = auth.uid()));
CREATE POLICY "Itens do dono - insert"
  ON public.conferencia_itens FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.conferencias c WHERE c.id = conferencia_id AND c.user_id = auth.uid()));
CREATE POLICY "Itens do dono - update"
  ON public.conferencia_itens FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.conferencias c WHERE c.id = conferencia_id AND c.user_id = auth.uid()));
CREATE POLICY "Itens do dono - delete"
  ON public.conferencia_itens FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.conferencias c WHERE c.id = conferencia_id AND c.user_id = auth.uid()));

CREATE INDEX idx_conferencia_itens_conferencia ON public.conferencia_itens(conferencia_id);
CREATE INDEX idx_conferencias_user ON public.conferencias(user_id, created_at DESC);