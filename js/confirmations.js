/* ==============================================================================
   CONFIRMATIONS MANAGER (SEARCH, FILTERS, DETAIL MODAL, EDIT, CSV EXPORT)
   ============================================================================== */

let allConfirmations = [];
let allEventsMap = {};
let allCustomAnswersMap = {}; // confirmation_id -> [answers]
let currentPage = 1;
let rowsPerPage = 10;

document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('confirmations-page')) return;

  await loadConfirmationsData();
  setupConfirmationFilters();
});

async function loadConfirmationsData() {
  try {
    const supabase = window.supabaseClient;

    // Buscar eventos para filtro e nomes
    const { data: events } = await supabase.from('events').select('id, title');
    if (events) {
      events.forEach(e => { allEventsMap[e.id] = e.title; });
      populateEventFilterDropdown(events);
    }

    // Buscar confirmações
    const { data: confs, error } = await supabase
      .from('confirmations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    allConfirmations = confs || [];

    // Buscar respostas personalizadas
    const { data: answers } = await supabase.from('confirmation_answers').select('*');
    allCustomAnswersMap = {};
    if (answers) {
      answers.forEach(ans => {
        if (!allCustomAnswersMap[ans.confirmation_id]) {
          allCustomAnswersMap[ans.confirmation_id] = [];
        }
        allCustomAnswersMap[ans.confirmation_id].push(ans);
      });
    }

    renderConfirmationsTable();
    updateSummaryCounters();

  } catch (err) {
    console.error('Erro ao carregar confirmações:', err);
    window.showToast('Erro ao carregar confirmações.', 'error');
  }
}

function populateEventFilterDropdown(events) {
  const select = document.getElementById('filter-event-id');
  if (!select) return;
  select.innerHTML = `<option value="all">Todos os Eventos</option>` +
    events.map(e => `<option value="${e.id}">${escapeHTML(e.title)}</option>`).join('');
}

function renderConfirmationsTable() {
  const container = document.getElementById('confirmations-table-body');
  if (!container) return;

  const searchVal = (document.getElementById('conf-search-input')?.value || '').toLowerCase();
  const eventFilter = document.getElementById('filter-event-id')?.value || 'all';
  const statusFilter = document.getElementById('filter-status')?.value || 'all';
  const countFilter = document.getElementById('filter-count')?.value || 'all';

  let filtered = allConfirmations.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchVal) ||
      (c.phone && c.phone.includes(searchVal)) ||
      (c.email && c.email.toLowerCase().includes(searchVal)) ||
      (c.invitation_code && c.invitation_code.toLowerCase().includes(searchVal));

    const matchesEvent = eventFilter === 'all' || c.event_id === eventFilter;
    const matchesStatus = statusFilter === 'all' || c.attendance_status === statusFilter;

    let matchesCount = true;
    const total = c.total_people || ((c.adults || 1) + (c.children || 0) + (c.companions || 0));
    if (countFilter === '1') matchesCount = total === 1;
    else if (countFilter === '2') matchesCount = total === 2;
    else if (countFilter === '3+') matchesCount = total >= 3;

    return matchesSearch && matchesEvent && matchesStatus && matchesCount;
  });

  // Ordenar
  const sortVal = document.getElementById('sort-confirmations')?.value || 'newest';
  filtered.sort((a, b) => {
    if (sortVal === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    if (sortVal === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    if (sortVal === 'name') return a.name.localeCompare(b.name);
    if (sortVal === 'people') return (b.total_people || 1) - (a.total_people || 1);
    return 0;
  });

  // Paginação
  const totalRecords = filtered.length;
  const totalPages = Math.ceil(totalRecords / rowsPerPage) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + rowsPerPage);

  updatePaginationInfo(totalRecords, startIndex + 1, Math.min(startIndex + rowsPerPage, totalRecords), totalPages);

  if (!paginated.length) {
    container.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fas fa-inbox"></i></div>
            <div class="empty-state-title">Nenhuma confirmação encontrada</div>
            <div class="empty-state-text">Nenhum registro corresponde aos filtros selecionados.</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = paginated.map(c => {
    const totalP = c.total_people || ((c.adults || 1) + (c.children || 0) + (c.companions || 0));
    const customAnswers = allCustomAnswersMap[c.id] || [];

    return `
      <tr>
        <td>
          <div style="font-weight: 700;">${escapeHTML(c.name)}</div>
          ${c.invitation_code ? `<small class="text-muted">Código: <code>${escapeHTML(c.invitation_code)}</code></small>` : ''}
        </td>
        <td>${escapeHTML(allEventsMap[c.event_id] || 'Evento')}</td>
        <td>
          <div>${escapeHTML(c.phone || '-')}</div>
          <small class="text-muted">${escapeHTML(c.email || '')}</small>
        </td>
        <td>${getStatusBadgeHTML(c.attendance_status)}</td>
        <td>
          <strong>${totalP}</strong> pessoa(s)
          <div class="text-muted" style="font-size: 0.75rem;">
            (${c.adults || 1} ad / ${c.children || 0} cri / ${c.companions || 0} ac)
          </div>
        </td>
        <td>${formatDateTimeBR(c.created_at)}</td>
        <td>
          ${customAnswers.length ? `<span class="badge badge-pending" title="${customAnswers.length} resposta(s) personalizada(s)">${customAnswers.length} campo(s)</span>` : '-'}
        </td>
        <td>
          <div style="display: flex; gap: 0.375rem; justify-content: flex-end;">
            <button class="btn btn-sm btn-outline" onclick="openDetailModal('${c.id}')" title="Ver Respostas Completas"><i class="fas fa-eye"></i> Detalhes</button>
            <button class="btn btn-sm btn-secondary" onclick="openEditConfirmationModal('${c.id}')" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger" onclick="confirmDeleteConfirmation('${c.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function updateSummaryCounters() {
  let confirmed = 0;
  let declined = 0;
  let totalPeople = 0;

  allConfirmations.forEach(c => {
    if (c.attendance_status === 'confirmed') {
      confirmed++;
      totalPeople += (c.total_people || 1);
    } else if (c.attendance_status === 'declined') {
      declined++;
    }
  });

  const totalConf = allConfirmations.length;
  const countEl = document.getElementById('summary-total-responses');
  const peopleEl = document.getElementById('summary-total-people');
  const rateEl = document.getElementById('summary-confirmation-rate');

  if (countEl) countEl.textContent = totalConf;
  if (peopleEl) peopleEl.textContent = totalPeople;
  if (rateEl) {
    const rate = totalConf > 0 ? ((confirmed / totalConf) * 100).toFixed(1) : 0;
    rateEl.textContent = `${rate}%`;
  }
}

function updatePaginationInfo(total, start, end, totalPages) {
  const infoEl = document.getElementById('pagination-info');
  const pageNumEl = document.getElementById('page-number');
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');

  if (infoEl) infoEl.textContent = total > 0 ? `Exibindo ${start} - ${end} de ${total} registros` : 'Nenhum registro';
  if (pageNumEl) pageNumEl.textContent = `Página ${currentPage} de ${totalPages}`;
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

function setupConfirmationFilters() {
  const searchInput = document.getElementById('conf-search-input');
  const eventFilter = document.getElementById('filter-event-id');
  const statusFilter = document.getElementById('filter-status');
  const countFilter = document.getElementById('filter-count');
  const sortSelect = document.getElementById('sort-confirmations');
  const rowsSelect = document.getElementById('rows-per-page-select');

  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');

  const triggerUpdate = () => { currentPage = 1; renderConfirmationsTable(); };

  if (searchInput) searchInput.addEventListener('input', triggerUpdate);
  if (eventFilter) eventFilter.addEventListener('change', triggerUpdate);
  if (statusFilter) statusFilter.addEventListener('change', triggerUpdate);
  if (countFilter) countFilter.addEventListener('change', triggerUpdate);
  if (sortSelect) sortSelect.addEventListener('change', triggerUpdate);

  if (rowsSelect) {
    rowsSelect.addEventListener('change', (e) => {
      rowsPerPage = parseInt(e.target.value) || 10;
      currentPage = 1;
      renderConfirmationsTable();
    });
  }

  if (prevBtn) prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderConfirmationsTable(); } });
  if (nextBtn) nextBtn.addEventListener('click', () => { currentPage++; renderConfirmationsTable(); });
}

window.openDetailModal = function (confId) {
  const conf = allConfirmations.find(c => c.id === confId);
  if (!conf) return;

  const answers = allCustomAnswersMap[confId] || [];
  const eventName = allEventsMap[conf.event_id] || 'Evento';

  const body = document.getElementById('detail-modal-body');
  if (!body) return;

  body.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
      <div>
        <h3 style="margin-bottom: 0.25rem;">${escapeHTML(conf.name)}</h3>
        <p class="text-muted" style="font-size: 0.875rem;">Evento: <strong>${escapeHTML(eventName)}</strong></p>
      </div>
      <div>${getStatusBadgeHTML(conf.attendance_status)}</div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
      <div style="background-color: var(--bg-tertiary); padding: 1rem; border-radius: 8px;">
        <span class="text-muted" style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Telefone</span>
        <div style="font-weight: 700; margin-top: 0.2rem;">${escapeHTML(conf.phone || 'Não informado')}</div>
      </div>

      <div style="background-color: var(--bg-tertiary); padding: 1rem; border-radius: 8px;">
        <span class="text-muted" style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">E-mail</span>
        <div style="font-weight: 700; margin-top: 0.2rem;">${escapeHTML(conf.email || 'Não informado')}</div>
      </div>

      <div style="background-color: var(--bg-tertiary); padding: 1rem; border-radius: 8px;">
        <span class="text-muted" style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Total de Pessoas</span>
        <div style="font-weight: 700; margin-top: 0.2rem;">${conf.total_people || 1} (${conf.adults || 1} adultos, ${conf.children || 0} crianças)</div>
      </div>

      <div style="background-color: var(--bg-tertiary); padding: 1rem; border-radius: 8px;">
        <span class="text-muted" style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Data da Resposta</span>
        <div style="font-weight: 700; margin-top: 0.2rem;">${formatDateTimeBR(conf.created_at)}</div>
      </div>
    </div>

    ${conf.internal_notes ? `
      <div style="margin-bottom: 1.5rem; background-color: var(--warning-bg); color: var(--warning-text); padding: 1rem; border-radius: 8px; border: 1px dashed var(--warning);">
        <strong style="font-size: 0.8125rem; text-transform: uppercase;">Observação Interna (Privada):</strong>
        <p style="margin-top: 0.25rem; font-size: 0.875rem;">${escapeHTML(conf.internal_notes)}</p>
      </div>
    ` : ''}

    <h4 style="margin-bottom: 0.75rem; font-size: 1rem;">Respostas aos Campos Personalizados</h4>
    ${answers.length ? `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        ${answers.map(ans => `
          <div style="padding: 0.875rem; border: 1px solid var(--border-color); border-radius: 8px; background-color: var(--bg-card);">
            <div style="font-size: 0.8125rem; font-weight: 700; color: var(--text-secondary);">${escapeHTML(ans.field_label)}</div>
            <div style="font-size: 0.9375rem; font-weight: 600; color: var(--text-primary); margin-top: 0.25rem;">${escapeHTML(ans.answer || 'Sem resposta')}</div>
          </div>
        `).join('')}
      </div>
    ` : '<p class="text-muted" style="font-size: 0.875rem;">Nenhuma pergunta personalizada cadastrada para este evento.</p>'}
  `;

  openModal('detail-modal');
};

window.openEditConfirmationModal = function (confId) {
  const conf = allConfirmations.find(c => c.id === confId);
  if (!conf) return;

  document.getElementById('edit-conf-id').value = conf.id;
  document.getElementById('edit-conf-name').value = conf.name;
  document.getElementById('edit-conf-phone').value = conf.phone;
  document.getElementById('edit-conf-email').value = conf.email || '';
  document.getElementById('edit-conf-status').value = conf.attendance_status;
  document.getElementById('edit-conf-adults').value = conf.adults || 1;
  document.getElementById('edit-conf-children').value = conf.children || 0;
  document.getElementById('edit-conf-companions').value = conf.companions || 0;
  document.getElementById('edit-conf-internal-notes').value = conf.internal_notes || '';

  openModal('edit-conf-modal');
};

window.saveEditConfirmation = async function () {
  const id = document.getElementById('edit-conf-id').value;
  const name = document.getElementById('edit-conf-name').value.trim();
  const phone = document.getElementById('edit-conf-phone').value.trim();
  const email = document.getElementById('edit-conf-email').value.trim();
  const attendance_status = document.getElementById('edit-conf-status').value;
  const adults = parseInt(document.getElementById('edit-conf-adults').value) || 1;
  const children = parseInt(document.getElementById('edit-conf-children').value) || 0;
  const companions = parseInt(document.getElementById('edit-conf-companions').value) || 0;
  const internal_notes = document.getElementById('edit-conf-internal-notes').value.trim();

  if (!name || !phone) {
    window.showToast('Nome e Telefone são obrigatórios.', 'warning');
    return;
  }

  try {
    const supabase = window.supabaseClient;
    const { error } = await supabase.from('confirmations').update({
      name, phone, email, attendance_status, adults, children, companions, internal_notes
    }).eq('id', id);

    if (error) throw error;

    window.showToast('Confirmação atualizada.', 'success');
    closeModal('edit-conf-modal');
    await loadConfirmationsData();

  } catch (err) {
    console.error('Erro ao editar confirmação:', err);
    window.showToast('Erro ao atualizar confirmação.', 'error');
  }
};

window.confirmDeleteConfirmation = async function (confId) {
  const conf = allConfirmations.find(c => c.id === confId);
  if (!conf) return;

  const ok = await window.confirmDialog(`Tem certeza que deseja excluir a confirmação de "${conf.name}"?`, { title: 'Excluir Confirmação', confirmText: 'Excluir' });

  if (ok) {
    try {
      const supabase = window.supabaseClient;
      const { error } = await supabase.from('confirmations').delete().eq('id', confId);
      if (error) throw error;

      window.showToast('Confirmação excluída.', 'info');
      await loadConfirmationsData();
    } catch (err) {
      console.error('Erro ao excluir:', err);
      window.showToast('Erro ao excluir confirmação.', 'error');
    }
  }
};

window.exportConfirmationsCSV = function () {
  if (!allConfirmations.length) {
    window.showToast('Nenhum registro para exportar.', 'warning');
    return;
  }

  const rows = [
    ['Evento', 'Nome Completo', 'Telefone', 'E-mail', 'Status Presença', 'Adultos', 'Crianças', 'Acompanhantes', 'Total Pessoas', 'Código Convite', 'Data Resposta', 'Observação Interna']
  ];

  allConfirmations.forEach(c => {
    rows.push([
      allEventsMap[c.event_id] || 'Evento',
      c.name,
      c.phone,
      c.email || '',
      c.attendance_status === 'confirmed' ? 'Confirmado' : (c.attendance_status === 'declined' ? 'Não irá' : 'Pendente'),
      c.adults || 1,
      c.children || 0,
      c.companions || 0,
      c.total_people || 1,
      c.invitation_code || '',
      formatDateTimeBR(c.created_at),
      c.internal_notes || ''
    ]);
  });

  exportToCSV(`confirmacoes_rsvp_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  window.showToast('Arquivo CSV baixado com sucesso!', 'success');
};