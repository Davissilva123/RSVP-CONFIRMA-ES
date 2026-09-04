/* ==============================================================================
   SYSTEM UTILITIES, TOASTS, MODALS, MASKS & EXPORT HELPERS
   ============================================================================== */

// Toast Notification System
window.showToast = function (message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };

  toast.innerHTML = `
    <i class="${iconMap[type] || iconMap.info} toast-icon"></i>
    <span class="toast-message">${escapeHTML(message)}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(1rem) scale(0.95)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

// Modal Open/Close Controls
window.openModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

window.closeModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
};

// FIX: substitui window.confirm() nativo, que pode ser bloqueado silenciosamente
// em previews embutidos de IDE / webviews (ex: Antigravity), fazendo com que
// exclusões e outras ações "não façam nada" sem erro nenhum. Este modal usa a
// mesma estrutura .modal-overlay/.modal-card já usada no resto do app.
// Uso: const ok = await window.confirmDialog('Mensagem...', { title, confirmText, cancelText, danger });
window.confirmDialog = function (message, options = {}) {
  const title = options.title || 'Confirmar ação';
  const confirmText = options.confirmText || 'Confirmar';
  const cancelText = options.cancelText || 'Cancelar';
  const danger = options.danger !== false;

  return new Promise((resolve) => {
    let modal = document.getElementById('global-confirm-modal');

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'global-confirm-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-card" style="max-width: 420px;">
          <div class="modal-header">
            <h3 id="global-confirm-title">Confirmar ação</h3>
            <button type="button" class="btn-icon" id="global-confirm-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <p id="global-confirm-message" style="font-size: 0.9375rem; line-height: 1.5;"></p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="global-confirm-cancel-btn"></button>
            <button type="button" class="btn btn-danger" id="global-confirm-ok-btn"></button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    document.getElementById('global-confirm-title').textContent = title;
    document.getElementById('global-confirm-message').textContent = message;

    const cancelBtn = document.getElementById('global-confirm-cancel-btn');
    const okBtn = document.getElementById('global-confirm-ok-btn');
    const closeBtn = document.getElementById('global-confirm-close-btn');

    cancelBtn.textContent = cancelText;
    okBtn.textContent = confirmText;
    okBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';

    function cleanup(result) {
      closeModal('global-confirm-modal');
      cancelBtn.removeEventListener('click', onCancel);
      okBtn.removeEventListener('click', onOk);
      closeBtn.removeEventListener('click', onCancel);
      resolve(result);
    }
    function onCancel() { cleanup(false); }
    function onOk() { cleanup(true); }

    cancelBtn.addEventListener('click', onCancel);
    okBtn.addEventListener('click', onOk);
    closeBtn.addEventListener('click', onCancel);

    openModal('global-confirm-modal');
  });
};

// Input Mask Handlers
window.applyPhoneMask = function (value) {
  if (!value) return '';
  value = value.replace(/\D/g, '');
  if (value.length > 11) value = value.substring(0, 11);
  if (value.length > 10) {
    return value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  } else if (value.length > 6) {
    return value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
  } else if (value.length > 2) {
    return value.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
  } else {
    return value;
  }
};

window.applyCPFMask = function (value) {
  if (!value) return '';
  value = value.replace(/\D/g, '');
  if (value.length > 11) value = value.substring(0, 11);
  return value
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

// Date & Time Formatters
window.formatDateBR = function (dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

window.formatTimeBR = function (timeStr) {
  if (!timeStr) return '';
  return timeStr.substring(0, 5);
};

window.formatDateTimeBR = function (isoStr) {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return isoStr;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} às ${hours}:${mins}`;
};

// String Cleaners & Slug Generation
window.generateSlug = function (text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

window.escapeHTML = function (str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Query Params Parser
window.getQueryParams = function () {
  const params = {};
  const search = window.location.search.substring(1);
  if (!search) return params;
  const pairs = search.split('&');
  for (let pair of pairs) {
    const [key, val] = pair.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent(val || '');
  }
  return params;
};

// Status Badge Generator
window.getStatusBadgeHTML = function (status) {
  const map = {
    confirmed: { label: 'Confirmado', class: 'badge-confirmed' },
    declined: { label: 'Não irá', class: 'badge-declined' },
    pending: { label: 'Pendente', class: 'badge-pending' },
    draft: { label: 'Rascunho', class: 'badge-draft' },
    active: { label: 'Ativo', class: 'badge-active' },
    closed: { label: 'Encerrado', class: 'badge-closed' },
    archived: { label: 'Arquivado', class: 'badge-archived' }
  };
  const badge = map[status] || { label: status, class: 'badge-pending' };
  return `<span class="badge ${badge.class}">${badge.label}</span>`;
};

// CSV Export Utility
window.exportToCSV = function (filename, rows) {
  if (!rows || !rows.length) {
    window.showToast('Nenhum dado disponível para exportação.', 'warning');
    return;
  }

  const processRow = function (row) {
    let finalVal = '';
    for (let j = 0; j < row.length; j++) {
      let innerValue = row[j] === null || row[j] === undefined ? '' : row[j].toString();
      if (row[j] instanceof Date) {
        innerValue = row[j].toLocaleString();
      }
      let result = innerValue.replace(/"/g, '""');
      if (result.search(/("|,|\n)/g) >= 0)
        result = '"' + result + '"';
      if (j > 0)
        finalVal += ';'; // Ponto e vírgula para compatibilidade com Excel BR
      finalVal += result;
    }
    return finalVal + '\n';
  };

  let csvFile = '\uFEFF'; // BOM UTF-8 para Excel aceitar acentuação
  for (let i = 0; i < rows.length; i++) {
    csvFile += processRow(rows[i]);
  }

  const blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};