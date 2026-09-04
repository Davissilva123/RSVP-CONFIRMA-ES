/* ==============================================================================
   ADMIN SETTINGS & PROFILE MANAGEMENT
   ============================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('settings-page')) return;

  await loadUserSettings();
  setupSettingsForms();
});

async function loadUserSettings() {
  try {
    const supabase = window.supabaseClient;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return;

    const user = session.user;
    document.getElementById('setting-email').value = user.email || '';
    document.getElementById('setting-name').value = user.user_metadata?.full_name || '';

  } catch (err) {
    console.error('Erro ao carregar configurações:', err);
  }
}

function setupSettingsForms() {
  const profileForm = document.getElementById('profile-settings-form');
  const passwordForm = document.getElementById('password-settings-form');

  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('setting-name').value.trim();

      try {
        const supabase = window.supabaseClient;
        const { error } = await supabase.auth.updateUser({
          data: { full_name: name }
        });

        if (error) throw error;
        window.showToast('Perfil atualizado com sucesso!', 'success');
        document.querySelectorAll('.user-name').forEach(el => el.textContent = name);

      } catch (err) {
        console.error('Erro ao atualizar perfil:', err);
        window.showToast('Erro ao atualizar perfil.', 'error');
      }
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPassword = document.getElementById('setting-new-password').value;
      const confirmPassword = document.getElementById('setting-confirm-password').value;

      if (!newPassword || newPassword.length < 6) {
        window.showToast('A senha deve conter no mínimo 6 caracteres.', 'warning');
        return;
      }

      if (newPassword !== confirmPassword) {
        window.showToast('As senhas não coincidem.', 'warning');
        return;
      }

      try {
        const supabase = window.supabaseClient;
        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) throw error;
        window.showToast('Senha alterada com sucesso!', 'success');
        passwordForm.reset();

      } catch (err) {
        console.error('Erro ao alterar senha:', err);
        window.showToast('Erro ao alterar senha.', 'error');
      }
    });
  }
}
