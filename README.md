# SalaInfo — EMEB Vereador Evaldo Staidel

Abra index.html em um navegador moderno. O projeto usa HTML, CSS e JavaScript sem instalação de dependências. Para testar entre abas com uma origem estável, sirva esta pasta por HTTP local.

Usuário de demonstração: ana.evaldostaidel. Qualquer sequência de seis números permite entrar. Não use credenciais reais: este login é uma simulação e não protege os dados.

## Funcionalidades

- Carregamento, login, saída e navegação entre início, disponibilidade e agenda.
- Cinco aulas por data, turma obrigatória e finalidade opcional de até 300 caracteres.
- Reserva pela disponibilidade ou pelo botão “+ Nova reserva”.
- Atualização dos indicadores de hoje e da agenda ordenada por data e aula.
- Persistência no navegador e atualização entre abas da mesma origem.
- Cancelamento das próprias reservas de hoje ou futuras, com confirmação e liberação da aula.
- Rejeição de datas anteriores ao dia atual em São Paulo e de aulas ocupadas.
- Mensagens de erro de leitura e gravação, sem apagar dados automaticamente.

As turmas são exemplos configurados em services.js. As reservas fictícias da imagem anterior foram removidas: a agenda começa vazia. Não foram presumidos turnos, horários, feriados ou restrições de dias letivos. A escola deve fornecer essas regras antes do uso real.

## Organização e futura integração

index.html mantém a identidade visual original; app.js controla a interface; services.js fornece serviços assíncronos de autenticação e reservas. A composição dos serviços fica no início de app.js. Não há servidor conectado.

Contrato a preservar ao substituir o adaptador local:

- auth.signIn(username, password) → usuário com id e name.
- auth.currentUser() → usuário ou null; auth.signOut() → encerra sessão.
- reservations.list() → reservas acessíveis à sessão.
- reservations.create({date, lesson, schoolClass, purpose}) → reserva persistida ou erro.
- reservations.cancel(id) → reserva cancelada ou erro; validar proprietário e data também no servidor.

## Arquivos para o GitHub

Envie index.html, app.js e services.js juntos para a raiz do repositório. Não é necessário compilar nem instalar pacotes. O README.md e services.test.cjs também podem ser enviados para documentar e testar o projeto.

Para GitHub Pages, publique a raiz da branch que contém esses arquivos. Todos os caminhos são relativos e funcionam em um endereço de projeto. O pacote ZIP contém somente os arquivos do projeto, sem reservas do navegador e sem credenciais reais.

Na agenda, escolha “Cancelar reserva”. Confira data, aula e turma; “Manter reserva” ou Escape fecha a confirmação sem alterar a reserva. “Sim, cancelar reserva” libera a aula e atualiza os contadores e a lista. A proteção do proprietário nesta demonstração é apenas local; a autorização real deverá ocorrer no servidor.

O servidor deve derivar professor e identificador do usuário da sessão autenticada, nunca aceitar identidade enviada pelo navegador. A integração deve usar provedor de autenticação ou sessão de servidor, HTTPS, cookies HttpOnly/Secure/SameSite quando aplicáveis, proteção contra CSRF e limitação de tentativas. Nenhuma chave administrativa ou senha deve integrar os arquivos públicos. O PIN demonstrativo de seis dígitos não define a política de autenticação de produção.

Modelo sugerido para o banco: users (id, nome, vínculo com identidade), rooms (id, nome), classes (id, nome, ativa), reservations (id, room_id, user_id, class_id, date, lesson, purpose, created_at). Criar chave única em (room_id, date, lesson), chaves estrangeiras e validações de aula e tamanho no banco. Se houver turnos, incluí-los no modelo e na chave única.

Criar a reserva em transação; a chave única deve resolver concorrência e o serviço deve traduzir conflito em erro de horário ocupado. Validar calendário e permissões no servidor. Restringir leitura aos usuários autorizados, criação ao usuário da sessão e futuras alterações/cancelamentos ao proprietário ou administrador.

O adaptador local usa Web Locks quando disponível para serializar gravações entre abas. Sem esse recurso, a checagem local não garante exclusão em acessos simultâneos. Compartilhamento entre dispositivos e proteção contra manipulação dependem do servidor. O evento storage atualiza outras abas; futuramente substitua por assinatura de mudanças ou atualização periódica.

## Verificação

Execute node --test services.test.cjs para validar sessão, persistência, conflitos, entradas inválidas e falhas de armazenamento.

Verificação manual: entre, reserve uma aula, confirme os contadores e a agenda, recarregue e entre novamente; confira a persistência. Teste Cancelar/Escape, datas futuras, uma data totalmente ocupada e duas abas. Confira também o formulário em tela estreita.
