
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
  // ---- Configuración de la librería (celular, ubicación, logo) ----
  window.siteSettings={};
  window.applyLogo=function(){
    const img=document.getElementById("siteLogo"); if(!img)return;
    const url=window.siteSettings.logo_url;
    if(url){img.src=url;img.classList.remove("hidden")}
    else{img.classList.add("hidden");img.removeAttribute("src")}
  };
  window.loadSiteSettings=async function(){
    if(!window.dbClient)return {};
    const {data,error}=await window.dbClient.from("configuracion").select("*").eq("id",1).maybeSingle();
    window.siteSettings=(!error&&data)?data:{};
    window.applyLogo();
    return window.siteSettings;
  };
  // Número para wa.me: solo dígitos; si son 8 dígitos se asume Bolivia (591).
  window.waNumber=function(){
    const d=String(window.siteSettings.whatsapp||"").replace(/\D/g,"");
    if(!d)return "59167655641";
    return d.length===8?"591"+d:d;
  };
})();
