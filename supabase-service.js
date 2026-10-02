(function (root) {
  function createCloudServices() {
    let client;
    function db() {
      if (!root.supabase) throw new Error('Não foi possível carregar a conexão. Verifique sua internet e recarregue a página.');
      return client ||= root.supabase.createClient(root.SALAINFO_CONFIG.url, root.SALAINFO_CONFIG.publishableKey, { auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false } });
    }
    function fail(error) {
      if (!error) return;
      if (error.code === '23505') throw new Error('Esta aula já foi reservada. Escolha outra aula.');
      if (error.code === '42501') throw new Error('Acesso não autorizado. Confira seu cadastro com a escola.');
      if (error.code === '42P01' || error.code === 'PGRST205') throw new Error('O banco ainda precisa ser configurado. Execute o arquivo supabase-setup.sql.');
      throw new Error('Não foi possível concluir a operação. Verifique a conexão e a configuração do projeto.');
    }
    const fields = 'id,date,lesson,school_class,purpose,user_id,profiles(name)';
    const map = r => ({ id: r.id, date: r.date, lesson: r.lesson, schoolClass: r.school_class, purpose: r.purpose, userId: r.user_id, teacher: r.profiles?.name || 'Professor' });
    return {
      auth: {
        async signIn(email, password) {
          const { data, error } = await db().auth.signInWithPassword({ email: email.trim(), password });
          if (error) throw new Error('Não foi possível entrar. Confira o e-mail, a senha e sua conexão.');
          const profile = await db().from('profiles').select('id,name').eq('id', data.user.id).eq('active', true).maybeSingle();
          if (profile.error || !profile.data) {
            await db().auth.signOut({ scope: 'local' });
            if (profile.error) fail(profile.error);
            throw new Error('Sua conta ainda não foi autorizada pela escola.');
          }
          return profile.data;
        },
        async signOut() { const { error } = await db().auth.signOut({ scope: 'local' }); fail(error); }
      },
      reservations: {
        async list() {
          const result = [];
          for (let offset = 0; ; offset += 500) {
            const { data, error } = await db().from('reservations').select(fields).order('date').order('lesson').range(offset, offset + 499);
            fail(error); result.push(...data.map(map));
            if (data.length < 500) return result;
          }
        },
        async create(input) {
          const { data, error } = await db().from('reservations').insert({ date: input.date, lesson: input.lesson, school_class: input.schoolClass, purpose: input.purpose.trim() }).select(fields).single();
          fail(error); return map(data);
        },
        async cancel(id) {
          const { data, error } = await db().from('reservations').delete().eq('id', id).select(fields).maybeSingle();
          fail(error);
          if (!data) throw new Error('Reserva não encontrada ou cancelamento não permitido. Atualize a agenda.');
          return map(data);
        }
      }
    };
  }
  root.SalaInfo.createCloudServices = createCloudServices;
})(globalThis);
