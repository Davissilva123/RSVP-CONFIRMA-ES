/* ==============================================================================
   AUTH MANAGEMENT (SUPABASE AUTH & ROUTE GUARD - CLEAN URL SAFE)
   ============================================================================== */

(function () {
  document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname.toLowerCase();

    // Páginas públicas que não exigem login
    const isPublicPage = path.includes('confirmacao') ||
      path.includes('login') ||
      path.includes('404') ||
      path === '/' ||
      path.endsWith('index.html');

    // Inicializar guard de autenticação para páginas administrativas
    const session = await checkSession();

    if (!session && !isPublicPage) {
      window.location.href = 'login.html';
      return;
    }

    if (session && path.includes('login')) {
      window.location.href = 'dashboard.html';
      return;
    }

    if (session) {
      updateUserUI(session.user);
    }

    setupAuthForms();
  });

  async function checkSession() {
    try {
      if (!window.supabaseClient) return null;
      const { data, error } = await window.supabaseClient.auth.getSession();
      if (error || !data || !data.session) return null;
      return data.session;
    } catch (err) {
      console.error('Erro ao verificar sessão:', err);
      return null;
    }
  }

  function updateUserUI(user) {
    const userNameElements = document.querySelectorAll('.user-name');
    const userRoleElements = document.querySelectorAll('.user-role');
    const userAvatarElements = document.querySelectorAll('.user-avatar');

    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Administrador';
    const initial = name.charAt(0).toUpperCase();

    userNameElements.forEach(el => el.textContent = name);
    userRoleElements.forEach(el => el.textContent = user.email || 'Admin');
    userAvatarElements.forEach(el => el.textContent = initial);
  }

  function setupAuthForms() {
    const loginForm = document.getElementById('login-form');
    const resetForm = document.getElementById('reset-password-form');
    const logoutBtns = document.querySelectorAll('.btn-logout');

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        if (!email || !password) {
          window.showToast('Por favor, preencha o e-mail e a senha.', 'warning');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';

        try {
          const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email,
            password
          });

          if (error) {
            window.showToast('E-mail ou senha incorretos.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Entrar';
            return;
          }

          window.showToast('Login realizado com sucesso!', 'success');
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 800);

        } catch (err) {
          window.showToast('Ocorreu um erro ao realizar o login. Tente novamente.', 'error');
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Entrar';
        }
      });
    }

    if (resetForm) {
      resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('reset-email').value.trim();
        if (!email) {
          window.showToast('Informe seu e-mail para recuperação.', 'warning');
          return;
        }

        try {
          const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email);
          if (error) {
            window.showToast('Não foi possível enviar o e-mail de recuperação.', 'error');
          } else {
            window.showToast('E-mail de recuperação enviado com sucesso!', 'success');
            window.closeModal('reset-modal');
          }
        } catch (err) {
          window.showToast('Erro ao processar a solicitação.', 'error');
        }
      });
    }

    logoutBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const ok = await window.confirmDialog('Deseja realmente encerrar a sessão?', { title: 'Sair do Sistema', confirmText: 'Sair' });
        if (ok) {
          await window.supabaseClient.auth.signOut();
          window.showToast('Sessão encerrada.', 'info');
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 500);
        }
      });
    });
  }

  // Alternar visualização da senha
  window.togglePasswordVisibility = function (inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fas fa-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'fas fa-eye';
    }
  };
})();