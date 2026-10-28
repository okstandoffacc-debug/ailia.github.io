(function(){
  const $=id=>document.getElementById(id);
  let mode='login';
  function msg(s,good=false){const el=$('auth-message');if(el){el.textContent=s;el.style.color=good?'#246b37':'#7a2e2a';}}
  function setMode(m){
    mode=m;
    $('auth-title').textContent=m==='login'?'Вход в аккаунт':'Регистрация';
    $('auth-submit').textContent=m==='login'?'Войти':'Создать аккаунт';
    $('auth-tab-login').classList.toggle('active',m==='login');
    $('auth-tab-register').classList.toggle('active',m==='register');
    $('auth-password').autocomplete=m==='login'?'current-password':'new-password';
    msg('');
  }
  function open(){ $('auth-overlay').hidden=false; msg(''); }
  function close(){ $('auth-overlay').hidden=true; }
  async function refreshUser(){
    const openBtn=$('auth-open'), out=$('auth-logout'), lkOut=$('l-account-logout'), admin=$('account-link');
    const setLoggedOut=()=>{
      if(openBtn) openBtn.textContent='Войти / Регистрация';
      if(out) out.hidden=true;
      if(lkOut) lkOut.hidden=true;
      if(admin) admin.hidden=true;
      const tools=$('account-admin-tools'); if(tools) tools.hidden=true;
      const manageBtn=$('l-manage-button'); if(manageBtn) manageBtn.hidden=true;
    };
    if(!window.sb){setLoggedOut();return;}
    try {
      const {data:{session},error}=await sb.auth.getSession();
      if(error) throw error;
      if(!session){setLoggedOut();return;}
      if(openBtn) openBtn.textContent='ЛК';
      if(out) out.hidden=true;
      if(lkOut) lkOut.hidden=false;
      if(admin) admin.hidden=false;
      const {data:profile}=await sb.from('profiles').select('role').eq('id',session.user.id).maybeSingle();
      if(admin) admin.textContent=profile&&profile.role==='admin'?'Личный кабинет владельца':'Личный кабинет';
      const isAdmin=!!(profile&&profile.role==='admin');
      const tools=$('account-admin-tools'); if(tools) tools.hidden=!isAdmin;
      const manageBtn=$('l-manage-button'); if(manageBtn) manageBtn.hidden=!isAdmin;
    } catch(err) { console.error('Не удалось проверить сессию Supabase:',err); }
  }
  async function logout(){
    if(!window.sb){alert('Supabase не подключён.');return;}
    const buttons=[$('auth-logout'),$('l-account-logout')].filter(Boolean);
    buttons.forEach(b=>b.disabled=true);
    try {
      const {error}=await sb.auth.signOut();
      if(error) throw error;
      await refreshUser();
      if(typeof window.renderProfile==='function') window.renderProfile();
      if(location.hash==='#lk') location.hash='#home';
    } catch(err) {
      console.error('Ошибка выхода:',err);
      alert('Не удалось выйти из аккаунта: '+(err.message||'попробуйте ещё раз'));
    } finally { buttons.forEach(b=>b.disabled=false); }
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const authOpenButton=$('auth-open');
    if(authOpenButton)authOpenButton.addEventListener('click',()=>{if(window.sb)open();else alert('Авторизация ещё не настроена. Откройте README.md и подключите Supabase.');});
    $('auth-close').addEventListener('click',close);
    $('auth-overlay').addEventListener('click',e=>{if(e.target===$('auth-overlay'))close();});
    $('auth-tab-login').addEventListener('click',()=>setMode('login'));
    $('auth-tab-register').addEventListener('click',()=>setMode('register'));
    const passwordInput=$('auth-password'),passwordToggle=$('auth-password-toggle');
    if(passwordInput&&passwordToggle){
      passwordToggle.addEventListener('click',()=>{
        const show=passwordInput.type==='password';
        passwordInput.type=show?'text':'password';
        passwordToggle.textContent=show?'Скрыть':'Показать';
        passwordToggle.setAttribute('aria-label',show?'Скрыть пароль':'Показать пароль');
        passwordToggle.title=show?'Скрыть пароль':'Показать пароль';
        passwordToggle.setAttribute('aria-pressed',String(show));
      });
    }
    $('auth-form').addEventListener('submit',async e=>{
      e.preventDefault();
      if(!window.sb){msg('Сначала настройте Supabase в js/config.js.');return;}
      const email=$('auth-email').value.trim(),password=$('auth-password').value;
      $('auth-submit').disabled=true;msg('Подождите…',true);
      try{
        if(mode==='register'){
          const {data,error}=await sb.auth.signUp({email,password});
          if(error)throw error;
          if(data.session){msg('Аккаунт создан. Вы вошли как обычный покупатель.',true);await refreshUser();setTimeout(close,900);}
          else msg('Регистрация отправлена. Проверьте почту для подтверждения.',true);
        }else{
          const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;
          msg('Вы вошли в аккаунт.',true);await refreshUser();setTimeout(close,500);
        }
      }catch(err){msg(err.message||'Не удалось выполнить запрос.');}
      finally{$('auth-submit').disabled=false;}
    });
    const headerLogout=$('auth-logout'),lkLogout=$('l-account-logout');
    if(headerLogout) headerLogout.addEventListener('click',logout);
    if(lkLogout) lkLogout.addEventListener('click',logout);
    if(window.sb)sb.auth.onAuthStateChange(()=>{setTimeout(refreshUser,0);});
    refreshUser();
  });
})();
