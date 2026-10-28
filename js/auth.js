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
  const HIDE_AUTH_BUTTON_KEY='antik_hide_auth_button_after_registration';
  function hideAuthButtonAfterRegistration(){
    try{ localStorage.setItem(HIDE_AUTH_BUTTON_KEY,'1'); }catch(e){}
    const btn=$('auth-open'); if(btn)btn.hidden=true;
  }
  async function refreshUser(){
    const openBtn=$('auth-open'),admin=$('account-link'),logout=$('l-account-logout');
    const emailRow=$('l-account-email-row'),emailEl=$('l-account-email');
    if(!window.sb){openBtn.hidden=false;admin.hidden=true;logout.hidden=true;emailRow.hidden=true;return;}
    const {data:{session}}=await sb.auth.getSession();
    if(!session){
      let hideAfterRegistration=false;
      try{hideAfterRegistration=localStorage.getItem(HIDE_AUTH_BUTTON_KEY)==='1';}catch(e){}
      openBtn.hidden=hideAfterRegistration;openBtn.textContent='Войти / Регистрация';admin.hidden=true;logout.hidden=true;emailRow.hidden=true;return;
    }
    // После входа адрес почты и выход доступны только внутри личного кабинета.
    openBtn.hidden=true;
    if(emailEl)emailEl.textContent=session.user.email||'';
    if(emailRow)emailRow.hidden=false;
    if(logout)logout.hidden=false;
    const {data:profile}=await sb.from('profiles').select('role').eq('id',session.user.id).maybeSingle();
    const isAdmin=!!(profile&&profile.role==='admin');
    admin.hidden=!isAdmin;
    const tools=document.getElementById('account-admin-tools'); if(tools) tools.hidden=!isAdmin;
    const manageBtn=document.getElementById('l-manage-button'); if(manageBtn) manageBtn.hidden=!isAdmin;
  }
  document.addEventListener('DOMContentLoaded',()=>{
    $('auth-open').addEventListener('click',()=>{if(window.sb)open();else alert('Авторизация ещё не настроена. Откройте README.md и подключите Supabase.');});
    // Если после регистрации требуется подтверждение почты, кнопка авторизации скрывается,
    // но войти по-прежнему можно через пункт «ЛК».
    document.querySelectorAll('.header-actions a[href="#lk"]').forEach(link=>link.addEventListener('click',async e=>{
      if(!window.sb){e.preventDefault();alert('Авторизация ещё не настроена. Откройте README.md и подключите Supabase.');return;}
      try{const {data:{session}}=await sb.auth.getSession();if(!session){e.preventDefault();open();}}catch(err){}
    }));
    $('auth-close').addEventListener('click',close);
    $('auth-overlay').addEventListener('click',e=>{if(e.target===$('auth-overlay'))close();});
    $('auth-tab-login').addEventListener('click',()=>setMode('login'));
    $('auth-tab-register').addEventListener('click',()=>setMode('register'));
    $('auth-form').addEventListener('submit',async e=>{
      e.preventDefault();
      if(!window.sb){msg('Сначала настройте Supabase в js/config.js.');return;}
      const email=$('auth-email').value.trim(),password=$('auth-password').value;
      $('auth-submit').disabled=true;msg('Подождите…',true);
      try{
        if(mode==='register'){
          const {data,error}=await sb.auth.signUp({email,password});
          if(error)throw error;
          hideAuthButtonAfterRegistration();
          if(data.session){msg('Аккаунт создан. Вы вошли как обычный покупатель.',true);await refreshUser();setTimeout(close,900);}
          else {msg('Регистрация отправлена. Проверьте почту для подтверждения. Для входа откройте «ЛК».',true);await refreshUser();setTimeout(close,1800);}
        }else{
          const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;
          msg('Вы вошли в аккаунт.',true);await refreshUser();setTimeout(close,500);
        }
      }catch(err){msg(err.message||'Не удалось выполнить запрос.');}
      finally{$('auth-submit').disabled=false;}
    });
    $('l-account-logout').addEventListener('click',async()=>{if(window.sb)await sb.auth.signOut();await refreshUser();location.hash='#shop';});
    if(window.sb)sb.auth.onAuthStateChange(()=>{setTimeout(refreshUser,0);});
    refreshUser();
  });
})();
