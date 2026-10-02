import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
Deno.serve(async req => {
  const reply = (status: number, message: string) => new Response(JSON.stringify({ message }), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, 'Método não permitido.');
  try {
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer /i, '');
    if (!token) return reply(401, 'Entre novamente.');
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const { data: session, error: authError } = await admin.auth.getUser(token);
    if (authError || !session.user) return reply(401, 'Entre novamente.');
    const { data: profile, error: roleError } = await admin.from('profiles').select('role,active').eq('id', session.user.id).single();
    if (roleError || !profile?.active || profile.role !== 'secretary') return reply(403, 'Acesso exclusivo da secretaria.');
    const { name, email, password } = await req.json();
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100 ||
        typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        typeof password !== 'string' || password.length < 12 || password.length > 128)
      return reply(400, 'Preencha nome, e-mail válido e senha de 12 a 128 caracteres.');
    // The secretary verifies the teacher identity before creating the account.
    const { data, error } = await admin.auth.admin.createUser({ email: email.trim(), password, email_confirm: true });
    if (error || !data.user) return reply(400, 'Não foi possível criar a conta. Confira se o e-mail já existe e a política de senhas.');
    const { error: insertError } = await admin.from('profiles').insert({ id: data.user.id, name: name.trim(), active: true, role: 'teacher' });
    if (insertError) {
      const cleanup = await admin.auth.admin.deleteUser(data.user.id);
      return reply(500, cleanup.error ? 'Cadastro incompleto. Peça ao administrador para verificar a conta no Supabase.' : 'Cadastro não concluído. Verifique a configuração do banco e tente novamente.');
    }
    return reply(201, 'Professor cadastrado. Já pode entrar com o e-mail e a senha definidos.');
  } catch { return reply(500, 'Não foi possível concluir o cadastro. Verifique os dados e tente novamente.'); }
});
