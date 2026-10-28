(function () {
  const $ = (id) => document.getElementById(id);
  let currentUser = null;
  let currentAvatarUrl = '';

  function setMessage(text, ok = false) {
    const el = $('profile-edit-message');
    if (!el) return;
    el.textContent = text;
    el.style.color = ok ? '#9acb9e' : '#f0a5a0';
  }

  function showAvatar(url) {
    const box = $('l-profile-avatar');
    if (!box) return;
    box.replaceChildren();
    if (url) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Фото профиля';
      img.referrerPolicy = 'no-referrer';
      box.appendChild(img);
    } else {
      box.textContent = '👤';
    }
    const oldAvatar = document.querySelector('.lk-user-card .lk-avatar:not(#l-profile-avatar)');
    if (oldAvatar) oldAvatar.remove();
  }

  async function loadProfile() {
    if (!window.sb) return;
    const { data: { session } } = await sb.auth.getSession();
    currentUser = session?.user || null;
    const panel = $('profile-edit-panel');
    if (!currentUser) {
      if (panel) panel.hidden = true;
      showAvatar('');
      return;
    }
    if (panel) panel.hidden = false;
    const { data, error } = await sb.from('profiles')
      .select('display_name, avatar_url')
      .eq('id', currentUser.id).maybeSingle();
    if (error) {
      setMessage('Не удалось загрузить профиль. Проверь, что выполнил profile-migration.sql в Supabase.');
      return;
    }
    const name = data?.display_name || currentUser.user_metadata?.display_name || '';
    currentAvatarUrl = data?.avatar_url || '';
    if ($('profile-display-name')) $('profile-display-name').value = name;
    const nameEl = $('l-user-name');
    if (nameEl) nameEl.textContent = name || currentUser.email || 'Покупатель';
    showAvatar(currentAvatarUrl);
    setMessage('');
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!window.sb) return setMessage('Авторизация Supabase не настроена.');
    const { data: { session } } = await sb.auth.getSession();
    currentUser = session?.user || null;
    if (!currentUser) return setMessage('Войди в аккаунт через «ЛК», чтобы изменить профиль.');

    const saveBtn = $('profile-save-button');
    const fileInput = $('profile-photo-file');
    const file = fileInput?.files?.[0];
    const name = $('profile-display-name').value.trim();
    if (name.length > 60) return setMessage('Имя должно быть не длиннее 60 символов.');
    if (file && !file.type.startsWith('image/')) return setMessage('Выбери файл изображения.');
    if (file && file.size > 5 * 1024 * 1024) return setMessage('Фото должно быть не больше 5 МБ.');

    saveBtn.disabled = true;
    setMessage('Сохраняю…', true);
    try {
      let avatarUrl = currentAvatarUrl;
      if (file) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const path = `${currentUser.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await sb.storage.from('profile-photos').upload(path, file, {
          cacheControl: '3600', upsert: true, contentType: file.type
        });
        if (uploadError) throw uploadError;
        const { data: publicData } = sb.storage.from('profile-photos').getPublicUrl(path);
        avatarUrl = publicData.publicUrl;
      }
      const { error } = await sb.from('profiles').upsert({
        id: currentUser.id,
        email: currentUser.email || '',
        display_name: name,
        avatar_url: avatarUrl
      }, { onConflict: 'id' });
      if (error) throw error;
      currentAvatarUrl = avatarUrl;
      if ($('l-user-name')) $('l-user-name').textContent = name || currentUser.email || 'Покупатель';
      showAvatar(avatarUrl);
      if (fileInput) fileInput.value = '';
      setMessage('Профиль сохранён.', true);
    } catch (err) {
      console.error('Profile save error:', err);
      const message = err?.message || 'Не удалось сохранить профиль.';
      if (/bucket|storage/i.test(message)) setMessage('Хранилище фото не настроено. Выполни profile-migration.sql в Supabase.');
      else if (/column|schema cache|display_name|avatar_url/i.test(message)) setMessage('Сначала выполни profile-migration.sql в Supabase.');
      else setMessage(`Ошибка сохранения: ${message}`);
    } finally {
      saveBtn.disabled = false;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = $('profile-edit-form');
    if (form) form.addEventListener('submit', saveProfile);
    const fileInput = $('profile-photo-file');
    if (fileInput) fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
        setMessage('Нужна картинка размером до 5 МБ.');
        fileInput.value = '';
        return;
      }
      const preview = URL.createObjectURL(file);
      showAvatar(preview);
    });
    if (window.sb) {
      sb.auth.onAuthStateChange(() => setTimeout(loadProfile, 0));
      loadProfile();
    }
  });
})();
