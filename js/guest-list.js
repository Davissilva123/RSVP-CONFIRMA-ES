/* ==============================================================================
   PRE-REGISTERED GUEST LIST & INVITATION CODES MANAGER
   ============================================================================== */

let currentGuestList = [];
let eventsList = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('guest-list-page')) return;

  await loadGuests();
});

async function loadGuests() {
  try {
    const supabase = window.supabaseClient;

    const { data: events } = await supabase.from('events').select('id, title');
    eventsList = events || [];

    const select = document.getElementById('guest-event-filter');
    if (select && eventsList.length) {
      select.innerHTML = '<option value="all">Todos os Eventos</option>' +
        eventsList.map(e => `<option value="${e.id}">${escapeHTML(e.title)}</option>`).join('');
    }

    const { data: guests, error } = await supabase
      .from('guest_list')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    currentGuestList = guests || [];
    renderGuestListTable();

  } catch (err) {
    console.error('Erro ao carregar lista de convidados:', err);
    window.showToast('Erro ao carregar lista de convidados.', 'error');
  }
}

function renderGuestListTable() {
  const container = document.getElementById('guest-table-body');
  if (!container) return;

  const eventFilter = document.getElementById('guest-event-filter')?.value || 'all';
  const searchVal = (document.getElementById('guest-search-input')?.value || '').toLowerCase();

  const filtered = currentGuestList.filter(g => {
    const matchesEvent = eventFilter === 'all' || g.event_id === eventFilter;
    const matchesSearch = g.name.toLowerCase().includes(searchVal) ||
                          (g.invitation_code && g.invitation_code.toLowerCase().includes(searchVal)) ||
                          (g.group_name && g.group_name.toLowerCase().includes(searchVal));
    return matchesEvent && matchesSearch;
  });

  if (!filtered.length) {
    container.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fas fa-users-slash"></i></div>
            <div class="empty-state-title">Nenhum convidado cadastrado na lista prévia</div>
            <div class="empty-state-text">Cadastre convidados antecipadamente para atribuir códigos de convite e limites de acompanhantes.</div>
            <button class="btn btn-primary" onclick="openGuestModal()"><i class="fas fa-user-plus"></i> Cadastrar Convidado</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const evtMap = {};
  eventsList.forEach(e => { evtMap[e.id] = e.title; });

  container.innerHTML = filtered.map(g => `
    <tr>
      <td><strong>${escapeHTML(g.name)}</strong></td>
      <td>${escapeHTML(evtMap[g.event_id] || 'Evento')}</td>
      <td><code>${escapeHTML(g.invitation_code)}</code></td>
      <td>${escapeHTML(g.group_name || '-')}</td>
      <td>Até <strong>${g.max_companions || 0}</strong> acompanhante(s)</td>
      <td>${getStatusBadgeHTML(g.status || 'pending')}</td>
      <td>
        <div style="display: flex; gap: 0.375rem; justify-content: flex-end;">
          <button class="btn btn-sm btn-secondary" onclick="openGuestModal('${g.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger" onclick="deleteGuest('${g.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.openGuestModal = function (guestId = null) {
  const form = document.getElementById('guest-form');
  form.reset();

  const eventSelect = document.getElementById('guest-event-id');
  if (eventSelect && eventsList.length) {
    eventSelect.innerHTML = eventsList.map(e => `<option value="${e.id}">${escapeHTML(e.title)}</option>`).join('');
  }

  document.getElementById('guest-id').value = guestId || '';

  if (guestId) {
    const g = currentGuestList.find(item => item.id === guestId);
    if (g) {
      document.getElementById('guest-name').value = g.name;
      document.getElementById('guest-phone').value = g.phone || '';
      document.getElementById('guest-email').value = g.email || '';
      document.getElementById('guest-code').value = g.invitation_code;
      document.getElementById('guest-group').value = g.group_name || '';
      document.getElementById('guest-max-companions').value = g.max_companions || 0;
      document.getElementById('guest-event-id').value = g.event_id;
    }
  } else {
    // Gerar código aleatório
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    document.getElementById('guest-code').value = randomCode;
  }

  openModal('guest-modal');
};

window.saveGuest = async function () {
  const id = document.getElementById('guest-id').value;
  const event_id = document.getElementById('guest-event-id').value;
  const name = document.getElementById('guest-name').value.trim();
  const phone = document.getElementById('guest-phone').value.trim();
  const email = document.getElementById('guest-email').value.trim();
  const invitation_code = document.getElementById('guest-code').value.trim().toUpperCase();
  const group_name = document.getElementById('guest-group').value.trim();
  const max_companions = parseInt(document.getElementById('guest-max-companions').value) || 0;

  if (!name || !invitation_code || !event_id) {
    window.showToast('Nome, Código e Evento são obrigatórios.', 'warning');
    return;
  }

  const payload = { event_id, name, phone, email, invitation_code, group_name, max_companions };

  try {
    const supabase = window.supabaseClient;
    if (id) {
      await supabase.from('guest_list').update(payload).eq('id', id);
    } else {
      await supabase.from('guest_list').insert([payload]);
    }

    window.showToast('Convidado salvo!', 'success');
    closeModal('guest-modal');
    await loadGuests();

  } catch (err) {
    console.error('Erro ao salvar convidado:', err);
    window.showToast('Erro ao salvar convidado. Verifique se o código já existe.', 'error');
  }
};

window.deleteGuest = async function (guestId) {
  if (confirm('Deseja excluir este convidado da lista prévia?')) {
    try {
      const supabase = window.supabaseClient;
      await supabase.from('guest_list').delete().eq('id', guestId);
      window.showToast('Convidado removido.', 'info');
      await loadGuests();
    } catch (err) {
      window.showToast('Erro ao excluir convidado.', 'error');
    }
  }
};
