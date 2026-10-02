# Ativar o SalaInfo compartilhado

O código está configurado para mwzuwqfjiupcacfibfjk.supabase.co. Ainda é necessário configurar o banco e os usuários. Não publique como sistema pronto antes de concluir e testar estes passos.

## 1. Criar as tabelas

No painel do seu projeto Supabase, abra SQL Editor, crie uma consulta, cole todo o conteúdo de supabase-setup.sql e execute em Run. Execute uma única vez. O script cria tabelas novas; se já houver tabelas profiles ou reservations, pare e adapte a migração antes de executá-lo.

As regras permitem leitura apenas a professores com perfil ativo. Usuários não podem se autorizar, alterar nomes, reservar em nome de outros ou cancelar reservas de outros professores. Uma restrição única impede duas reservas para a mesma aula/data.

## 2. Criar as contas

Desative novos cadastros públicos nas configurações de Authentication. Em Authentication → Users, use a opção de adicionar/criar usuário, informando o e-mail real do professor e uma senha individual forte. Confirme o e-mail pelo painel somente após verificar a identidade do professor. Não envie senhas no chat nem as coloque no GitHub.

Após criar a conta, copie o identificador UUID do usuário. No SQL Editor execute, substituindo o UUID:

```sql
insert into public.profiles (id, name)
values ('COLE-O-UUID-DA-ANA', 'Ana');
```

Repita com o UUID e o nome de cada professor. O usuário do protótipo ana.evaldostaidel não é uma conta real: o novo login é pelo e-mail cadastrado. O site não tem autocadastro nem recuperação de senha nesta etapa; a administração das contas ocorre pelo painel.

Para bloquear o acesso de um professor, o administrador pode alterar active para false em profiles. Só o painel administrativo pode modificar os perfis.

## 3. Atualizar o GitHub

Extraia SalaInfo-Supabase-GitHub.zip. Envie para a mesma pasta do repositório:

- index.html
- app.js
- services.js
- supabase-config.js
- supabase-service.js

Os demais arquivos são documentação, SQL e testes. Não há etapa de compilação. A biblioteca Supabase é carregada pela internet; se o carregamento falhar, o login informa o problema. Use HTTPS para o site publicado.

A URL e a chave publishable são públicas e podem estar no frontend. Nunca substitua pela secret key ou service_role. A proteção dos dados é feita pelas regras do banco, não pelo sigilo da chave pública.

## 4. Conferir antes de usar

Entre com duas contas autorizadas em navegadores diferentes. Reserve uma aula: a outra conta deve vê-la em até 15 segundos (com a página visível). Tente reservar a mesma aula: apenas uma reserva deve ser aceita. Confira que o botão cancelar só aparece na agenda do proprietário; o banco também bloqueia cancelamentos de terceiros. Cancele e confirme a liberação no outro navegador. Confira que uma conta sem perfil ativo não entra.

As reservas locais do protótipo não são transferidas. Não use os testes locais como comprovação da configuração real de permissões: a verificação acima depende do SQL instalado e das contas reais.

As turmas continuam sendo exemplos. Ajuste a lista em services.js e a restrição school_class do banco com a lista oficial. O modelo atual possui uma sala e cinco aulas por dia, sem turnos nem calendário escolar.

Referências: https://supabase.com/docs/guides/database/postgres/row-level-security e https://supabase.com/docs/reference/javascript/auth-signinwithpassword
