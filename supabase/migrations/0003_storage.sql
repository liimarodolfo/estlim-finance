-- ESTLIM · Storage
-- Dois buckets privados, ambos com teto de 2 MB e so imagem.
--   avatares/{auth.uid()}/...    foto do perfil, cada um mexe na propria pasta
--   corretoras/{casal_id}/...    logo da corretora, o casal inteiro le e escreve

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatares',  'avatares',  false, 2097152, array['image/png','image/jpeg','image/webp','image/gif']),
  ('corretoras','corretoras',false, 2097152, array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do nothing;

-- ============ AVATARES ============
create policy avatares_sel on storage.objects for select to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatares_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatares_upd on storage.objects for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatares_del on storage.objects for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============ CORRETORAS ============
-- A primeira pasta do caminho e o casal_id, entao o logo nunca cruza de casal.
create policy corretoras_sel on storage.objects for select to authenticated
  using (bucket_id = 'corretoras' and (storage.foldername(name))[1] = meu_casal()::text);
create policy corretoras_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'corretoras' and (storage.foldername(name))[1] = meu_casal()::text);
create policy corretoras_upd on storage.objects for update to authenticated
  using (bucket_id = 'corretoras' and (storage.foldername(name))[1] = meu_casal()::text)
  with check (bucket_id = 'corretoras' and (storage.foldername(name))[1] = meu_casal()::text);
create policy corretoras_del on storage.objects for delete to authenticated
  using (bucket_id = 'corretoras' and (storage.foldername(name))[1] = meu_casal()::text);
