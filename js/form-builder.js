/* ==============================================================================
   INTERACTIVE FORM BUILDER FOR CUSTOM EVENT FIELDS
   ============================================================================== */

let currentEvent = null;
let currentFields = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('form-builder-page')) return;

  const params = getQueryParams();
  // FIX: se a query string (?id=...) for cortada pelo ambiente local (proxy,
  // preview embutido de IDE, rewrite de URL limpo, etc.), usa o ID salvo em
  // sessionStorage por events.js como reserva.
  let eventId = params.id;
  if (!eventId) {
    try {
      eventId = sessionStorage.getItem('rsvp_current_event_id');
    } catch (e) {
      eventId = null;
    }
  }

  if (!eventId) {
    window.showToast('ID do evento não informado.', 'error');
    setTimeout(() => { window.location.href = 'eventos.html'; }, 1500);
    return;
  }

  await loadEventAndFields(eventId);
});

async function loadEventAndFields(eventId) {
  try {
    const supabase = window.supabaseClient;

    const { data: event, error: evtErr } = await supabase.from('events').select('*').eq('id', eventId).single();
    if (evtErr || !event) throw new Error('Evento não encontrado');

    currentEvent = event;
    document.getElementById('builder-event-title').textContent = event.title;

    const { data: fields, error: fieldsErr } = await supabase
      .from('form_fields')
      .select('*')
      .eq('event_id', eventId)
      .order('position', { ascending: true });

    if (fieldsErr) throw fieldsErr;

    currentFields = fields || [];
    renderFieldsList();

  } catch (err) {
    console.error('Erro ao carregar construtor:', err);
    window.showToast('Erro ao carregar dados do formulário.', 'error');
  }
}

function renderFieldsList() {
  const container = document.getElementById('fields-editor-list');
  if (!container) return;

  if (!currentFields.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fas fa-wpforms"></i></div>
        <div class="empty-state-title">Nenhum campo personalizado adicionado</div>
        <div class="empty-state-text">Clique nos tipos de campo à esquerda para adicionar perguntas ao formulário de confirmação.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = currentFields.map((field, index) => {
    const hasOptions = ['select', 'radio', 'checkbox'].includes(field.field_type);
    const optionsText = Array.isArray(field.options) ? field.options.join(', ') : (field.options || '');

    return `
      <div class="field-editor-card" data-index="${index}">
        <div class="field-editor-header">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-grip-vertical drag-handle"></i>
            <strong>#${index + 1} - ${escapeHTML(field.label || 'Sem rótulo')}</strong>
            <span class="badge badge-pending">${field.field_type.toUpperCase()}</span>
            ${field.required ? '<span class="badge badge-declined">Obrigatório</span>' : ''}
          </div>
          <div style="display: flex; gap: 0.25rem;">
            <button class="btn btn-icon" onclick="moveField(${index}, -1)" ${index === 0 ? 'disabled' : ''} title="Mover para cima"><i class="fas fa-arrow-up"></i></button>
            <button class="btn btn-icon" onclick="moveField(${index}, 1)" ${index === currentFields.length - 1 ? 'disabled' : ''} title="Mover para baixo"><i class="fas fa-arrow-down"></i></button>
            <button class="btn btn-icon btn-danger" onclick="removeField(${index})" title="Excluir"><i class="fas fa-trash"></i></button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Pergunta / Rótulo</label>
            <input type="text" class="form-control" value="${escapeHTML(field.label || '')}" onchange="updateFieldProperty(${index}, 'label', this.value)">
          </div>

          <div class="form-group">
            <label class="form-label">Tipo de Campo</label>
            <select class="form-control" onchange="updateFieldProperty(${index}, 'field_type', this.value)">
              <option value="text" ${field.field_type === 'text' ? 'selected' : ''}>Texto Simples</option>
              <option value="textarea" ${field.field_type === 'textarea' ? 'selected' : ''}>Texto Longo</option>
              <option value="number" ${field.field_type === 'number' ? 'selected' : ''}>Número</option>
              <option value="phone" ${field.field_type === 'phone' ? 'selected' : ''}>Telefone</option>
              <option value="email" ${field.field_type === 'email' ? 'selected' : ''}>E-mail</option>
              <option value="date" ${field.field_type === 'date' ? 'selected' : ''}>Data</option>
              <option value="time" ${field.field_type === 'time' ? 'selected' : ''}>Horário</option>
              <option value="select" ${field.field_type === 'select' ? 'selected' : ''}>Lista Suspensa (Select)</option>
              <option value="radio" ${field.field_type === 'radio' ? 'selected' : ''}>Múltipla Escolha (Radio)</option>
              <option value="checkbox" ${field.field_type === 'checkbox' ? 'selected' : ''}>Caixa de Seleção (Checkbox)</option>
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Texto de Ajuda / Instrução</label>
            <input type="text" class="form-control" value="${escapeHTML(field.help_text || '')}" placeholder="Ex: Exiba restrições alimentares" onchange="updateFieldProperty(${index}, 'help_text', this.value)">
          </div>

          <div class="form-group">
            <label class="form-label">Placeholder (Exemplo no campo)</label>
            <input type="text" class="form-control" value="${escapeHTML(field.placeholder || '')}" placeholder="Ex: Digite aqui..." onchange="updateFieldProperty(${index}, 'placeholder', this.value)">
          </div>
        </div>

        ${hasOptions ? `
          <div class="form-group">
            <label class="form-label">Opções de Resposta (separadas por vírgula)</label>
            <input type="text" class="form-control" value="${escapeHTML(optionsText)}" placeholder="Opção 1, Opção 2, Opção 3" onchange="updateFieldOptions(${index}, this.value)">
          </div>
        ` : ''}

        <div style="display: flex; align-items: center; gap: 1rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color);">
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; font-weight: 600; cursor: pointer;">
            <input type="checkbox" ${field.required ? 'checked' : ''} onchange="updateFieldProperty(${index}, 'required', this.checked)">
            Campo de preenchimento obrigatório
          </label>
        </div>
      </div>
    `;
  }).join('');
}

window.addFieldOfType = function (type) {
  const defaultLabels = {
    text: 'Pergunta em Texto',
    textarea: 'Observações / Comentários',
    number: 'Quantidade',
    phone: 'Telefone adicional',
    email: 'E-mail de contato',
    date: 'Data preferencial',
    time: 'Horário estimado de chegada',
    select: 'Selecione uma opção',
    radio: 'Escolha uma alternativa',
    checkbox: 'Marque as opções aplicáveis'
  };

  const newField = {
    id: 'temp-' + Date.now(),
    event_id: currentEvent.id,
    label: defaultLabels[type] || 'Nova Pergunta',
    field_name: generateSlug(defaultLabels[type] || 'campo') + '_' + Date.now().toString().slice(-4),
    field_type: type,
    placeholder: '',
    help_text: '',
    required: false,
    position: currentFields.length,
    options: ['select', 'radio', 'checkbox'].includes(type) ? ['Opção 1', 'Opção 2'] : []
  };

  currentFields.push(newField);
  renderFieldsList();
  window.showToast(`Campo "${defaultLabels[type]}" adicionado.`, 'info');
};

window.updateFieldProperty = function (index, prop, value) {
  if (currentFields[index]) {
    currentFields[index][prop] = value;
    if (prop === 'label' && !currentFields[index].field_name) {
      currentFields[index].field_name = generateSlug(value);
    }
  }
};

window.updateFieldOptions = function (index, rawValue) {
  if (currentFields[index]) {
    const opts = rawValue.split(',').map(s => s.trim()).filter(Boolean);
    currentFields[index].options = opts;
  }
};

window.moveField = function (index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= currentFields.length) return;

  const temp = currentFields[index];
  currentFields[index] = currentFields[newIndex];
  currentFields[newIndex] = temp;

  currentFields.forEach((f, i) => f.position = i);
  renderFieldsList();
};

window.removeField = async function (index) {
  const ok = await window.confirmDialog('Deseja remover este campo do formulário?', { title: 'Remover Campo', confirmText: 'Remover' });
  if (ok) {
    currentFields.splice(index, 1);
    currentFields.forEach((f, i) => f.position = i);
    renderFieldsList();
    window.showToast('Campo removido.', 'info');
  }
};

window.saveFormFields = async function () {
  if (!currentEvent) return;

  const saveBtn = document.getElementById('save-fields-btn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
  }

  try {
    const supabase = window.supabaseClient;

    // Remover campos anteriores do evento no Supabase
    await supabase.from('form_fields').delete().eq('event_id', currentEvent.id);

    // Inserir campos reordenados
    if (currentFields.length > 0) {
      const itemsToInsert = currentFields.map((f, i) => ({
        event_id: currentEvent.id,
        label: f.label,
        field_name: f.field_name || generateSlug(f.label),
        field_type: f.field_type,
        placeholder: f.placeholder,
        help_text: f.help_text,
        required: f.required,
        position: i,
        options: f.options
      }));

      const { error } = await supabase.from('form_fields').insert(itemsToInsert);
      if (error) throw error;
    }

    window.showToast('Formulário salvo com sucesso!', 'success');
    await loadEventAndFields(currentEvent.id);

  } catch (err) {
    console.error('Erro ao salvar campos do formulário:', err);
    window.showToast('Erro ao salvar os campos.', 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Formulário';
    }
  }
};

window.openFormPreviewModal = function () {
  const container = document.getElementById('form-preview-content');
  if (!container) return;

  container.innerHTML = `
    <div style="background-color: var(--bg-primary); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color);">
      <h3 style="margin-bottom: 0.5rem; color: ${currentEvent.primary_color || '#4f46e5'};">${escapeHTML(currentEvent.title)}</h3>
      <p class="text-muted" style="margin-bottom: 1.5rem;">${escapeHTML(currentEvent.welcome_message || '')}</p>

      <div class="form-group">
        <label class="form-label">Você confirma sua presença? <span class="required">*</span></label>
        <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
          <label style="flex: 1; padding: 0.75rem; border: 2px solid var(--success); border-radius: 8px; text-align: center; font-weight: 700; color: var(--success); cursor: pointer;">
            Sim, estarei presente
          </label>
          <label style="flex: 1; padding: 0.75rem; border: 2px solid var(--border-color); border-radius: 8px; text-align: center; font-weight: 700; color: var(--text-muted); cursor: pointer;">
            Não poderei comparecer
          </label>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Nome Completo <span class="required">*</span></label>
        <input type="text" class="form-control" placeholder="Seu nome completo" disabled>
      </div>

      <div class="form-group">
        <label class="form-label">Telefone / WhatsApp <span class="required">*</span></label>
        <input type="text" class="form-control" placeholder="(00) 00000-0000" disabled>
      </div>

      ${currentFields.map(f => `
        <div class="form-group">
          <label class="form-label">${escapeHTML(f.label)} ${f.required ? '<span class="required">*</span>' : ''}</label>
          ${renderPreviewFieldInput(f)}
          ${f.help_text ? `<small class="form-help">${escapeHTML(f.help_text)}</small>` : ''}
        </div>
      `).join('')}
    </div>
  `;

  openModal('preview-modal');
};

function renderPreviewFieldInput(field) {
  if (field.field_type === 'textarea') {
    return `<textarea class="form-control" rows="3" placeholder="${escapeHTML(field.placeholder || '')}" disabled></textarea>`;
  }
  if (field.field_type === 'select') {
    const opts = Array.isArray(field.options) ? field.options : [];
    return `
      <select class="form-control" disabled>
        <option value="">${escapeHTML(field.placeholder || 'Selecione...')}</option>
        ${opts.map(o => `<option>${escapeHTML(o)}</option>`).join('')}
      </select>
    `;
  }
  if (field.field_type === 'radio' || field.field_type === 'checkbox') {
    const opts = Array.isArray(field.options) ? field.options : [];
    return `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.25rem;">
        ${opts.map(o => `
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
            <input type="${field.field_type}" disabled> ${escapeHTML(o)}
          </label>
        `).join('')}
      </div>
    `;
  }
  return `<input type="${field.field_type}" class="form-control" placeholder="${escapeHTML(field.placeholder || '')}" disabled>`;
}