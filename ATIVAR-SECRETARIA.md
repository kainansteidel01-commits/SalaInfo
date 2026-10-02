# Ativar o painel da secretaria

## 1. Atualizar o banco existente

No SQL Editor execute secretaria-migration.sql. Não execute novamente supabase-setup.sql. A migração acrescenta o papel de secretaria e permite que uma conta ativa com esse papel cancele reservas de qualquer professor, inclusive passadas.

## 2. Autorizar a conta escolhida

Crie a conta e o perfil da pessoa responsável, como já fez para Ana. Em seguida execute, substituindo o UID entre aspas:

```sql
update public.profiles
set role = 'secretary'
where id = 'COLE-O-UID-DA-SECRETARIA';
```

Não autorize todos os professores como secretaria. Para remover essa permissão, altere role para 'teacher'. Nenhum botão do site permite promover uma conta.

## 3. Ativar o cadastro de professores

No painel Supabase, abra Edge Functions e crie uma função pelo editor chamada exatamente create-teacher. Cole o conteúdo de supabase/functions/create-teacher/index.ts e publique. Mantenha a verificação JWT ativada. A função também valida o usuário e consulta seu papel ativo no banco antes de criar qualquer conta.

O ambiente hospedado do Supabase fornece SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para a função. Confira se estão disponíveis em Secrets. Nunca copie a chave administrativa para o site, para o GitHub ou para este chat.

O cadastro cria somente professores; não permite promover secretários. Verifique a identidade e a propriedade do e-mail antes de cadastrar: o cadastro administrativo já confirma esse endereço. Nenhum e-mail é enviado automaticamente. Entregue a senha individual de forma privada. Recuperação/troca de senha pela interface ainda não está incluída.

## 4. Atualizar o site

Envie index.html, app.js, services.js, supabase-config.js e supabase-service.js juntos ao GitHub. O diretório supabase contém código de servidor: publicá-lo no GitHub não publica a função no Supabase.

No rodapé do login, clique “É da secretaria? Acesse o painel administrativo.” Entre com a conta autorizada. Professores comuns não podem entrar por esse acesso. Uma conta de secretaria também vê seu painel se entrar pela tela normal.

## 5. Conferir

- Uma conta de professor deve ser recusada no acesso da secretaria e ao chamar create-teacher.
- Uma conta de secretaria ativa deve ver equipe e todas as reservas.
- Cadastre um professor de teste e confirme que ele consegue entrar, mas não administrar.
- Cancele uma reserva de teste de outro professor e confira a liberação em outro dispositivo.
- Remova o papel ou desative a conta e confira que novas ações administrativas são recusadas pelo servidor.

A implementação não foi instalada no seu Supabase nem testada com contas reais nesta alteração. Os testes locais não substituem estas verificações de permissões após a publicação.

Referência: https://supabase.com/docs/guides/functions/auth-headers
