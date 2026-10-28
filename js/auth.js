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
    const openBtn=$('auth-open'),out=$('auth-logout'),admin=$('account-link');
    if(!window.sb){openBtn.textContent='Войти / Регистрация';out.hidden=true;admin.hidden=true;return;}
    const {data:{session}}=await sb.auth.getSession();
    if(!session){openBtn.textContent='Войти / Регистрация';out.hidden=true;admin.hidden=true;return;}
    openBtn.textContent=session.user.email;
    out.hidden=false;
    const {data:profile}=await sb.from('profiles').select('role').eq('id',session.user.id).maybeSingle();
    admin.hidden=false; if(profile&&profile.role==='admin'){ admin.textContent='Личный кабинет владельца'; const tools=document.getElementById('account-admin-tools'); if(tools) tools.hidden=false; const manageBtn=document.getElementById('l-manage-button'); if(manageBtn) manageBtn.hidden=false; } else { admin.textContent='Личный кабинет'; const tools=document.getElementById('account-admin-tools'); if(tools) tools.hidden=true; const manageBtn=document.getElementById('l-manage-button'); if(manageBtn) manageBtn.hidden=true; }
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
    $('auth-logout').addEventListener('click',async()=>{if(window.sb)await sb.auth.signOut();await refreshUser();});
    if(window.sb)sb.auth.onAuthStateChange(()=>{setTimeout(refreshUser,0);});
    refreshUser();
  });
})();
