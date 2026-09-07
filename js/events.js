/* ==============================================================================
   EVENTS MANAGEMENT (CRUD, DUPLICATION, QR CODE & SHARE LINK)
   ============================================================================== */

let currentEvents = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('events-page')) return;

  loadEvents();
  setupEventListeners();
});

async function loadEvents() {
  try {
    const supabase = window.supabaseClient;
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    currentEvents = events || [];
    renderEventsTable(currentEvents);

  } catch (err) {
    console.error('Erro ao carregar eventos:', err);
    window.showToast('Erro ao carregar lista de eventos.', 'error');
  }
}

function renderEventsTable(events) {
  const container = document.getElementById('events-table-body');
  if (!container) return;

  const searchVal = (document.getElementById('events-search-input')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('events-status-filter')?.value || 'all';

  const filtered = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchVal) || (e.location && e.location.toLowerCase().includes(searchVal));
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!filtered.length) {
    container.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fas fa-calendar-times"></i></div>
            <div class="empty-state-title">Nenhum evento encontrado</div>
            <div class="empty-state-text">Crie seu primeiro evento para começar a receber confirmações de presença.</div>
            <button class="btn btn-primary" onclick="openEventModal()"><i class="fas fa-plus"></i> Criar Evento</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = filtered.map(e => {
    const publicUrl = `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}confirmacao.html?slug=${e.slug}`;

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 2.25rem; height: 2.25rem; border-radius: 8px; background-color: ${e.primary_color || '#4f46e5'}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700;">
              <i class="fas fa-calendar-day"></i>
            </div>
            <div>
              <strong style="font-size: 0.9375rem;">${escapeHTML(e.title)}</strong>
              <div class="text-muted" style="font-size: 0.75rem;">${escapeHTML(e.type || 'Geral')}</div>
            </div>
          </div>
        </td>
        <td>
          <div>${formatDateBR(e.event_date)}</div>
          <div class="text-muted" style="font-size: 0.75rem;">${formatTimeBR(e.event_time) || 'Horário não informado'}</div>
        </td>
        <td>${escapeHTML(e.location || 'Local a definir')}</td>
        <td>${getStatusBadgeHTML(e.status)}</td>
        <td>
          <div style="display: flex; gap: 0.25rem;">
            <button class="btn btn-icon" onclick="copyEventLink('${publicUrl}')" title="Copiar Link"><i class="fas fa-link"></i></button>
            <button class="btn btn-icon" onclick="openShareModal('${e.id}')" title="Compartilhar & QR Code"><i class="fas fa-qrcode"></i></button>
            <a href="confirmacao.html?slug=${e.slug}" target="_blank" onclick="rememberPublicPreviewSlug('${e.slug}')" class="btn btn-icon" title="Visualizar Página Pública"><i class="fas fa-external-link-alt"></i></a>
          </div>
        </td>
        <td>
          <div style="display: flex; gap: 0.375rem; justify-content: flex-end;">
            <a href="evento-form-builder.html?id=${e.id}" onclick="goToFormBuilder(event, '${e.id}')" class="btn btn-sm btn-outline" title="Construtor de Formulário"><i class="fas fa-tasks"></i> Campos</a>
            <button class="btn btn-sm btn-secondary" onclick="openEventModal('${e.id}')" title="Editar Evento"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-secondary" onclick="duplicateEvent('${e.id}')" title="Duplicar Evento"><i class="fas fa-clone"></i></button>
            <button class="btn btn-sm btn-danger" onclick="confirmDeleteEvent('${e.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// FIX: guarda o slug em localStorage antes de abrir a página pública em nova aba.
// Usamos localStorage (não sessionStorage) porque abas abertas via target="_blank"
// nem sempre compartilham sessionStorage entre si, dependendo do navegador.
// Isso só serve de reserva para ambientes locais (ex: preview embutido de IDE) que
// cortam a query string — o link público real continua funcionando normalmente.
window.rememberPublicPreviewSlug = function (slug) {
  try {
    localStorage.setItem('rsvp_preview_event_slug', slug);
  } catch (e) {
    // localStorage indisponível — segue só com a query string
  }
};

// FIX: além do link com ?id=, guardamos o ID em sessionStorage antes de navegar.
// Assim, se algum ambiente local (proxy, preview embutido de IDE, etc.) cortar a
// query string da URL, o form-builder.js ainda consegue recuperar o evento certo.
window.goToFormBuilder = function (evt, eventId) {
  try {
    sessionStorage.setItem('rsvp_current_event_id', eventId);
  } catch (e) {
    // sessionStorage indisponível (modo privado, etc.) — segue só com a query string
  }
  // não faz preventDefault: o navegador continua a navegação normal pelo href
};

function setupEventListeners() {
  const searchInput = document.getElementById('events-search-input');
  const statusFilter = document.getElementById('events-status-filter');
  const form = document.getElementById('event-form');
  const titleInput = document.getElementById('event-title');

  if (searchInput) searchInput.addEventListener('input', () => renderEventsTable(currentEvents));
  if (statusFilter) statusFilter.addEventListener('change', () => renderEventsTable(currentEvents));

  if (titleInput) {
    titleInput.addEventListener('input', () => {
      const slugInput = document.getElementById('event-slug');
      if (slugInput && !slugInput.getAttribute('data-custom')) {
        slugInput.value = generateSlug(titleInput.value);
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveEvent();
    });
  }
}

window.openEventModal = function (eventId = null) {
  const modalTitle = document.getElementById('event-modal-title');
  const form = document.getElementById('event-form');
  form.reset();

  document.getElementById('event-id').value = eventId || '';

  const submitBtn = form.querySelector('button[type="submit"]');

  if (eventId) {
    const event = currentEvents.find(e => e.id === eventId);
    if (event) {
      modalTitle.textContent = 'Editar Evento';
      if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
      document.getElementById('event-title').value = event.title;
      document.getElementById('event-slug').value = event.slug;
      document.getElementById('event-type').value = event.type || 'Casamento';
      document.getElementById('event-date').value = event.event_date;
      document.getElementById('event-time').value = event.event_time || '';
      document.getElementById('event-location').value = event.location;
      document.getElementById('event-address').value = event.address || '';
      document.getElementById('event-host').value = event.host_name || '';
      document.getElementById('event-phone').value = event.phone || '';
      document.getElementById('event-email').value = event.email || '';
      document.getElementById('event-cover').value = event.cover_url || '';
      document.getElementById('event-primary-color').value = event.primary_color || '#4f46e5';
      document.getElementById('event-secondary-color').value = event.secondary_color || '#ec4899';
      document.getElementById('event-welcome-msg').value = event.welcome_message || '';
      document.getElementById('event-confirm-msg').value = event.confirmation_message || '';
      document.getElementById('event-reject-msg').value = event.rejection_message || '';
      // FIX: confirmation_deadline é salvo em UTC no banco. Se só cortarmos a
      // string (substring), o campo mostra o horário em UTC como se fosse local,
      // exibindo um horário errado pro organizador. Convertendo pra Date primeiro,
      // pegamos o horário local correto.
      document.getElementById('event-deadline').value = event.confirmation_deadline ? toLocalDatetimeInputValue(event.confirmation_deadline) : '';
      document.getElementById('event-max-guests').value = event.max_guests || '';
      document.getElementById('event-max-per-invite').value = event.max_guests_per_invite || 4;
      document.getElementById('event-status').value = event.status || 'active';
    }
  } else {
    modalTitle.textContent = 'Novo Evento';
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-plus"></i> Criar Evento';
    document.getElementById('event-primary-color').value = '#4f46e5';
    document.getElementById('event-secondary-color').value = '#ec4899';
    document.getElementById('event-welcome-msg').value = 'Seja bem-vindo! Por favor, confirme sua presença preenchendo o formulário abaixo.';
    document.getElementById('event-confirm-msg').value = 'Presença confirmada com sucesso! Estamos ansiosos para celebrar com você.';
    document.getElementById('event-reject-msg').value = 'Sua resposta foi salva. Obrigado por nos avisar!';
    document.getElementById('event-status').value = 'active';
  }

  openModal('event-modal');
};

// FIX: converte um timestamp UTC (vindo do Supabase) pro formato local
// "YYYY-MM-DDTHH:mm" que o <input type="datetime-local"> espera, evitando
// mostrar o horário errado (deslocado pelo fuso) ao editar um evento.
function toLocalDatetimeInputValue(isoString) {
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

async function saveEvent() {
  const id = document.getElementById('event-id').value;
  const title = document.getElementById('event-title').value.trim();
  const slug = document.getElementById('event-slug').value.trim() || generateSlug(title);
  const type = document.getElementById('event-type').value;
  const event_date = document.getElementById('event-date').value;
  // FIX: string vazia quebra colunas do tipo "time"/"timestamp" no Postgres — precisa ser null
  const event_time = document.getElementById('event-time').value || null;
  const location = document.getElementById('event-location').value.trim();
  const address = document.getElementById('event-address').value.trim();
  const host_name = document.getElementById('event-host').value.trim();
  const phone = document.getElementById('event-phone').value.trim();
  const email = document.getElementById('event-email').value.trim();
  const cover_url = document.getElementById('event-cover').value.trim();
  const primary_color = document.getElementById('event-primary-color').value;
  const secondary_color = document.getElementById('event-secondary-color').value;
  const welcome_message = document.getElementById('event-welcome-msg').value.trim();
  const confirmation_message = document.getElementById('event-confirm-msg').value.trim();
  const rejection_message = document.getElementById('event-reject-msg').value.trim();
  // FIX: o <input type="datetime-local"> devolve uma string sem fuso horário
  // (ex: "2026-09-10T18:00"). Enviar isso direto pro Postgres faz o banco
  // interpretar como UTC, adiantando o prazo em várias horas (no Brasil, 3h) —
  // por isso confirmações de convidados eram bloqueadas por RLS mesmo antes do
  // horário que o organizador realmente definiu. new Date(...) interpreta a
  // string como horário LOCAL do navegador, e toISOString() converte pra UTC certo.
  const deadlineRaw = document.getElementById('event-deadline').value;
  const confirmation_deadline = deadlineRaw ? new Date(deadlineRaw).toISOString() : null;
  const max_guests = document.getElementById('event-max-guests').value ? parseInt(document.getElementById('event-max-guests').value) : null;
  const max_guests_per_invite = parseInt(document.getElementById('event-max-per-invite').value) || 4;
  const status = document.getElementById('event-status').value;

  if (!title || !event_date || !location) {
    window.showToast('Preencha os campos obrigatórios (Título, Data e Local).', 'warning');
    return;
  }

  const payload = {
    title, slug, type, event_date, event_time, location, address, host_name,
    phone, email, cover_url, primary_color, secondary_color, welcome_message,
    confirmation_message, rejection_message, confirmation_deadline, max_guests,
    max_guests_per_invite, status
  };

  try {
    const supabase = window.supabaseClient;
    let res;

    if (id) {
      res = await supabase.from('events').update(payload).eq('id', id);
    } else {
      // FIX: a política RLS da tabela events exige auth.uid() = user_id.
      // Sem preencher esse campo no insert, o Postgres rejeita a linha.
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        window.showToast('Sua sessão expirou. Faça login novamente para criar eventos.', 'error');
        return;
      }
      res = await supabase.from('events').insert([{ ...payload, user_id: userData.user.id }]);
    }

    if (res.error) throw res.error;

    window.showToast(id ? 'Evento atualizado com sucesso!' : 'Evento criado com sucesso!', 'success');
    closeModal('event-modal');
    await loadEvents();

  } catch (err) {
    console.error('Erro ao salvar evento:', err);

    // FIX: mensagem de erro agora reflete o motivo real (slug duplicado, RLS, campo inválido, etc.)
    let msg = 'Não foi possível salvar o evento.';
    if (err?.code === '23505') {
      msg = 'Já existe um evento com esse slug. Escolha um identificador de URL diferente.';
    } else if (err?.message) {
      msg = `Não foi possível salvar o evento: ${err.message}`;
    }
    window.showToast(msg, 'error');
  }
}

window.duplicateEvent = async function (eventId) {
  const event = currentEvents.find(e => e.id === eventId);
  if (!event) return;

  if (!(await window.confirmDialog(`Deseja duplicar o evento "${event.title}"?`, { title: 'Duplicar Evento', confirmText: 'Duplicar', danger: false }))) return;

  const duplicatedPayload = {
    ...event,
    id: undefined,
    created_at: undefined,
    updated_at: undefined,
    title: `${event.title} (Cópia)`,
    slug: `${event.slug}-copia-${Math.floor(Math.random() * 1000)}`,
    status: 'draft'
  };

  try {
    const supabase = window.supabaseClient;
    const { data: newEvt, error } = await supabase.from('events').insert([duplicatedPayload]).select().single();
    if (error) throw error;

    window.showToast('Evento duplicado com sucesso!', 'success');
    await loadEvents();
  } catch (err) {
    console.error('Erro ao duplicar evento:', err);
    window.showToast('Erro ao duplicar evento.', 'error');
  }
};

window.confirmDeleteEvent = async function (eventId) {
  const event = currentEvents.find(e => e.id === eventId);
  if (!event) return;

  const ok = await window.confirmDialog(
    `Tem certeza que deseja excluir o evento "${event.title}"?\nTodas as confirmações deste evento também serão excluídas.`,
    { title: 'Excluir Evento', confirmText: 'Excluir' }
  );

  if (ok) {
    try {
      const supabase = window.supabaseClient;
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;

      window.showToast('Evento excluído.', 'info');
      await loadEvents();
    } catch (err) {
      console.error('Erro ao excluir evento:', err);
      window.showToast('Erro ao excluir evento.', 'error');
    }
  }
};

window.copyEventLink = function (url) {
  navigator.clipboard.writeText(url).then(() => {
    window.showToast('Link copiado com sucesso!', 'success');
  }).catch(() => {
    window.showToast('Erro ao copiar link.', 'error');
  });
};

window.openShareModal = function (eventId) {
  const event = currentEvents.find(e => e.id === eventId);
  if (!event) return;

  const publicUrl = `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}confirmacao.html?slug=${event.slug}`;

  rememberPublicPreviewSlug(event.slug);
  document.getElementById('share-link-input').value = publicUrl;

  const whatsappMsg = `Olá! Confirme sua presença no evento "${event.title}" através deste link: ${publicUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMsg)}`;
  document.getElementById('share-whatsapp-btn').href = whatsappUrl;

  // Gerar QR Code
  const qrContainer = document.getElementById('qrcode-container');
  qrContainer.innerHTML = '';

  if (window.QRCode) {
    new window.QRCode(qrContainer, {
      text: publicUrl,
      width: 180,
      height: 180,
      colorDark: "#0f172a",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.H
    });
  } else {
    qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(publicUrl)}" alt="QR Code" style="border-radius: 8px;">`;
  }

  openModal('share-modal');
};