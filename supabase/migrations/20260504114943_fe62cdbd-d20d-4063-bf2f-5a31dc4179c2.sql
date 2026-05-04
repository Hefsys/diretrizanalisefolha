-- Novos campos em conferencia_itens
ALTER TABLE public.conferencia_itens
  ADD COLUMN IF NOT EXISTS gratificacao_nps_pdf numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gratificacao_nps_planilha numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adiant_premio_pdf numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adiant_premio_planilha numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS salario_base numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vale_transporte numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vale_refeicao numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plano_saude numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outros_beneficios jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bancos_esocial jsonb DEFAULT '[]'::jsonb;

-- Tabela de empréstimos consignados detalhados
CREATE TABLE IF NOT EXISTS public.conferencia_emprestimos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.conferencia_itens(id) ON DELETE CASCADE,
  conferencia_id uuid NOT NULL REFERENCES public.conferencias(id) ON DELETE CASCADE,
  banco text,
  numero_contrato text,
  parcela numeric DEFAULT 0,
  parcelas_restantes integer,
  origem text NOT NULL DEFAULT 'esocial',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emprestimos_item ON public.conferencia_emprestimos(item_id);
CREATE INDEX IF NOT EXISTS idx_emprestimos_conferencia ON public.conferencia_emprestimos(conferencia_id);

ALTER TABLE public.conferencia_emprestimos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empréstimos do dono - select"
ON public.conferencia_emprestimos FOR SELECT
USING (EXISTS (SELECT 1 FROM public.conferencias c WHERE c.id = conferencia_emprestimos.conferencia_id AND c.user_id = auth.uid()));

CREATE POLICY "Empréstimos do dono - insert"
ON public.conferencia_emprestimos FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.conferencias c WHERE c.id = conferencia_emprestimos.conferencia_id AND c.user_id = auth.uid()));

CREATE POLICY "Empréstimos do dono - update"
ON public.conferencia_emprestimos FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.conferencias c WHERE c.id = conferencia_emprestimos.conferencia_id AND c.user_id = auth.uid()));

CREATE POLICY "Empréstimos do dono - delete"
ON public.conferencia_emprestimos FOR DELETE
USING (EXISTS (SELECT 1 FROM public.conferencias c WHERE c.id = conferencia_emprestimos.conferencia_id AND c.user_id = auth.uid()));