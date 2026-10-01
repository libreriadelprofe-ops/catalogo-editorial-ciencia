
const $=id=>document.getElementById(id);
let books=[];
let currentCategory="";
let editingBook=null;
let saleBook=null;

function numOrNull(id){
  const raw=$(id).value.trim();
  return raw===""?null:Number(raw);
}
function intOrZero(id){
  const n=Number($(id).value||0); return Number.isFinite(n)?Math.max(0,Math.trunc(n)):0;
}
function setBusy(btn,busy,label){
  if(!btn)return; if(busy){btn.dataset.old=btn.textContent;btn.disabled=true;btn.textContent=label||"Procesando..."}
  else{btn.disabled=false;btn.textContent=btn.dataset.old||btn.textContent}
}
function openModal(id){$(id).classList.add("open")}
function closeModal(id){$(id).classList.remove("open")}
function publicUrl(bucket,path){
  return dbClient.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
function safeExt(file, fallback){
  const name=file?.name||""; const m=name.match(/\.([a-zA-Z0-9]+)$/); return m?m[1].toLowerCase():fallback;
}
async function optimizeCover(file,maxW=1000,maxH=1500){
  if(!file)return null;
  if(file.size>8*1024*1024) throw new Error("La imagen original supera 8 MB.");
  const bitmap=await createImageBitmap(file);
  const scale=Math.min(1,maxW/bitmap.width,maxH/bitmap.height);
  const canvas=document.createElement("canvas");
  canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  const ctx=canvas.getContext("2d");ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("No se pudo convertir la imagen.")),"image/webp",0.84));
  if(blob.size>2*1024*1024) throw new Error("La portada optimizada supera 2 MB.");
  return blob;
}
async function uploadCover(file,bookTitle){
  const blob=await optimizeCover(file);
  const path=`${new Date().getFullYear()}/${Date.now()}-${slugify(bookTitle)}.webp`;
  const {error}=await dbClient.storage.from("portadas").upload(path,blob,{contentType:"image/webp",cacheControl:"3600",upsert:false});
  if(error) throw error;
  return {path,url:publicUrl("portadas",path)};
}
async function uploadPdf(file,bookTitle){
  if(!file)return null;
  if(file.type!=="application/pdf") throw new Error("El archivo de muestra debe ser PDF.");
  if(file.size>6*1024*1024) throw new Error("El PDF supera 6 MB. Reduce su tamaño para esta versión.");
  const path=`${new Date().getFullYear()}/${Date.now()}-${slugify(bookTitle)}.pdf`;
  const {error}=await dbClient.storage.from("muestras-pdf").upload(path,file,{contentType:"application/pdf",cacheControl:"3600",upsert:false});
  if(error) throw error;
  return {path,url:publicUrl("muestras-pdf",path)};
}
async function removeStorageObject(bucket,path){
  if(!path)return;
  const {error}=await dbClient.storage.from(bucket).remove([path]);
  if(error) console.warn("No se pudo borrar",bucket,path,error);
}

async function init(){
  if(!window.isSupabaseConfigured){
    $("loginConfigWarning").classList.remove("hidden");
    $("loginForm").querySelectorAll("input,button").forEach(el=>el.disabled=true);
    return;
  }
  const {data:{session}}=await dbClient.auth.getSession();
  setSessionView(session);
  dbClient.auth.onAuthStateChange((_event,session)=>setSessionView(session));
}
function setSessionView(session){
  const logged=!!session;
  $("loginView").classList.toggle("hidden",logged);
  $("adminView").classList.toggle("hidden",!logged);
  $("logoutBtn").classList.toggle("hidden",!logged);
  $("settingsBtn").classList.toggle("hidden",!logged);
  if(logged){loadSiteSettings();loadAll();}
}
$("loginForm").onsubmit=async e=>{
  e.preventDefault();
  $("loginMsg").textContent="Iniciando sesión...";
  const {error}=await dbClient.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
  if(error){$("loginMsg").textContent=error.message;toast("No se pudo iniciar sesión","error")}
  else{$("loginMsg").textContent="";}
};
$("logoutBtn").onclick=()=>dbClient.auth.signOut();

async function loadBooks(){
  $("adminMsg").innerHTML='<div class="loading"><span class="spinner"></span>Cargando...</div>';
  const {data,error}=await dbClient.from("libros").select("*").order("titulo",{ascending:true});
  if(error){console.error(error);$("adminMsg").textContent=error.message;toast(error.message,"error");return}
  books=data||[];
  renderKPIs();renderCategory();
  $("seedSection").classList.toggle("hidden",books.length!==0);
}
function renderKPIs(){
  $("kpiBooks").textContent=books.length;
  $("kpiStock").textContent=books.reduce((s,b)=>s+Number(b.stock||0),0);
  $("kpiSold").textContent=books.reduce((s,b)=>s+Number(b.vendidas||0),0);
  $("kpiMoney").textContent=money(books.reduce((s,b)=>s+Number(b.acumulado||0),0));
}
function filteredAdminBooks(){
  const q=$("adminSearch").value.trim().toLocaleLowerCase("es");
  return books.filter(b=>{
    if(b.categoria!==currentCategory)return false;
    const h=[b.codigo,b.titulo,b.autor,b.genero].join(" ").toLocaleLowerCase("es");
    return !q||h.includes(q);
  });
}
function renderCategory(){
  $("categoryTitle").textContent=currentCategory;
  const rows=filteredAdminBooks();
  $("categoryCount").textContent=rows.length+" libro(s)";
  const tbody=$("adminTable").querySelector("tbody");tbody.innerHTML="";
  if(!rows.length){
    $("adminTable").classList.add("hidden");
    $("adminMsg").textContent="No hay registros en esta sección.";
    return;
  }
  $("adminTable").classList.remove("hidden");$("adminMsg").textContent="";
  rows.forEach(b=>{
    const tr=document.createElement("tr");
    const cover=b.portada_url?`<img class="bookThumb" src="${esc(b.portada_url)}" alt="">`:`<div class="imgEmpty">Sin imagen</div>`;
    tr.innerHTML=`
      <td>${cover}</td>
      <td>${esc(b.codigo||"—")}</td>
      <td><b>${esc(b.titulo)}</b><br><span class="hint">${esc(b.genero||"")}</span></td>
      <td>${esc(b.autor||"—")}</td>
      <td>${money(b.precio_venta)}</td>
      <td>${Number(b.stock||0)}</td>
      <td>${Number(b.vendidas||0)}</td>
      <td><div class="tableActions">
        <button class="btn success" data-action="sale">Vender</button>
        <button class="btn primary" data-action="edit">Editar</button>
        <button class="btn danger" data-action="delete">Eliminar</button>
      </div></td>`;
    tr.querySelector('[data-action="sale"]').onclick=()=>openSale(b);
    tr.querySelector('[data-action="edit"]').onclick=()=>openBook(b);
    tr.querySelector('[data-action="delete"]').onclick=()=>deleteBook(b);
    tbody.appendChild(tr);
  });
}

// ---------- Categorías ----------
const DEFAULT_CATEGORIES=["Obras extranjeras","Obras nacionales","Libros preuniversitarios"];
let categories=[], categoriesReady=false, editingCat=null;

async function loadCategories(){
  const {data,error}=await dbClient.from("categorias").select("id,nombre,orden").order("orden").order("nombre");
  if(error||!data?.length){
    categoriesReady=false;
    categories=DEFAULT_CATEGORIES.map(n=>({id:null,nombre:n,orden:0}));
    $("adminStatus").textContent="Para editar o agregar categorías, ejecuta supabase/migracion_categorias.sql en Supabase.";
  }else{
    categoriesReady=true;categories=data;
    $("adminStatus").textContent="Conectado a Supabase.";
  }
  if(!categories.some(c=>c.nombre===currentCategory))currentCategory=categories[0].nombre;
  renderNav();fillCategorySelect();
}
function renderNav(){
  document.querySelectorAll(".adminNav button[data-category]").forEach(b=>b.remove());
  const anchor=$("newCatBtn");
  categories.forEach(c=>{
    const b=document.createElement("button");b.type="button";b.dataset.category=c.nombre;b.textContent=c.nombre;
    if(c.nombre===currentCategory)b.classList.add("active");
    b.onclick=()=>{currentCategory=c.nombre;$("adminSearch").value="";renderNav();renderCategory()};
    anchor.parentNode.insertBefore(b,anchor);
  });
}
function fillCategorySelect(){
  const sel=$("categoria"),prev=sel.value;
  sel.innerHTML=categories.map(c=>`<option>${esc(c.nombre)}</option>`).join("");
  if(categories.some(c=>c.nombre===prev))sel.value=prev;
}
function openCat(cat){
  if(!categoriesReady){toast("Primero ejecuta supabase/migracion_categorias.sql en Supabase.","error");return}
  editingCat=cat||null;
  $("catModalTitle").textContent=cat?"Editar título de la categoría":"Nueva categoría";
  $("catName").value=cat?.nombre||"";
  $("deleteCatBtn").classList.toggle("hidden",!cat);
  openModal("catModal");$("catName").focus();
}
$("newCatBtn").onclick=()=>openCat(null);
$("editCatBtn").onclick=()=>openCat(categories.find(c=>c.nombre===currentCategory));
$("cancelCatBtn").onclick=()=>closeModal("catModal");
$("catModal").onclick=e=>{if(e.target.id==="catModal")closeModal("catModal")};
$("catForm").onsubmit=async e=>{
  e.preventDefault();
  const name=$("catName").value.trim().replace(/\s+/g," ");
  if(!name){toast("Escribe un título.","error");return}
  if(categories.some(c=>c.id!==editingCat?.id&&c.nombre.toLocaleLowerCase("es")===name.toLocaleLowerCase("es"))){toast("Ya existe una categoría con ese título.","error");return}
  const btn=$("saveCatBtn");setBusy(btn,true,"Guardando...");
  let error;
  if(editingCat){
    ({error}=await dbClient.from("categorias").update({nombre:name}).eq("id",editingCat.id));
    if(!error&&currentCategory===editingCat.nombre)currentCategory=name;
  }else{
    const orden=categories.reduce((m,c)=>Math.max(m,c.orden||0),0)+1;
    ({error}=await dbClient.from("categorias").insert({nombre:name,orden}));
    if(!error)currentCategory=name;
  }
  setBusy(btn,false);
  if(error){toast(error.message,"error");return}
  closeModal("catModal");toast("Categoría guardada","okay");await loadAll();
};
$("deleteCatBtn").onclick=async()=>{
  if(!editingCat)return;
  if(books.some(b=>b.categoria===editingCat.nombre)){toast("Solo se pueden eliminar categorías sin libros. Mueve o elimina sus libros primero.","error");return}
  if(!confirm(`¿Eliminar la categoría “${editingCat.nombre}”?`))return;
  const {error}=await dbClient.from("categorias").delete().eq("id",editingCat.id);
  if(error){toast(error.message,"error");return}
  closeModal("catModal");toast("Categoría eliminada","okay");await loadAll();
};
async function loadAll(){await loadCategories();await loadBooks()}
$("adminSearch").addEventListener("input",renderCategory);
$("refreshBtn").onclick=loadAll;
$("newBookBtn").onclick=()=>openBook(null);

function fillFilePreviews(book){
  $("coverPreview").innerHTML=book?.portada_url?`<img src="${esc(book.portada_url)}" alt=""><span>Portada actual almacenada en Supabase.</span>`:"Sin portada actual.";
  $("pdfPreview").innerHTML=book?.muestra_pdf_url?`<span>📄 PDF actual disponible. <a href="${esc(book.muestra_pdf_url)}" target="_blank" rel="noopener">Abrir</a></span>`:"Sin PDF actual.";
}
function openBook(book){
  editingBook=book||null;
  $("bookModalTitle").textContent=book?"Editar libro":"Agregar libro";
  $("bookId").value=book?.id||"";
  $("categoria").value=book?.categoria||currentCategory;
  ["codigo","titulo","autor","genero","precio_caja","unidades_caja","precio_compra","precio_venta","precio_mayor","stock","vendidas","acumulado"].forEach(id=>{
    $(id).value=book?.[id]??(["stock","vendidas","acumulado"].includes(id)?0:"");
  });
  $("activo").value=String(book?.activo??true);
  $("portadaFile").value="";$("pdfFile").value="";$("removeCover").checked=false;$("removePdf").checked=false;
  fillFilePreviews(book);
  openModal("bookModal");
}
$("cancelBookBtn").onclick=()=>closeModal("bookModal");
$("bookModal").onclick=e=>{if(e.target.id==="bookModal")closeModal("bookModal")};
$("portadaFile").onchange=e=>{
  const file=e.target.files[0]; if(!file)return fillFilePreviews(editingBook);
  const url=URL.createObjectURL(file);$("coverPreview").innerHTML=`<img src="${url}" alt=""><span>${esc(file.name)} · ${(file.size/1024).toFixed(0)} KB</span>`;
};
$("pdfFile").onchange=e=>{
  const file=e.target.files[0];$("pdfPreview").textContent=file?`📄 ${file.name} · ${(file.size/1024).toFixed(0)} KB`:"Sin PDF seleccionado.";
};

$("bookForm").onsubmit=async e=>{
  e.preventDefault();
  const btn=$("saveBookBtn");setBusy(btn,true,"Guardando...");
  let newCover=null,newPdf=null;
  try{
    const title=$("titulo").value.trim();
    if(!title)throw new Error("El título es obligatorio.");
    if($("portadaFile").files[0]) newCover=await uploadCover($("portadaFile").files[0],title);
    if($("pdfFile").files[0]) newPdf=await uploadPdf($("pdfFile").files[0],title);

    const payload={
      categoria:$("categoria").value,
      codigo:$("codigo").value.trim()||null,
      titulo:title,
      autor:$("autor").value.trim()||null,
      genero:$("genero").value.trim()||null,
      precio_caja:numOrNull("precio_caja"),
      unidades_caja:numOrNull("unidades_caja"),
      precio_compra:numOrNull("precio_compra"),
      precio_venta:numOrNull("precio_venta"),
      precio_mayor:numOrNull("precio_mayor"),
      stock:intOrZero("stock"),
      vendidas:intOrZero("vendidas"),
      acumulado:Number($("acumulado").value||0),
      activo:$("activo").value==="true"
    };
    if(newCover){payload.portada_path=newCover.path;payload.portada_url=newCover.url}
    if(newPdf){payload.muestra_pdf_path=newPdf.path;payload.muestra_pdf_url=newPdf.url}
    if($("removeCover").checked&&!newCover){payload.portada_path=null;payload.portada_url=null}
    if($("removePdf").checked&&!newPdf){payload.muestra_pdf_path=null;payload.muestra_pdf_url=null}

    let error;
    if(editingBook){
      ({error}=await dbClient.from("libros").update(payload).eq("id",editingBook.id));
    }else{
      ({error}=await dbClient.from("libros").insert(payload));
    }
    if(error)throw error;

    if(editingBook){
      if((newCover||$("removeCover").checked)&&editingBook.portada_path)await removeStorageObject("portadas",editingBook.portada_path);
      if((newPdf||$("removePdf").checked)&&editingBook.muestra_pdf_path)await removeStorageObject("muestras-pdf",editingBook.muestra_pdf_path);
    }
    closeModal("bookModal");toast("Libro guardado correctamente","okay");await loadBooks();
  }catch(err){
    console.error(err);
    if(newCover?.path) await removeStorageObject("portadas",newCover.path);
    if(newPdf?.path) await removeStorageObject("muestras-pdf",newPdf.path);
    toast(err.message||"No se pudo guardar.","error");
  }finally{setBusy(btn,false)}
};

async function deleteBook(book){
  if(!confirm(`¿Eliminar “${book.titulo}”? Esta acción también intentará borrar su portada y PDF de Supabase.`))return;
  const {error}=await dbClient.from("libros").delete().eq("id",book.id);
  if(error){toast(error.message,"error");return}
  await removeStorageObject("portadas",book.portada_path);
  await removeStorageObject("muestras-pdf",book.muestra_pdf_path);
  toast("Libro eliminado","okay");loadBooks();
}

function saleUnitFor(book,qty){
  const normal=Number(book.precio_venta||0);
  const wholesale=Number(book.precio_mayor||0);
  return qty>=10 && wholesale>0 ? wholesale : normal;
}
function openSale(book){
  saleBook=book;
  $("saleQty").value=1;
  $("saleBookInfo").innerHTML=`<b>${esc(book.titulo)}</b><br><span class="hint">Stock disponible: ${Number(book.stock||0)}</span>`;
  calcSale();openModal("saleModal");
}
function calcSale(){
  if(!saleBook)return;
  const qty=Math.max(1,Math.trunc(Number($("saleQty").value||1)));
  const unit=saleUnitFor(saleBook,qty);
  $("saleUnitPrice").value=money(unit);
  $("saleTotal").textContent=`Total: ${money(unit*qty)}${qty>=10&&Number(saleBook.precio_mayor||0)>0?" · Precio por mayor aplicado":""}`;
}
$("saleQty").oninput=calcSale;
$("cancelSaleBtn").onclick=()=>closeModal("saleModal");
$("saleModal").onclick=e=>{if(e.target.id==="saleModal")closeModal("saleModal")};
$("confirmSaleBtn").onclick=async()=>{
  if(!saleBook)return;
  const qty=Math.max(1,Math.trunc(Number($("saleQty").value||1)));
  if(qty>Number(saleBook.stock||0)){toast("Stock insuficiente.","error");return}
  const unit=saleUnitFor(saleBook,qty);
  const payload={
    stock:Number(saleBook.stock||0)-qty,
    vendidas:Number(saleBook.vendidas||0)+qty,
    acumulado:Number(saleBook.acumulado||0)+(unit*qty)
  };
  const {error}=await dbClient.from("libros").update(payload).eq("id",saleBook.id);
  if(error){toast(error.message,"error");return}
  closeModal("saleModal");toast("Venta registrada","okay");loadBooks();
};

$("seedBtn").onclick=async()=>{
  if(books.length){toast("La importación inicial solo funciona con la tabla vacía.","error");return}
  if(!confirm("Se importarán los registros de tu HTML actual y se subirán a Supabase las portadas que estaban incrustadas. ¿Continuar?"))return;
  const btn=$("seedBtn");setBusy(btn,true,"Importando...");
  try{
    const response=await fetch("/data/initial-books.json");
    const rows=await response.json();
    for(let i=0;i<rows.length;i++){
      const source=rows[i];
      $("adminStatus").textContent=`Importando ${i+1} de ${rows.length}: ${source.titulo}`;
      let cover=null;
      if(source.cover_asset){
        const r=await fetch(source.cover_asset);const blob=await r.blob();
        const path=`iniciales/${Date.now()}-${i+1}-${slugify(source.titulo)}.${safeExt({name:source.cover_asset},"jpg")}`;
        const {error:upErr}=await dbClient.storage.from("portadas").upload(path,blob,{contentType:blob.type||"image/jpeg",cacheControl:"3600",upsert:false});
        if(upErr)throw upErr;
        cover={path,url:publicUrl("portadas",path)};
      }
      const payload={
        codigo:source.codigo||null,categoria:source.categoria,titulo:source.titulo,autor:source.autor||null,genero:source.genero||null,
        precio_caja:source.precio_caja,unidades_caja:source.unidades_caja,precio_compra:source.precio_compra,
        precio_venta:source.precio_venta,precio_mayor:source.precio_mayor,stock:source.stock||0,vendidas:source.vendidas||0,
        acumulado:source.acumulado||0,activo:true,
        portada_path:cover?.path||null,portada_url:cover?.url||null
      };
      const {error}=await dbClient.from("libros").insert(payload);
      if(error)throw error;
    }
    $("adminStatus").textContent="Importación completada.";
    toast("Datos del HTML importados correctamente","okay");await loadBooks();
  }catch(err){
    console.error(err);$("adminStatus").textContent="La importación se detuvo por un error.";
    toast(err.message||"No se pudo completar la importación.","error");
  }finally{setBusy(btn,false)}
};

// ---------- Configuración de la librería ----------
async function uploadConfigImage(file,name,maxW,maxH){
  const blob=await optimizeCover(file,maxW,maxH);
  const path=`config/${Date.now()}-${name}.webp`;
  const {error}=await dbClient.storage.from("portadas").upload(path,blob,{contentType:"image/webp",cacheControl:"3600",upsert:false});
  if(error)throw error;
  return {path,url:publicUrl("portadas",path)};
}
function fillSettingsPreviews(){
  const s=window.siteSettings||{};
  $("cfgUbicPreview").innerHTML=s.ubicacion_imagen_url?`<img class="wide" src="${esc(s.ubicacion_imagen_url)}" alt=""><span>Imagen actual.</span>`:"Sin imagen de ubicación.";
  $("cfgLogoPreview").innerHTML=s.logo_url?`<img class="wide" src="${esc(s.logo_url)}" alt=""><span>Logo actual.</span>`:"Sin logo.";
}
async function openSettings(){
  await loadSiteSettings();
  const s=window.siteSettings||{};
  $("cfgWhatsapp").value=s.whatsapp||"";
  $("cfgUbicUrl").value=s.ubicacion_url||"";
  ["cfgUbicFile","cfgLogoFile"].forEach(id=>$(id).value="");
  ["cfgUbicRemove","cfgLogoRemove"].forEach(id=>$(id).checked=false);
  fillSettingsPreviews();openModal("settingsModal");
}
function previewPicked(inputId,boxId){
  $(inputId).onchange=e=>{
    const f=e.target.files[0];if(!f)return fillSettingsPreviews();
    $(boxId).innerHTML=`<img class="wide" src="${URL.createObjectURL(f)}" alt=""><span>${esc(f.name)} · ${(f.size/1024).toFixed(0)} KB</span>`;
  };
}
previewPicked("cfgUbicFile","cfgUbicPreview");previewPicked("cfgLogoFile","cfgLogoPreview");
$("settingsBtn").onclick=openSettings;
$("cancelSettingsBtn").onclick=()=>closeModal("settingsModal");
$("settingsModal").onclick=e=>{if(e.target.id==="settingsModal")closeModal("settingsModal")};
$("settingsForm").onsubmit=async e=>{
  e.preventDefault();
  const btn=$("saveSettingsBtn");setBusy(btn,true,"Guardando...");
  const old=window.siteSettings||{};
  let newLogo=null,newLoc=null;
  try{
    const wa=$("cfgWhatsapp").value.replace(/\D/g,"");
    if(wa&&(wa.length<8||wa.length>15))throw new Error("El número de celular no es válido. Escribe solo dígitos, por ejemplo 67655641 o 59167655641.");
    const link=$("cfgUbicUrl").value.trim();
    if(link&&!/^https?:\/\//i.test(link))throw new Error("El enlace de ubicación debe empezar con http:// o https://");
    if($("cfgLogoFile").files[0])newLogo=await uploadConfigImage($("cfgLogoFile").files[0],"logo",600,300);
    if($("cfgUbicFile").files[0])newLoc=await uploadConfigImage($("cfgUbicFile").files[0],"ubicacion",1600,1600);

    const payload={id:1,whatsapp:wa||null,ubicacion_url:link||null,updated_at:new Date().toISOString()};
    if(newLogo){payload.logo_path=newLogo.path;payload.logo_url=newLogo.url}
    else if($("cfgLogoRemove").checked){payload.logo_path=null;payload.logo_url=null}
    if(newLoc){payload.ubicacion_imagen_path=newLoc.path;payload.ubicacion_imagen_url=newLoc.url}
    else if($("cfgUbicRemove").checked){payload.ubicacion_imagen_path=null;payload.ubicacion_imagen_url=null}

    const {error}=await dbClient.from("configuracion").upsert(payload);
    if(error)throw error;

    if((newLogo||$("cfgLogoRemove").checked)&&old.logo_path)await removeStorageObject("portadas",old.logo_path);
    if((newLoc||$("cfgUbicRemove").checked)&&old.ubicacion_imagen_path)await removeStorageObject("portadas",old.ubicacion_imagen_path);
    await loadSiteSettings();
    closeModal("settingsModal");toast("Configuración guardada","okay");
  }catch(err){
    console.error(err);
    if(newLogo?.path)await removeStorageObject("portadas",newLogo.path);
    if(newLoc?.path)await removeStorageObject("portadas",newLoc.path);
    const missing=/configuracion/i.test(err.message||"");
    toast(missing?"Primero ejecuta supabase/migracion_configuracion.sql en Supabase.":(err.message||"No se pudo guardar."),"error");
  }finally{setBusy(btn,false)}
};

document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){closeModal("bookModal");closeModal("saleModal");closeModal("catModal");closeModal("settingsModal")}
});
init();
