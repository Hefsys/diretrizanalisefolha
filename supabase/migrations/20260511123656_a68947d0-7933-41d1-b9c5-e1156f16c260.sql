-- Conferências compartilhadas entre todos os usuários autenticados
DROP POLICY IF EXISTS "Conferências do dono - select" ON public.conferencias;
DROP POLICY IF EXISTS "Conferências do dono - update" ON public.conferencias;
DROP POLICY IF EXISTS "Conferências do dono - delete" ON public.conferencias;
DROP POLICY IF EXISTS "Conferências do dono - insert" ON public.conferencias;

CREATE POLICY "Conferências - select autenticados" ON public.conferencias
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Conferências - insert autenticados" ON public.conferencias
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Conferências - update autenticados" ON public.conferencias
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Conferências - delete autenticados" ON public.conferencias
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Itens do dono da conferência - select" ON public.conferencia_itens;
DROP POLICY IF EXISTS "Itens do dono - insert" ON public.conferencia_itens;
DROP POLICY IF EXISTS "Itens do dono - update" ON public.conferencia_itens;
DROP POLICY IF EXISTS "Itens do dono - delete" ON public.conferencia_itens;

CREATE POLICY "Itens - select autenticados" ON public.conferencia_itens
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Itens - insert autenticados" ON public.conferencia_itens
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Itens - update autenticados" ON public.conferencia_itens
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Itens - delete autenticados" ON public.conferencia_itens
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Empréstimos do dono - select" ON public.conferencia_emprestimos;
DROP POLICY IF EXISTS "Empréstimos do dono - insert" ON public.conferencia_emprestimos;
DROP POLICY IF EXISTS "Empréstimos do dono - update" ON public.conferencia_emprestimos;
DROP POLICY IF EXISTS "Empréstimos do dono - delete" ON public.conferencia_emprestimos;

CREATE POLICY "Empréstimos - select autenticados" ON public.conferencia_emprestimos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Empréstimos - insert autenticados" ON public.conferencia_emprestimos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Empréstimos - update autenticados" ON public.conferencia_emprestimos
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Empréstimos - delete autenticados" ON public.conferencia_emprestimos
  FOR DELETE TO authenticated USING (true);