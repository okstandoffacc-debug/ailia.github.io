(function () {
  const $ = id => document.getElementById(id);
  let mode = 'login';
  let refreshInProgress = false;

  function msg(text, good = false) {
    const el = $('auth-message');
    if (el) {
      el.textContent = text;
      el.style.color = good ? '#246b37' : '#7a2e2a';
    }
  }

  function setMode(nextMode) {
    mode = nextMode;
    if ($('auth-title')) $('auth-title').textContent = mode === 'login' ? 'Вход в аккаунт' : 'Регистрация';
    if ($('auth-submit')) $('auth-submit').textContent = mode === 'login' ? 'Войти' : 'Создать аккаунт';
    if ($('auth-tab-login')) $('auth-tab-login').classList.toggle('active', mode === 'login');
    if ($('auth-tab-register')) $('auth-tab-register').classList.toggle('active', mode === 'register');
    if ($('auth-password')) $('auth-password').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
    msg('');
  }

  function openAuth() {
    const overlay = $('auth-overlay');
    if (overlay) overlay.hidden = false;
    msg('');
  }

  function closeAuth() {
    const overlay = $('auth-overlay');
    if (overlay) overlay.hidden = true;
  }

  async function refreshUser() {
    if (refreshInProgress) return;
    refreshInProgress = true;
    const authOpen = $('auth-open');
    const logout = $('l-account-logout');
    const accountLink = $('account-link');
    const adminTools = $('account-admin-tools');
    const manageButton = $('l-manage-button');

    try {
      if (!window.sb) {
        if (authOpen) authOpen.hidden = false;
        if (logout) logout.hidden = true;
        if (accountLink) accountLink.hidden = true;
        if (adminTools) adminTools.hidden = true;
        if (manageButton) manageButton.hidden = true;
        return;
      }

      const { data, error } = await window.sb.auth.getSession();
      if (error) throw error;
      const session = data && data.session;

      // The main-screen auth button is shown only to signed-out visitors.
      if (authOpen) authOpen.hidden = !!session;
      if (logout) logout.hidden = !session;
      if (accountLink) accountLink.hidden = !session;

      if (!session) {
        if (adminTools) adminTools.hidden = true;
        if (manageButton) manageButton.hidden = true;
        const emailRow = $('l-account-email-row');
        if (emailRow) emailRow.hidden = true;
        return;
      }

      const emailEl = $('l-account-email');
      const emailRow = $('l-account-email-row');
      if (emailEl) emailEl.textContent = session.user.email || '';
      if (emailRow) emailRow.hidden = false;

      const { data: profile, error: profileError } = await window.sb
        .from('profiles').select('role').eq('id', session.user.id).maybeSingle();
      const isAdmin = !profileError && profile && profile.role === 'admin';
      if (accountLink) accountLink.textContent = isAdmin ? 'Личный кабинет владельца' : 'Личный кабинет';
      if (adminTools) adminTools.hidden = !isAdmin;
      if (manageButton) manageButton.hidden = !isAdmin;
    } catch (error) {
      console.error('Не удалось обновить состояние авторизации:', error);
    } finally {
      refreshInProgress = false;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const authOpenButton = $('auth-open');
    if (authOpenButton) authOpenButton.addEventListener('click', () => {
      if (window.sb) openAuth();
      else alert('Авторизация ещё не настроена. Проверьте подключение Supabase в js/config.js.');
    });

    if ($('auth-close')) $('auth-close').addEventListener('click', closeAuth);
    if ($('auth-overlay')) $('auth-overlay').addEventListener('click', event => {
      if (event.target === $('auth-overlay')) closeAuth();
    });
    if ($('auth-tab-login')) $('auth-tab-login').addEventListener('click', () => setMode('login'));
    if ($('auth-tab-register')) $('auth-tab-register').addEventListener('click', () => setMode('register'));

    const passwordInput = $('auth-password');
    const passwordToggle = $('auth-password-toggle');
    const renderPasswordToggle = show => {
      if (!passwordToggle) return;
      passwordToggle.innerHTML = show
        ? '<i class="fa-solid fa-eye-slash" aria-hidden="true"></i>'
        : '<i class="fa-solid fa-eye" aria-hidden="true"></i>';
      passwordToggle.setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль');
      passwordToggle.title = show ? 'Скрыть пароль' : 'Показать пароль';
      passwordToggle.setAttribute('aria-pressed', String(show));
    };
    if (passwordInput && passwordToggle) {
      renderPasswordToggle(false);
      passwordToggle.addEventListener('click', () => {
        const show = passwordInput.type === 'password';
        passwordInput.type = show ? 'text' : 'password';
        renderPasswordToggle(show);
        passwordInput.focus();
      });
    }

    const form = $('auth-form');
    if (form) form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!window.sb) {
        msg('Сначала настройте подключение Supabase в js/config.js.');
        return;
      }
      const email = $('auth-email').value.trim();
      const password = $('auth-password').value;
      const submit = $('auth-submit');
      if (submit) submit.disabled = true;
      msg('Подождите…', true);
      try {
        if (mode === 'register') {
          const { data, error } = await window.sb.auth.signUp({ email, password });
          if (error) throw error;
          if (data && data.session) {
            msg('Аккаунт создан. Вы вошли в систему.', true);
            await refreshUser();
            setTimeout(closeAuth, 700);
          } else {
            // Without a session the email still needs confirmation, so the button remains visible.
            msg('Регистрация создана. Подтвердите почту, затем войдите в аккаунт.', true);
          }
        } else {
          const { error } = await window.sb.auth.signInWithPassword({ email, password });
          if (error) throw error;
          msg('Вы вошли в аккаунт.', true);
          await refreshUser();
          setTimeout(closeAuth, 500);
        }
      } catch (error) {
        msg(error.message || 'Не удалось выполнить запрос.');
      } finally {
        if (submit) submit.disabled = false;
      }
    });

    if ($('l-account-logout')) $('l-account-logout').addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!window.sb || !window.sb.auth) {
        alert('Не удалось подключиться к авторизации. Обновите страницу и попробуйте снова.');
        return;
      }
      const button = $('l-account-logout');
      if (button) { button.disabled = true; button.textContent = 'Выходим…'; }
      try {
        // End the current browser session explicitly, then verify it is gone.
        const { error } = await window.sb.auth.signOut({ scope: 'local' });
        if (error) throw error;
        const { data, error: sessionError } = await window.sb.auth.getSession();
        if (sessionError) throw sessionError;
        if (data && data.session) {
          // Retry once with the default sign-out behavior if the local session remains.
          const retry = await window.sb.auth.signOut();
          if (retry.error) throw retry.error;
        }
        closeAuth();
        const authOpen = $('auth-open');
        const accountLink = $('account-link');
        const emailRow = $('l-account-email-row');
        const adminTools = $('account-admin-tools');
        const manageButton = $('l-manage-button');
        if (authOpen) authOpen.hidden = false;
        if (button) button.hidden = true;
        if (accountLink) accountLink.hidden = true;
        if (emailRow) emailRow.hidden = true;
        if (adminTools) adminTools.hidden = true;
        if (manageButton) manageButton.hidden = true;
        // Return to the storefront and reload so all page modules discard stale user state.
        if (location.hash !== '#shop') location.hash = '#shop';
        window.location.reload();
      } catch (error) {
        alert('Не удалось выйти из аккаунта: ' + (error.message || 'неизвестная ошибка'));
      } finally {
        if (button) { button.disabled = false; button.textContent = 'Выйти'; }
      }
    });

    if (window.sb && window.sb.auth) {
      window.sb.auth.onAuthStateChange(() => {
        // Defer refresh to avoid calling Supabase auth methods inside its callback.
        setTimeout(() => refreshUser(), 0);
      });
    }
    refreshUser();
  });
})();
