(function (root) {
  'use strict';
  const KEY = 'salainfo.reservations.v1';
  const classes = ['1º ano A', '2º ano A', '3º ano A', '4º ano A', '5º ano A', '6º ano A', '7º ano A', '8º ano A', '9º ano A'];
  function today() {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    return ['year', 'month', 'day'].map(k => parts.find(p => p.type === k).value).join('-');
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T12:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  function createServices(storage, locks) {
    let user = null;
    function read() {
      try {
        const rows = JSON.parse(storage.getItem(KEY) || '[]');
        if (!Array.isArray(rows) || rows.some(r => !r || typeof r.id !== 'string' || !validDate(r.date) || !Number.isInteger(r.lesson) || r.lesson < 1 || r.lesson > 5 || !classes.includes(r.schoolClass) || typeof r.userId !== 'string' || typeof r.teacher !== 'string' || typeof r.purpose !== 'string')) throw Error();
        return rows;
      } catch { throw new Error('Não foi possível ler as reservas salvas. Verifique o armazenamento do navegador.'); }
    }
    return {
      auth: {
        async signIn(username, password) {
          if (username.trim() !== 'ana.evaldostaidel' || !/^[0-9]{6}$/.test(password)) throw new Error('Use o usuário de demonstração e 6 dígitos numéricos.');
          user = { id: 'demo-ana', name: 'Ana' };
          return { ...user };
        },
        async signOut() { user = null; },
        async currentUser() { return user && { ...user }; }
      },
      reservations: {
        async list() { if (!user) throw new Error('Entre para consultar as reservas.'); return read(); },
        async cancel(id) {
          const save = () => {
            if (!user) throw new Error('Entre novamente para cancelar.');
            const rows = read();
            const row = rows.find(r => r.id === id);
            if (!row) throw new Error('Esta reserva não existe mais. Atualize sua agenda.');
            if (row.userId !== user.id) throw new Error('Você só pode cancelar suas próprias reservas.');
            if (row.date < today()) throw new Error('Não é possível cancelar uma reserva de uma data passada.');
            try { storage.setItem(KEY, JSON.stringify(rows.filter(r => r.id !== id))); }
            catch { throw new Error('Não foi possível cancelar. Verifique o armazenamento do navegador.'); }
            return row;
          };
          return locks ? locks.request(KEY, save) : save();
        },
        async create(input) {
          const save = () => {
            if (!user) throw new Error('Entre novamente para reservar.');
            const { date, lesson, schoolClass } = input;
            const purpose = (input.purpose || '').trim();
            if (!validDate(date) || date < today()) throw new Error('Selecione uma data válida a partir de hoje.');
            if (!Number.isInteger(lesson) || lesson < 1 || lesson > 5) throw new Error('Selecione uma aula disponível.');
            if (!classes.includes(schoolClass)) throw new Error('Selecione uma turma.');
            if (purpose.length > 300) throw new Error('A finalidade deve ter até 300 caracteres.');
            const rows = read();
            if (rows.some(r => r.date === date && r.lesson === lesson)) throw new Error('Esta aula acabou de ser reservada. Escolha outra aula.');
            const row = { id: root.crypto.randomUUID(), date, lesson, schoolClass, purpose, userId: user.id, teacher: user.name, roomId: 'informatica', createdAt: new Date().toISOString() };
            try { storage.setItem(KEY, JSON.stringify([...rows, row])); }
            catch { throw new Error('Não foi possível salvar. Verifique o espaço e as permissões do navegador.'); }
            return row;
          };
          return locks ? locks.request(KEY, save) : save();
        }
      }
    };
  }
  root.SalaInfo = { KEY, classes, today, validDate, createServices };
})(globalThis);
