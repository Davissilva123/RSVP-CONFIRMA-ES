/* ==============================================================================
   ADMIN DASHBOARD METRICS, CHARTS & REALTIME LISTENERS
   ============================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('dashboard-page')) return;

  await loadDashboardMetrics();
  setupRealtimeSubscription();
});

/* Ouvinte do Botão de Alternar Sidebar (Toggle) */
document.addEventListener('DOMContentLoaded', () => {
  const layout = document.querySelector('.app-layout');
  const toggleBtn = document.getElementById('sidebarToggle');

  if (!toggleBtn || !layout) return;

  // Restaura o estado salvo (sidebar recolhida ou não) da última visita
  const savedState = localStorage.getItem('sidebarCollapsed');
  if (savedState === 'true') {
    layout.classList.add('collapsed');
    toggleBtn.setAttribute('aria-expanded', 'false');
  }

  toggleBtn.addEventListener('click', () => {
    const isCollapsed = layout.classList.toggle('collapsed');
    toggleBtn.setAttribute('aria-expanded', String(!isCollapsed));
    localStorage.setItem('sidebarCollapsed', String(isCollapsed));
  });
});

let attendanceChartInstance = null;
let eventChartInstance = null;

async function loadDashboardMetrics() {
  try {
    const supabase = window.supabaseClient;

    // Buscar todos os eventos
    const { data: events, error: eventsErr } = await supabase.from('events').select('*');
    if (eventsErr) throw eventsErr;

    // Buscar todas as confirmações
    const { data: confirmations, error: confsErr } = await supabase.from('confirmations').select('*');
    if (confsErr) throw confsErr;

    // Buscar lista de convidados
    const { data: guestList, error: guestErr } = await supabase.from('guest_list').select('*');
    if (guestErr) console.warn('Erro ao buscar guest_list:', guestErr);

    // Processamento das métricas
    const totalEvents = events ? events.length : 0;
    const totalConfirmationsReceived = confirmations ? confirmations.length : 0;

    let confirmedCount = 0;
    let declinedCount = 0;
    let pendingCount = 0;
    let totalPeopleAttending = 0;
    let adultsCount = 0;
    let childrenCount = 0;
    let companionsCount = 0;
    let receivedToday = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    if (confirmations) {
      confirmations.forEach(c => {
        if (c.attendance_status === 'confirmed') {
          confirmedCount++;
          const adults = c.adults || 1;
          const kids = c.children || 0;
          const comps = c.companions || 0;
          adultsCount += adults;
          childrenCount += kids;
          companionsCount += comps;
          totalPeopleAttending += (adults + kids + comps);
        } else if (c.attendance_status === 'declined') {
          declinedCount++;
        } else {
          pendingCount++;
        }

        if (c.created_at && c.created_at.startsWith(todayStr)) {
          receivedToday++;
        }
      });
    }

    const totalGuestsRegistered = (guestList ? guestList.length : 0) || (totalPeopleAttending + declinedCount + pendingCount);

    // Atualizar os elementos DOM dos cards
    updateElementText('metric-total-events', totalEvents);
    updateElementText('metric-total-guests', totalGuestsRegistered);
    updateElementText('metric-confirmations-received', totalConfirmationsReceived);
    updateElementText('metric-people-attending', totalPeopleAttending);
    updateElementText('metric-declined', declinedCount);
    updateElementText('metric-pending', pendingCount);
    updateElementText('metric-received-today', receivedToday);

    // Renderizar gráficos
    renderAttendanceChart(confirmedCount, declinedCount, pendingCount);
    renderEventsChart(events || [], confirmations || []);

    // Renderizar atividade recente
    renderRecentActivity(confirmations || [], events || []);

  } catch (err) {
    console.error('Erro ao carregar dados do Dashboard:', err);
    window.showToast('Erro ao carregar estatísticas do dashboard.', 'error');
  }
}

function updateElementText(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = typeof value === 'number' ? value.toLocaleString('pt-BR') : value;
  }
}

function renderAttendanceChart(confirmed, declined, pending) {
  const ctx = document.getElementById('attendanceDoughnutChart');
  if (!ctx) return;

  if (attendanceChartInstance) {
    attendanceChartInstance.destroy();
  }

  attendanceChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Confirmados', 'Não Irão', 'Pendentes'],
      datasets: [{
        data: [confirmed, declined, pending],
        backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
        borderWidth: 2,
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: 'Plus Jakarta Sans', weight: '600' },
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim()
          }
        }
      },
      cutout: '70%'
    }
  });
}

function renderEventsChart(events, confirmations) {
  const ctx = document.getElementById('eventsBarChart');
  if (!ctx) return;

  if (eventChartInstance) {
    eventChartInstance.destroy();
  }

  const labels = [];
  const confirmedData = [];

  events.forEach(evt => {
    labels.push(evt.title.length > 15 ? evt.title.substring(0, 15) + '...' : evt.title);
    const count = confirmations.filter(c => c.event_id === evt.id && c.attendance_status === 'confirmed')
      .reduce((acc, c) => acc + (c.total_people || 1), 0);
    confirmedData.push(count);
  });

  eventChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['Sem eventos'],
      datasets: [{
        label: 'Pessoas Confirmadas',
        data: confirmedData.length ? confirmedData : [0],
        backgroundColor: '#4f46e5',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.1)' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

function renderRecentActivity(confirmations, events) {
  const container = document.getElementById('recent-activity-table-body');
  if (!container) return;

  const eventMap = {};
  events.forEach(e => { eventMap[e.id] = e.title; });

  const sorted = [...confirmations].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

  if (!sorted.length) {
    container.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4 text-muted">Nenhuma atividade recente registrada.</td>
      </tr>
    `;
    return;
  }

  container.innerHTML = sorted.map(c => `
    <tr>
      <td><strong>${escapeHTML(c.name)}</strong></td>
      <td>${escapeHTML(eventMap[c.event_id] || 'Evento')}</td>
      <td>${getStatusBadgeHTML(c.attendance_status)}</td>
      <td><strong>${c.total_people || 1}</strong> pessoa(s)</td>
      <td>${formatDateTimeBR(c.created_at)}</td>
    </tr>
  `).join('');
}

function setupRealtimeSubscription() {
  if (window.isDemoMode || !window.supabaseClient) return;

  try {
    window.supabaseClient
      .channel('public:confirmations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'confirmations' }, () => {
        window.showToast('Nova confirmação recebida! Atualizando estatísticas...', 'info');
        loadDashboardMetrics();
      })
      .subscribe();
  } catch (err) {
    console.warn('Realtime subscription error:', err);
  }
}