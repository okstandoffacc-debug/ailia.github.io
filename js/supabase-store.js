// Общая работа с Supabase. В config.js указываются только публичные URL/key.
(function(){
  const cfg=window.SUPABASE_CONFIG||{};
  const valid=cfg.url && cfg.anonKey && !cfg.url.includes('YOUR-PROJECT') && !cfg.anonKey.includes('YOUR_SUPABASE');
  window.supabaseReady=!!(valid && window.supabase);
  window.sb=window.supabaseReady ? window.supabase.createClient(cfg.url,cfg.anonKey) : null;
  window.loadRemoteProducts=async function(){
    if(!window.sb) return null;
    const {data,error}=await window.sb.from('products').select('*').order('id',{ascending:false});
    if(error){console.error('Не удалось загрузить каталог из Supabase:',error.message);return null;}
    return (data||[]).map(p=>({
      id:p.id, avitoId:p.avito_id || String(p.id), name:p.name, price:p.price,
      seller:p.seller||'Старинная Коллекция', category:p.category||'Разное',
      year:p.year||'', image:p.image||'', photos:Array.isArray(p.photos)?p.photos:[],
      link:p.link||'', description:p.description||'', available:p.available!==false, photos:Array.isArray(p.photos)?p.photos:[]
    })).filter(p=>p.available!==false);
  };
})();
