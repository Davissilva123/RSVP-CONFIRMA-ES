/* ==============================================================================
   SUPABASE CLIENT INITIALIZER WITH DEMO FALLBACK
   ============================================================================== */

(function () {
  const config = window.SUPABASE_CONFIG || {};
  const isConfigured = config.URL && config.URL !== 'YOUR_SUPABASE_URL' && config.ANON_KEY && config.ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';

  if (isConfigured && window.supabase) {
    // Inicializar cliente oficial do Supabase CDN
    window.supabaseClient = window.supabase.createClient(config.URL, config.ANON_KEY);
    window.isDemoMode = false;
    console.log('✅ Supabase conectado com sucesso!');
  } else {
    // Modo de demonstração gracioso (armazenamento em localStorage para testes sem credenciais)
    window.isDemoMode = true;
    console.warn('⚠️ Supabase URL/KEY não configurados ou SDK não carregado. Operando em Modo Demo (LocalStorage).');

    // Inicialização de dados fictícios de demonstração se o localStorage estiver vazio
    initDemoStorage();

    // Mock do Supabase Client com suporte a encadeamento de chamadas (.from().select().eq(), etc.)
    window.supabaseClient = createDemoSupabaseClient();
  }

  function initDemoStorage() {
    if (!localStorage.getItem('rsvp_demo_events')) {
      const demoEvents = [
        {
          id: 'demo-event-1',
          user_id: 'demo-user-123',
          title: 'Casamento João & Maria',
          slug: 'casamento-joao-maria',
          type: 'Casamento',
          description: 'Venha celebrar a união de João e Maria com muita festa, música e alegria!',
          event_date: '2026-11-20',
          event_time: '19:00',
          location: 'Espaço Villa das Flores',
          address: 'Av. das Rosas, 1000 - Jardim Primavera',
          host_name: 'João e Maria',
          phone: '(33) 99999-8888',
          email: 'contato@joaoemaria.com',
          cover_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
          primary_color: '#4f46e5',
          secondary_color: '#ec4899',
          welcome_message: 'Ficaremos muito honrados com sua presença neste dia tão especial!',
          confirmation_message: 'Sua presença foi confirmada com sucesso! Mal podemos esperar por este momento.',
          rejection_message: 'Sua resposta foi salva. Obrigado por nos avisar!',
          confirmation_deadline: '2026-11-10T23:59:50',
          max_guests: 200,
          max_guests_per_invite: 4,
          allow_response_edit: true,
          require_invitation_code: false,
          countdown_enabled: true,
          status: 'active',
          created_at: new Date().toISOString()
        },
        {
          id: 'demo-event-2',
          user_id: 'demo-user-123',
          title: 'Aniversário 15 Anos Beatriz',
          slug: '15-anos-beatriz',
          type: 'Festa de 15 anos',
          description: 'Uma noite inesquecível de gala e diversão.',
          event_date: '2026-12-05',
          event_time: '20:30',
          location: 'Palácio dos Eventos',
          address: 'Rua das Palmeiras, 450',
          host_name: 'Família Santos',
          phone: '(31) 98888-7777',
          email: 'beatriz15@gmail.com',
          cover_url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
          primary_color: '#9333ea',
          secondary_color: '#f43f5e',
          welcome_message: 'Confirme sua presença até 25 de novembro.',
          confirmation_message: 'Presença confirmada! Prepare seu melhor traje.',
          rejection_message: 'Agradecemos o aviso.',
          confirmation_deadline: '2026-11-25T23:59:59',
          max_guests: 150,
          max_guests_per_invite: 2,
          allow_response_edit: true,
          require_invitation_code: true,
          countdown_enabled: true,
          status: 'active',
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('rsvp_demo_events', JSON.stringify(demoEvents));
    }

    if (!localStorage.getItem('rsvp_demo_form_fields')) {
      const demoFields = [
        {
          id: 'field-1',
          event_id: 'demo-event-1',
          label: 'Restrições alimentares',
          field_name: 'dietary_restrictions',
          field_type: 'select',
          placeholder: 'Selecione se possuir',
          help_text: 'Nos ajude a adaptar o menu',
          required: false,
          position: 1,
          options: ['Nenhuma', 'Vegetariano', 'Vegano', 'Intolerante à Lactose', 'Celíaco (Glúten)']
        },
        {
          id: 'field-2',
          event_id: 'demo-event-1',
          label: 'Mensagem para os anfitriões',
          field_name: 'host_message',
          field_type: 'textarea',
          placeholder: 'Deixe um carinho para os noivos...',
          help_text: '',
          required: false,
          position: 2,
          options: []
        }
      ];
      localStorage.setItem('rsvp_demo_form_fields', JSON.stringify(demoFields));
    }

    if (!localStorage.getItem('rsvp_demo_confirmations')) {
      const demoConfirmations = [
        {
          id: 'conf-1',
          event_id: 'demo-event-1',
          name: 'Carlos Eduardo Oliveira',
          phone: '(33) 99887-6655',
          email: 'carlos@email.com',
          attendance_status: 'confirmed',
          adults: 2,
          children: 1,
          companions: 0,
          total_people: 3,
          invitation_code: 'CE2026',
          internal_notes: 'Mesa da família noiva',
          created_at: new Date().toISOString()
        },
        {
          id: 'conf-2',
          event_id: 'demo-event-1',
          name: 'Fernanda Lima',
          phone: '(33) 98765-4321',
          email: 'fernanda@email.com',
          attendance_status: 'declined',
          adults: 1,
          children: 0,
          companions: 0,
          total_people: 1,
          invitation_code: '',
          internal_notes: 'Viajando no período',
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('rsvp_demo_confirmations', JSON.stringify(demoConfirmations));
    }

    if (!localStorage.getItem('rsvp_demo_confirmation_answers')) {
      const demoAnswers = [
        {
          id: 'ans-1',
          confirmation_id: 'conf-1',
          field_id: 'field-1',
          field_label: 'Restrições alimentares',
          answer: 'Intolerante à Lactose'
        },
        {
          id: 'ans-2',
          confirmation_id: 'conf-1',
          field_id: 'field-2',
          field_label: 'Mensagem para os anfitriões',
          answer: 'Desejamos toda a felicidade do mundo ao casal!'
        }
      ];
      localStorage.setItem('rsvp_demo_confirmation_answers', JSON.stringify(demoAnswers));
    }

    if (!localStorage.getItem('rsvp_demo_guest_list')) {
      const demoGuestList = [
        {
          id: 'guest-1',
          event_id: 'demo-event-1',
          name: 'Carlos Eduardo Oliveira',
          phone: '(33) 99887-6655',
          email: 'carlos@email.com',
          invitation_code: 'CE2026',
          max_companions: 2,
          group_name: 'Família Oliveira',
          notes: 'Mesa VIP',
          status: 'confirmed'
        }
      ];
      localStorage.setItem('rsvp_demo_guest_list', JSON.stringify(demoGuestList));
    }
  }

  function createDemoSupabaseClient() {
    return {
      auth: {
        async getSession() {
          const userStr = localStorage.getItem('rsvp_demo_user');
          if (userStr) {
            return { data: { session: { user: JSON.parse(userStr) } }, error: null };
          }
          return { data: { session: null }, error: null };
        },
        async signInWithPassword({ email, password }) {
          if (email && password) {
            const user = { id: 'demo-user-123', email: email, user_metadata: { full_name: 'Administrador Demo' } };
            localStorage.setItem('rsvp_demo_user', JSON.stringify(user));
            return { data: { user }, error: null };
          }
          return { data: null, error: { message: 'Credenciais inválidas' } };
        },
        async signOut() {
          localStorage.removeItem('rsvp_demo_user');
          return { error: null };
        },
        async resetPasswordForEmail(email) {
          return { data: {}, error: null };
        },
        async updateUser(updates) {
          // No modo demo, simular atualização de dados do usuário no localStorage
          const userStr = localStorage.getItem('rsvp_demo_user');
          if (userStr) {
            const user = JSON.parse(userStr);
            if (updates.data) {
              user.user_metadata = { ...user.user_metadata, ...updates.data };
            }
            localStorage.setItem('rsvp_demo_user', JSON.stringify(user));
          }
          return { data: {}, error: null };
        },
        onAuthStateChange(callback) {
          const userStr = localStorage.getItem('rsvp_demo_user');
          if (userStr) {
            callback('SIGNED_IN', { user: JSON.parse(userStr) });
          } else {
            callback('SIGNED_OUT', null);
          }
          return { data: { subscription: { unsubscribe: () => { } } } };
        }
      },
      from(tableName) {
        return new DemoQueryBuilder(tableName);
      },
      channel() {
        return {
          on() { return this; },
          subscribe() { return this; },
          unsubscribe() { return this; }
        };
      }
    };
  }

  // Builder de consulta simulado para o modo demo - com suporte total a encadeamento
  class DemoQueryBuilder {
    constructor(tableName) {
      this.tableName = 'rsvp_demo_' + tableName;
      this.filters = [];
      this.selectFields = '*';
      this.singleRow = false;
      this.sortField = null;
      this.sortAsc = true;
      this._insertedData = null; // Armazena dados inseridos para select() encadeado
      this._isInsertChain = false;
      this._isUpdateChain = false; // FIX: update() agora é encadeável, resolve em then()
      this._pendingUpdate = null;
      this._isDeleteChain = false; // FIX: delete() agora é encadeável, resolve em then()
    }

    select(fields = '*') {
      this.selectFields = fields;
      return this;
    }

    eq(field, val) {
      this.filters.push(item => item[field] === val);
      return this;
    }

    neq(field, val) {
      this.filters.push(item => item[field] !== val);
      return this;
    }

    ilike(field, pattern) {
      const cleanPattern = pattern.replace(/%/g, '').toLowerCase();
      this.filters.push(item => String(item[field] || '').toLowerCase().includes(cleanPattern));
      return this;
    }

    order(field, { ascending = true } = {}) {
      this.sortField = field;
      this.sortAsc = ascending;
      return this;
    }

    single() {
      this.singleRow = true;
      // Se for encadeamento de insert().select().single(), resolver com os dados inseridos
      if (this._isInsertChain && this._insertedData !== null) {
        const data = Array.isArray(this._insertedData) ? this._insertedData[0] : this._insertedData;
        return Promise.resolve({ data: data || null, error: data ? null : { message: 'Registro não encontrado' } });
      }
      return this;
    }

    async then(resolve) {
      // Se for encadeamento de insert, retornar dados inseridos
      if (this._isInsertChain) {
        if (this.singleRow) {
          const data = Array.isArray(this._insertedData) ? this._insertedData[0] : this._insertedData;
          resolve({ data: data || null, error: null });
        } else {
          resolve({ data: this._insertedData, error: null });
        }
        return;
      }

      // FIX: aplica o update somente aqui, depois que .eq() já empilhou os filtros
      if (this._isUpdateChain) {
        let current = JSON.parse(localStorage.getItem(this.tableName) || '[]');
        let updatedItems = [];

        current = current.map(item => {
          let match = true;
          this.filters.forEach(fn => { if (!fn(item)) match = false; });
          if (match) {
            const updated = { ...item, ...this._pendingUpdate, updated_at: new Date().toISOString() };
            updatedItems.push(updated);
            return updated;
          }
          return item;
        });

        localStorage.setItem(this.tableName, JSON.stringify(current));
        resolve({ data: updatedItems, error: null });
        return;
      }

      // FIX: aplica o delete somente aqui, depois que .eq() já empilhou os filtros
      if (this._isDeleteChain) {
        let current = JSON.parse(localStorage.getItem(this.tableName) || '[]');

        current = current.filter(item => {
          let match = true;
          this.filters.forEach(fn => { if (!fn(item)) match = false; });
          return !match;
        });

        localStorage.setItem(this.tableName, JSON.stringify(current));
        resolve({ data: null, error: null });
        return;
      }

      let data = JSON.parse(localStorage.getItem(this.tableName) || '[]');
      this.filters.forEach(fn => { data = data.filter(fn); });

      if (this.sortField) {
        data.sort((a, b) => {
          if (a[this.sortField] < b[this.sortField]) return this.sortAsc ? -1 : 1;
          if (a[this.sortField] > b[this.sortField]) return this.sortAsc ? 1 : -1;
          return 0;
        });
      }

      if (this.singleRow) {
        resolve({ data: data[0] || null, error: data[0] ? null : { message: 'Registro não encontrado' } });
      } else {
        resolve({ data, error: null });
      }
    }

    insert(newItems) {
      let current = JSON.parse(localStorage.getItem(this.tableName) || '[]');
      const itemsToInsert = Array.isArray(newItems) ? newItems : [newItems];

      const inserted = itemsToInsert.map(item => ({
        id: item.id || ('demo-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6)),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...item
      }));

      current.push(...inserted);
      localStorage.setItem(this.tableName, JSON.stringify(current));

      // Retornar um novo builder encadeável com os dados inseridos
      const chainBuilder = new DemoQueryBuilder(this.tableName.replace('rsvp_demo_', ''));
      chainBuilder._isInsertChain = true;
      chainBuilder._insertedData = Array.isArray(newItems) ? inserted : inserted[0];
      return chainBuilder;
    }

    // FIX: não é mais "async" — retorna "this" (encadeável) em vez de uma Promise,
    // assim .update(payload).eq('id', id) funciona igual ao Supabase real.
    // A atualização de fato só acontece dentro de then(), depois que os filtros do .eq() já foram aplicados.
    update(updates) {
      this._isUpdateChain = true;
      this._pendingUpdate = updates;
      return this;
    }

    // FIX: mesma correção do update() — não é mais "async", retorna "this" encadeável
    // para permitir .delete().eq('id', eventId).
    delete() {
      this._isDeleteChain = true;
      return this;
    }
  }
})();