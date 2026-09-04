/* ==============================================================================
   PUBLIC RSVP GUEST CONFIRMATION PORTAL
   ============================================================================== */

let currentEvent = null;
let currentCustomFields = [];
let guestListForEvent = [];
let selectedGuest = null;
let selectedAttendance = null; // 'confirmed' or 'declined'
let adultCount = 1;
let childCount = 0;
let companionCount = 0;

document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('public-rsvp-page')) return;

  const params = getQueryParams();
  let slug = params.slug;
  let id = params.id;

  // FIX: se a query string (?slug=... ou ?id=...) for cortada pelo ambiente local
  // (proxy, preview embutido de IDE, rewrite de URL limpo, etc.), usa o slug salvo
  // por events.js como reserva. Isso só ajuda em testes locais — o link real
  // compartilhado com convidados sempre chega com a query string intacta.
  if (!slug && !id) {
    try {
      slug = localStorage.getItem('rsvp_preview_event_slug');
    } catch (e) {
      slug = null;
    }
  }

  if (!slug && !id) {
    showErrorState('Evento não encontrado', 'O link informado parece ser inválido ou incompleto.');
    return;
  }

  await loadPublicEvent(slug, id);
});

async function loadPublicEvent(slug, id) {
  try {
    const supabase = window.supabaseClient;
    let query = supabase.from('events').select('*');

    if (slug) {
      query = query.eq('slug', slug);
    } else {
      query = query.eq('id', id);
    }

    const { data: event, error } = await query.single();

    if (error || !event) {
      showErrorState('Evento não encontrado', 'Não encontramos nenhum evento com este link.');
      return;
    }

    if (event.status === 'draft' || event.status === 'archived') {
      showErrorState('Evento Indisponível', 'Este evento não está disponível para confirmação no momento.');
      return;
    }

    const isExpired = event.confirmation_deadline && new Date(event.confirmation_deadline) < new Date();
    if (event.status === 'closed' || isExpired) {
      showErrorState('Confirmações Encerradas', 'O prazo para confirmação de presença para este evento foi encerrado.');
      return;
    }

    currentEvent = event;

    // Carregar campos personalizados
    const { data: fields } = await supabase
      .from('form_fields')
      .select('*')
      .eq('event_id', event.id)
      .order('position', { ascending: true });

    currentCustomFields = fields || [];

    // FIX: carrega a lista prévia de convidados (guest_list) deste evento, para
    // permitir que o convidado se identifique digitando o nome, em vez de
    // preencher tudo manualmente do zero.
    const { data: guests } = await supabase
      .from('guest_list')
      .select('*')
      .eq('event_id', event.id);

    guestListForEvent = guests || [];

    renderEventPublicView();

  } catch (err) {
    console.error('Erro ao carregar evento público:', err);
    showErrorState('Erro de Conexão', 'Não foi possível carregar as informações do evento.');
  }
}

function showErrorState(title, message) {
  const container = document.getElementById('public-rsvp-container');
  if (!container) return;

  container.innerHTML = `
    <div class="event-card-public" style="padding: 3rem 1.5rem; text-align: center;">
      <div class="empty-state-icon" style="margin: 0 auto 1rem auto; background-color: var(--danger-bg); color: var(--danger);">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem;">${escapeHTML(title)}</h2>
      <p class="text-muted" style="margin-bottom: 1.5rem;">${escapeHTML(message)}</p>
      <a href="index.html" class="btn btn-secondary"><i class="fas fa-home"></i> Ir para o Início</a>
    </div>
  `;
}

// FIX: capas-modelo geradas em SVG (uma por tipo de evento), usadas quando o
// organizador não define uma "cover_url" própria. Não dependem de nenhuma imagem
// externa (sem risco de licença/direitos autorais e sem link que possa quebrar).
const EVENT_TYPE_COVER_THEMES = {
  'Casamento': { c1: '#f5d0c5', c2: '#c9184a', emoji: '💍' },
  'Aniversário': { c1: '#a78bfa', c2: '#ec4899', emoji: '🎉' },
  'Festa de 15 anos': { c1: '#f9a8d4', c2: '#9333ea', emoji: '👑' },
  'Formatura': { c1: '#1e3a8a', c2: '#3b82f6', emoji: '🎓' },
  'Culto': { c1: '#fef3c7', c2: '#b45309', emoji: '🙏' },
  'Congresso': { c1: '#0f766e', c2: '#0891b2', emoji: '🎤' },
  'Conferência': { c1: '#312e81', c2: '#4f46e5', emoji: '💼' },
  'Evento Empresarial': { c1: '#334155', c2: '#0f172a', emoji: '💼' },
  'Workshop': { c1: '#065f46', c2: '#10b981', emoji: '🛠️' },
  'Encontro': { c1: '#f97316', c2: '#ea580c', emoji: '🤝' },
  'Evento Familiar': { c1: '#84cc16', c2: '#16a34a', emoji: '👨‍👩‍👧‍👦' },
  'Chá de bebê': { c1: '#bae6fd', c2: '#f9a8d4', emoji: '🍼' },
  'Chá revelação': { c1: '#93c5fd', c2: '#f9a8d4', emoji: '🎀' },
  'Confraternização': { c1: '#f97316', c2: '#b91c1c', emoji: '🥂' },
  'Personalizado': { c1: '#4f46e5', c2: '#ec4899', emoji: '🎊' }
};

function getDefaultEventCover(type) {
  const theme = EVENT_TYPE_COVER_THEMES[type] || EVENT_TYPE_COVER_THEMES['Personalizado'];

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="500" viewBox="0 0 1200 500">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${theme.c1}"/>
          <stop offset="100%" stop-color="${theme.c2}"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="500" fill="url(#grad)"/>
      <circle cx="120" cy="90" r="6" fill="#ffffff" opacity="0.35"/>
      <circle cx="1080" cy="420" r="8" fill="#ffffff" opacity="0.3"/>
      <circle cx="980" cy="80" r="4" fill="#ffffff" opacity="0.4"/>
      <circle cx="180" cy="430" r="5" fill="#ffffff" opacity="0.3"/>
      <circle cx="620" cy="60" r="3" fill="#ffffff" opacity="0.3"/>
      <text x="600" y="270" font-size="140" text-anchor="middle" dominant-baseline="middle">${theme.emoji}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function renderEventPublicView() {
  const container = document.getElementById('public-rsvp-container');
  if (!container) return;

  // Aplicar cores personalizadas
  if (currentEvent.primary_color) {
    document.documentElement.style.setProperty('--event-primary', currentEvent.primary_color);
  }
  if (currentEvent.secondary_color) {
    document.documentElement.style.setProperty('--event-secondary', currentEvent.secondary_color);
  }

  const coverUrl = currentEvent.cover_url || getDefaultEventCover(currentEvent.type);
  const formattedDate = formatDateBR(currentEvent.event_date);
  const formattedTime = formatTimeBR(currentEvent.event_time);

  container.innerHTML = `
    <div class="event-card-public">
      <!-- Capa do Evento -->
      <div class="event-cover-banner" style="background-image: url('${coverUrl}');">
        <div class="event-cover-overlay">
          <div>
            <span class="event-badge-type">${escapeHTML(currentEvent.type || 'Evento Especial')}</span>
          </div>
        </div>
      </div>

      <!-- Cabeçalho do Evento -->
      <div class="event-header-content">
        <h1 class="event-title-public">${escapeHTML(currentEvent.title)}</h1>
        ${currentEvent.host_name ? `<p class="event-host-name">Convidado por: <strong>${escapeHTML(currentEvent.host_name)}</strong></p>` : ''}
      </div>

      <!-- Detalhes de Data, Hora e Local -->
      <div class="event-details-grid">
        <div class="event-info-item">
          <div class="event-info-icon"><i class="fas fa-calendar-alt"></i></div>
          <div>
            <div class="event-info-label">Data</div>
            <div class="event-info-val">${formattedDate}</div>
          </div>
        </div>

        <div class="event-info-item">
          <div class="event-info-icon"><i class="fas fa-clock"></i></div>
          <div>
            <div class="event-info-label">Horário</div>
            <div class="event-info-val">${formattedTime || 'A definir'}</div>
          </div>
        </div>

        <div class="event-info-item" style="grid-column: span 2;">
          <div class="event-info-icon"><i class="fas fa-map-marker-alt"></i></div>
          <div style="flex: 1;">
            <div class="event-info-label">Local</div>
            <div class="event-info-val">${escapeHTML(currentEvent.location)}</div>
            ${currentEvent.address ? `<div class="text-muted" style="font-size: 0.8125rem;">${escapeHTML(currentEvent.address)}</div>` : ''}
          </div>
        </div>
      </div>

      <!-- Contagem Regressiva -->
      ${currentEvent.countdown_enabled ? `
        <div class="countdown-box">
          <div class="countdown-title"><i class="fas fa-hourglass-half"></i> Contagem Regressiva para o Evento</div>
          <div class="countdown-timer" id="countdown-display">
            <div class="countdown-unit"><span class="countdown-number" id="cd-days">00</span><span class="countdown-label">Dias</span></div>
            <div class="countdown-unit"><span class="countdown-number" id="cd-hours">00</span><span class="countdown-label">Horas</span></div>
            <div class="countdown-unit"><span class="countdown-number" id="cd-mins">00</span><span class="countdown-label">Minutos</span></div>
            <div class="countdown-unit"><span class="countdown-number" id="cd-secs">00</span><span class="countdown-label">Segundos</span></div>
          </div>
        </div>
      ` : ''}

      <!-- Mensagem Inicial -->
      ${currentEvent.welcome_message ? `
        <div class="event-welcome-msg">
          <i class="fas fa-quote-left text-muted" style="margin-right: 0.5rem;"></i>
          ${escapeHTML(currentEvent.welcome_message)}
        </div>
      ` : ''}

      <!-- Formulario de Confirmação -->
      <form id="public-rsvp-form" style="padding: 1.5rem;" onsubmit="handlePublicSubmit(event)">
        
        <div class="form-group">
          <label class="form-label">Você confirma sua presença? <span class="required">*</span></label>
          <div class="attendance-selector">
            <div class="attendance-card" id="card-attend-yes" onclick="selectAttendance('confirmed')">
              <div class="attendance-icon" style="color: var(--success);"><i class="fas fa-check-circle"></i></div>
              <div class="attendance-title">Sim, estarei presente</div>
            </div>
            <div class="attendance-card" id="card-attend-no" onclick="selectAttendance('declined')">
              <div class="attendance-icon" style="color: var(--danger);"><i class="fas fa-times-circle"></i></div>
              <div class="attendance-title">Não poderei comparecer</div>
            </div>
          </div>
        </div>

        <!-- Seção de Dados Principais -->
        <div id="rsvp-fields-section" style="display: none;">
          ${currentEvent.require_invitation_code ? `
            <div class="form-group">
              <label class="form-label">Código do Convite <span class="required">*</span></label>
              <input type="text" id="rsvp-invitation-code" class="form-control" placeholder="Ex: AB1234" style="text-transform: uppercase;">
              <small class="form-help">Informe o código impresso no seu convite.</small>
            </div>
          ` : ''}

          <div id="guest-search-group">
            ${renderGuestSearchBoxHTML()}
          </div>

          <div class="form-group">
            <label class="form-label">Nome Completo <span class="required">*</span></label>
            ${renderNameFieldHTML()}
          </div>

          <div class="form-group">
            <label class="form-label">Telefone / WhatsApp <span class="required">*</span></label>
            <input type="tel" id="rsvp-phone" class="form-control" placeholder="(00) 00000-0000" oninput="this.value = applyPhoneMask(this.value)" required>
          </div>

          <div class="form-group">
            <label class="form-label">E-mail (opcional)</label>
            <input type="email" id="rsvp-email" class="form-control" placeholder="seuemail@exemplo.com">
          </div>

          <!-- Seleção de Acompanhantes (Aparece somente se Confirmado) -->
          <div id="companion-section" style="display: none; margin-bottom: 1.5rem;">
            <label class="form-label" style="margin-bottom: 0.75rem;">Quantidade de Pessoas</label>

            <div class="companion-counter-group">
              <div>
                <strong>Adultos</strong>
                <div class="text-muted" style="font-size: 0.75rem;">Incluindo você</div>
              </div>
              <div class="counter-btn-group">
                <button type="button" class="counter-btn" onclick="changeCount('adults', -1)">-</button>
                <span class="counter-value" id="count-adults">1</span>
                <button type="button" class="counter-btn" onclick="changeCount('adults', 1)">+</button>
              </div>
            </div>

            <div class="companion-counter-group">
              <div>
                <strong>Crianças</strong>
                <div class="text-muted" style="font-size: 0.75rem;">Até 10 anos</div>
              </div>
              <div class="counter-btn-group">
                <button type="button" class="counter-btn" onclick="changeCount('children', -1)">-</button>
                <span class="counter-value" id="count-children">0</span>
                <button type="button" class="counter-btn" onclick="changeCount('children', 1)">+</button>
              </div>
            </div>
          </div>

          <!-- Campos Personalizados -->
          ${renderCustomFieldsHTML()}

          <button type="submit" id="submit-rsvp-btn" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 1rem;">
            <i class="fas fa-paper-plane"></i> Confirmar Resposta
          </button>
        </div>

      </form>
    </div>
  `;

  if (currentEvent.countdown_enabled) {
    startCountdownTimer(currentEvent.event_date, currentEvent.event_time);
  }
}

function renderCustomFieldsHTML() {
  if (!currentCustomFields.length) return '';

  return currentCustomFields.map(f => {
    const fieldId = `custom-field-${f.id}`;
    const opts = Array.isArray(f.options) ? f.options : [];

    let inputHTML = '';
    if (f.field_type === 'textarea') {
      inputHTML = `<textarea id="${fieldId}" class="form-control" rows="3" placeholder="${escapeHTML(f.placeholder || '')}"></textarea>`;
    } else if (f.field_type === 'select') {
      inputHTML = `
        <select id="${fieldId}" class="form-control">
          <option value="">${escapeHTML(f.placeholder || 'Selecione...')}</option>
          ${opts.map(o => `<option value="${escapeHTML(o)}">${escapeHTML(o)}</option>`).join('')}
        </select>
      `;
    } else if (f.field_type === 'radio' || f.field_type === 'checkbox') {
      inputHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.25rem;">
          ${opts.map(o => `
            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; cursor: pointer;">
              <input type="${f.field_type}" name="${fieldId}" value="${escapeHTML(o)}"> ${escapeHTML(o)}
            </label>
          `).join('')}
        </div>
      `;
    } else {
      inputHTML = `<input type="${f.field_type}" id="${fieldId}" class="form-control" placeholder="${escapeHTML(f.placeholder || '')}">`;
    }

    return `
      <div class="form-group" data-custom-field-id="${f.id}">
        <label class="form-label">${escapeHTML(f.label)} ${f.required ? '<span class="required">*</span>' : ''}</label>
        ${inputHTML}
        ${f.help_text ? `<small class="form-help">${escapeHTML(f.help_text)}</small>` : ''}
      </div>
    `;
  }).join('');
}

// FIX: normaliza texto (remove acentos/caixa) para permitir busca por nome
// tolerante a diferenças de acentuação e maiúsculas/minúsculas.
function normalizeSearchText(text) {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// FIX: quando o evento tem lista de convidados cadastrada, o campo Nome nasce
// travado (o convidado NÃO pode digitar o nome manualmente) — só é liberado,
// já preenchido, depois que ele se identifica na busca acima.
function renderNameFieldHTML() {
  if (guestListForEvent.length > 0 && !selectedGuest) {
    return `<input type="text" id="rsvp-name" class="form-control" placeholder="Busque e selecione seu nome acima" disabled>`;
  }
  if (guestListForEvent.length > 0 && selectedGuest) {
    return `<input type="text" id="rsvp-name" class="form-control" value="${escapeHTML(selectedGuest.name)}" readonly>`;
  }
  return `<input type="text" id="rsvp-name" class="form-control" placeholder="Digite seu nome completo" required>`;
}

// Gera o HTML do bloco de busca por nome (ou nada, se o evento não tiver
// convidados pré-cadastrados em guest_list).
function renderGuestSearchBoxHTML() {
  if (!guestListForEvent.length) return '';

  if (selectedGuest) {
    return `
      <div class="form-group" style="background-color: var(--success-bg, rgba(34,197,94,0.1)); border: 1px solid var(--success); border-radius: 10px; padding: 0.75rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
        <div>
          <i class="fas fa-check-circle" style="color: var(--success); margin-right: 0.5rem;"></i>
          Convidado identificado: <strong>${escapeHTML(selectedGuest.name)}</strong>
          ${selectedGuest.group_name ? `<div class="text-muted" style="font-size: 0.75rem; margin-top: 0.125rem;">${escapeHTML(selectedGuest.group_name)}</div>` : ''}
        </div>
        <button type="button" class="btn btn-sm btn-secondary" onclick="clearSelectedGuest()">Não sou eu</button>
      </div>
    `;
  }

  return `
    <div class="form-group" style="position: relative;">
      <label class="form-label">Busque seu nome na lista de convidados <span class="required">*</span></label>
      <input type="text" id="guest-search-input-public" class="form-control" placeholder="Digite seu nome..." oninput="handleGuestSearchInput(this.value)" autocomplete="off">
      <div id="guest-search-results" style="display: none; position: relative; margin-top: 0.375rem; border: 1px solid var(--border-color); border-radius: 10px; overflow: hidden; background-color: var(--bg-secondary);"></div>
      <small class="form-help">Seu nome precisa estar na lista de convidados deste evento para confirmar presença.</small>
    </div>
  `;
}

window.handleGuestSearchInput = function (value) {
  const resultsBox = document.getElementById('guest-search-results');
  if (!resultsBox) return;

  const term = normalizeSearchText(value);

  if (!term) {
    resultsBox.innerHTML = '';
    resultsBox.style.display = 'none';
    return;
  }

  const matches = guestListForEvent
    .filter(g => normalizeSearchText(g.name).includes(term))
    .slice(0, 6);

  if (!matches.length) {
    resultsBox.innerHTML = `
      <div style="padding: 0.75rem 1rem; font-size: 0.875rem; color: var(--text-muted);">
        Nenhum nome encontrado. Verifique a grafia ou entre em contato com o organizador do evento.
      </div>
    `;
    resultsBox.style.display = 'block';
    return;
  }

  resultsBox.innerHTML = matches.map(g => `
    <div onclick="selectGuestFromList('${g.id}')" style="padding: 0.75rem 1rem; cursor: pointer; border-bottom: 1px solid var(--border-color);" onmouseover="this.style.backgroundColor='var(--bg-tertiary)'" onmouseout="this.style.backgroundColor='transparent'">
      <strong>${escapeHTML(g.name)}</strong>
      ${g.group_name ? `<span class="text-muted" style="font-size: 0.8125rem;"> — ${escapeHTML(g.group_name)}</span>` : ''}
    </div>
  `).join('');
  resultsBox.style.display = 'block';
};

window.selectGuestFromList = function (guestId) {
  const g = guestListForEvent.find(item => item.id === guestId);
  if (!g) return;

  selectedGuest = g;

  const searchGroup = document.getElementById('guest-search-group');
  if (searchGroup) searchGroup.innerHTML = renderGuestSearchBoxHTML();

  // FIX: campo Nome deixa de ser "disabled" e passa a ser "readonly" — mostra o
  // nome vindo da lista, mas continua impedindo digitação manual.
  const nameInput = document.getElementById('rsvp-name');
  if (nameInput) {
    nameInput.disabled = false;
    nameInput.value = g.name;
    nameInput.readOnly = true;
  }

  const phoneInput = document.getElementById('rsvp-phone');
  if (phoneInput && g.phone) phoneInput.value = g.phone;

  const emailInput = document.getElementById('rsvp-email');
  if (emailInput && g.email) emailInput.value = g.email;

  const codeInput = document.getElementById('rsvp-invitation-code');
  if (codeInput && g.invitation_code) {
    codeInput.value = g.invitation_code;
    codeInput.readOnly = true;
  }

  // Recalcula o limite de acompanhantes para o cadastro deste convidado
  adultCount = 1;
  childCount = 0;
  const adultsEl = document.getElementById('count-adults');
  const childrenEl = document.getElementById('count-children');
  if (adultsEl) adultsEl.textContent = adultCount;
  if (childrenEl) childrenEl.textContent = childCount;
};

window.clearSelectedGuest = function () {
  selectedGuest = null;

  const searchGroup = document.getElementById('guest-search-group');
  if (searchGroup) searchGroup.innerHTML = renderGuestSearchBoxHTML();

  // FIX: volta ao estado travado (disabled) — não permite digitar o nome
  // manualmente, só buscar de novo na lista.
  const nameInput = document.getElementById('rsvp-name');
  if (nameInput) {
    nameInput.readOnly = false;
    nameInput.value = '';
    nameInput.disabled = true;
  }

  const codeInput = document.getElementById('rsvp-invitation-code');
  if (codeInput) codeInput.readOnly = false;
};

window.selectAttendance = function (status) {
  selectedAttendance = status;

  const cardYes = document.getElementById('card-attend-yes');
  const cardNo = document.getElementById('card-attend-no');
  const fieldsSection = document.getElementById('rsvp-fields-section');
  const companionSection = document.getElementById('companion-section');

  if (cardYes && cardNo) {
    cardYes.className = status === 'confirmed' ? 'attendance-card selected-yes' : 'attendance-card';
    cardNo.className = status === 'declined' ? 'attendance-card selected-no' : 'attendance-card';
  }

  if (fieldsSection) fieldsSection.style.display = 'block';
  if (companionSection) companionSection.style.display = status === 'confirmed' ? 'block' : 'none';

  // Smooth scroll
  fieldsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.changeCount = function (type, delta) {
  // FIX: se o convidado foi identificado na lista prévia, respeita o limite de
  // acompanhantes definido especificamente para ele; senão usa o limite geral do evento.
  const maxPerInvite = (selectedGuest && typeof selectedGuest.max_companions === 'number')
    ? selectedGuest.max_companions
    : (currentEvent.max_guests_per_invite || 4);

  if (type === 'adults') {
    adultCount = Math.max(1, Math.min(maxPerInvite, adultCount + delta));
    document.getElementById('count-adults').textContent = adultCount;
  } else if (type === 'children') {
    childCount = Math.max(0, Math.min(maxPerInvite, childCount + delta));
    document.getElementById('count-children').textContent = childCount;
  }
};

function startCountdownTimer(dateStr, timeStr) {
  const targetDate = new Date(`${dateStr}T${timeStr || '00:00:00'}`).getTime();

  function updateTimer() {
    const now = new Date().getTime();
    const diff = targetDate - now;

    if (diff <= 0) {
      document.getElementById('countdown-display').innerHTML = '<div style="font-weight: 700;">É hoje! O evento começou.</div>';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    const daysEl = document.getElementById('cd-days');
    const hoursEl = document.getElementById('cd-hours');
    const minsEl = document.getElementById('cd-mins');
    const secsEl = document.getElementById('cd-secs');

    if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
    if (minsEl) minsEl.textContent = String(mins).padStart(2, '0');
    if (secsEl) secsEl.textContent = String(secs).padStart(2, '0');
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}

window.handlePublicSubmit = async function (e) {
  e.preventDefault();

  if (!selectedAttendance) {
    window.showToast('Selecione se irá comparecer ou não.', 'warning');
    return;
  }

  // FIX: se o evento tem lista de convidados, é obrigatório ter identificado o
  // convidado pela busca — não é permitido confirmar com nome digitado manualmente.
  if (guestListForEvent.length > 0 && !selectedGuest) {
    window.showToast('Busque e selecione seu nome na lista de convidados para continuar.', 'warning');
    return;
  }

  const name = document.getElementById('rsvp-name').value.trim();
  const phone = document.getElementById('rsvp-phone').value.trim();
  const email = document.getElementById('rsvp-email')?.value.trim() || null;
  // FIX: se o convidado foi identificado na lista prévia, usa o código de convite
  // dele automaticamente (mesmo que o campo esteja oculto/travado); senão, usa o
  // que foi digitado manualmente.
  const invitation_code = selectedGuest
    ? selectedGuest.invitation_code
    : (document.getElementById('rsvp-invitation-code')?.value.trim() || null);

  if (!name || !phone) {
    window.showToast('Por favor, informe seu Nome e Telefone.', 'warning');
    return;
  }

  const submitBtn = document.getElementById('submit-rsvp-btn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

  try {
    const supabase = window.supabaseClient;

    // Inserir registro de confirmação
    const confPayload = {
      event_id: currentEvent.id,
      // FIX: guest_id vincula a confirmação ao registro da lista de convidados,
      // quando o convidado foi identificado pela busca.
      guest_id: selectedGuest ? selectedGuest.id : null,
      name,
      phone,
      email,
      invitation_code,
      attendance_status: selectedAttendance,
      adults: selectedAttendance === 'confirmed' ? adultCount : 0,
      children: selectedAttendance === 'confirmed' ? childCount : 0,
      companions: 0
      // FIX: total_people é coluna GENERATED ALWAYS (adults + children + companions)
      // no Postgres — não pode ser enviada no insert, o banco calcula sozinho.
      // Era isso que fazia todo envio de confirmação falhar.
    };

    const { data: conf, error: confErr } = await supabase.from('confirmations').insert([confPayload]).select().single();
    if (confErr) throw confErr;

    // Coletar e inserir respostas personalizadas
    if (currentCustomFields.length > 0 && conf) {
      const answersToInsert = [];

      currentCustomFields.forEach(f => {
        const fieldId = `custom-field-${f.id}`;
        let ansVal = '';

        if (f.field_type === 'radio' || f.field_type === 'checkbox') {
          const checked = document.querySelectorAll(`input[name="${fieldId}"]:checked`);
          ansVal = Array.from(checked).map(c => c.value).join(', ');
        } else {
          const el = document.getElementById(fieldId);
          if (el) ansVal = el.value.trim();
        }

        if (ansVal) {
          answersToInsert.push({
            confirmation_id: conf.id,
            field_id: f.id,
            field_label: f.label,
            answer: ansVal
          });
        }
      });

      if (answersToInsert.length > 0) {
        await supabase.from('confirmation_answers').insert(answersToInsert);
      }
    }

    // FIX: se o convidado veio da lista prévia, reflete o status de presença
    // dele também na tabela guest_list (best-effort — não bloqueia o fluxo
    // principal caso essa atualização falhe).
    if (selectedGuest) {
      try {
        await supabase.from('guest_list').update({ status: selectedAttendance }).eq('id', selectedGuest.id);
      } catch (guestUpdateErr) {
        console.error('Erro ao atualizar status na lista de convidados:', guestUpdateErr);
      }
    }

    // Tela final de sucesso ou recusa
    renderConfirmationSuccessScreen();

  } catch (err) {
    console.error('Erro ao enviar confirmação:', err);
    window.showToast('Não foi possível registrar sua resposta. Tente novamente.', 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Confirmar Resposta';
  }
};

function renderConfirmationSuccessScreen() {
  const container = document.getElementById('public-rsvp-container');
  if (!container) return;

  const isConfirmed = selectedAttendance === 'confirmed';
  const messageText = isConfirmed ?
    (currentEvent.confirmation_message || 'Presença confirmada com sucesso!') :
    (currentEvent.rejection_message || 'Sua resposta foi salva. Obrigado por nos avisar!');

  container.innerHTML = `
    <div class="event-card-public">
      <div class="success-screen">
        <div class="animated-checkmark" style="${!isConfirmed ? 'background-color: var(--danger-bg); color: var(--danger); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0.15);' : ''}">
          <i class="${isConfirmed ? 'fas fa-check' : 'fas fa-heart-broken'}"></i>
        </div>

        <h2 style="font-size: 1.75rem; font-weight: 800;">
          ${isConfirmed ? 'Presença Confirmada!' : 'Resposta Registrada'}
        </h2>

        <p class="text-secondary" style="font-size: 1.05rem; max-width: 440px; line-height: 1.6;">
          ${escapeHTML(messageText)}
        </p>

        <div style="margin-top: 1rem; padding: 1rem 1.5rem; background-color: var(--bg-tertiary); border-radius: 12px; width: 100%;">
          <div style="font-weight: 700; font-size: 1.125rem;">${escapeHTML(currentEvent.title)}</div>
          <div class="text-muted" style="font-size: 0.875rem; margin-top: 0.25rem;">
            ${formatDateBR(currentEvent.event_date)} às ${formatTimeBR(currentEvent.event_time) || 'Horário a definir'}
          </div>
          <div class="text-muted" style="font-size: 0.875rem;">${escapeHTML(currentEvent.location)}</div>
        </div>

        <button onclick="window.location.reload()" class="btn btn-outline" style="margin-top: 1rem;">
          <i class="fas fa-redo"></i> Enviar outra resposta
        </button>
      </div>
    </div>
  `;
}