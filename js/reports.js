/* ==============================================================================
   REPORTS & ANALYTICS BREAKDOWN BY EVENT
   ============================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('reports-page')) return;

  await loadReports();
});

async function loadReports() {
  try {
    const supabase = window.supabaseClient;

    const { data: events } = await supabase.from('events').select('*');
    const { data: confirmations } = await supabase.from('confirmations').select('*');

    const select = document.getElementById('report-event-select');
    if (select && events) {
      select.innerHTML = '<option value="all">Visão Geral de Todos os Eventos</option>' +
        events.map(e => `<option value="${e.id}">${escapeHTML(e.title)}</option>`).join('');

      select.addEventListener('change', () => renderReportDetails(select.value, events, confirmations || []));
    }

    renderReportDetails('all', events || [], confirmations || []);

  } catch (err) {
    console.error('Erro ao carregar relatórios:', err);
    window.showToast('Erro ao carregar dados dos relatórios.', 'error');
  }
}

function renderReportDetails(selectedId, events, confirmations) {
  let filteredConfs = confirmations;
  let targetEvents = events;

  if (selectedId !== 'all') {
    filteredConfs = confirmations.filter(c => c.event_id === selectedId);
    targetEvents = events.filter(e => e.id === selectedId);
  }

  let totalResponses = filteredConfs.length;
  let confirmed = 0;
  let declined = 0;
  let totalPeople = 0;
  let adults = 0;
  let kids = 0;
  let comps = 0;

  filteredConfs.forEach(c => {
    if (c.attendance_status === 'confirmed') {
      confirmed++;
      const ad = c.adults || 1;
      const ch = c.children || 0;
      const co = c.companions || 0;
      adults += ad;
      kids += ch;
      comps += co;
      totalPeople += (ad + ch + co);
    } else if (c.attendance_status === 'declined') {
      declined++;
    }
  });

  const rate = totalResponses > 0 ? ((confirmed / totalResponses) * 100).toFixed(1) : 0;
  const declineRate = totalResponses > 0 ? ((declined / totalResponses) * 100).toFixed(1) : 0;

  document.getElementById('report-total-responses').textContent = totalResponses;
  document.getElementById('report-confirmed-count').textContent = confirmed;
  document.getElementById('report-declined-count').textContent = declined;
  document.getElementById('report-total-people').textContent = totalPeople;
  document.getElementById('report-adults-count').textContent = adults;
  document.getElementById('report-kids-count').textContent = kids;
  document.getElementById('report-conversion-rate').textContent = `${rate}%`;
  document.getElementById('report-decline-rate').textContent = `${declineRate}%`;

  renderReportTable(targetEvents, confirmations);
}

function renderReportTable(events, confirmations) {
  const container = document.getElementById('report-events-table-body');
  if (!container) return;

  if (!events.length) {
    container.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Nenhum evento para apresentar.</td></tr>';
    return;
  }

  container.innerHTML = events.map(e => {
    const confs = confirmations.filter(c => c.event_id === e.id);
    const respCount = confs.length;
    const confirmedCount = confs.filter(c => c.attendance_status === 'confirmed').length;
    const declinedCount = confs.filter(c => c.attendance_status === 'declined').length;
    const totalPeople = confs.filter(c => c.attendance_status === 'confirmed')
                             .reduce((acc, c) => acc + (c.total_people || 1), 0);

    const rate = respCount > 0 ? ((confirmedCount / respCount) * 100).toFixed(1) : 0;

    return `
      <tr>
        <td><strong>${escapeHTML(e.title)}</strong></td>
        <td>${formatDateBR(e.event_date)}</td>
        <td>${respCount}</td>
        <td><strong class="text-success">${confirmedCount}</strong></td>
        <td><span class="text-danger">${declinedCount}</span></td>
        <td><strong style="font-size: 1.05rem;">${totalPeople}</strong></td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div style="flex: 1; height: 8px; background-color: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
              <div style="width: ${rate}%; height: 100%; background-color: var(--success);"></div>
            </div>
            <strong>${rate}%</strong>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.printReport = function () {
  window.print();
};
