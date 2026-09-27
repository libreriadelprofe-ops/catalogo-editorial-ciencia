
(function(){
  const cfg=window.APP_CONFIG||{};
  const url=cfg.SUPABASE_URL||"";
  const key=cfg.SUPABASE_KEY||"";
  const configured=url.startsWith("https://") && !url.includes("PEGA_AQUI") && key && !key.includes("PEGA_AQUI");
  window.isSupabaseConfigured=configured;
  window.dbClient=configured ? window.supabase.createClient(url,key,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  }) : null;

  window.money=function(v){
    if(v===null||v===undefined||v==="") return "—";
    const n=Number(v);
    return Number.isFinite(n) ? new Intl.NumberFormat("es-BO",{style:"currency",currency:"BOB"}).format(n) : "—";
  };
  window.esc=function(s){
    return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  };
  window.toast=function(msg,type=""){
    const t=document.getElementById("toast"); if(!t){alert(msg);return}
    t.textContent=msg;t.className="toast show"+(type==="error"?" error":type==="okay"?" okay":"");
    clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>t.className="toast",2800);
  };
  window.slugify=function(s){
    return String(s||"archivo").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
      .replace(/[^a-z0-9._-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")||"archivo";
  };
})();
