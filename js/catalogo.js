let allBooks=[], categories=[], currentCategory="", currentSelected=null;
const $=id=>document.getElementById(id);
function showConfigWarning(){ $("configWarning").classList.remove("hidden"); }
function money(n){return "Bs. "+Number(n||0).toFixed(2)}
function esc(x){return String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
async function loadCatalog(){
 if(!window.isSupabaseConfigured){showConfigWarning();return}
 loadSiteSettings();
 const [b,c]=await Promise.all([
  dbClient.from("libros").select("id,codigo,categoria,titulo,autor,genero,precio_venta,precio_mayor,stock,portada_url,muestra_pdf_url,activo").eq("activo",true).order("titulo"),
  dbClient.from("categorias").select("nombre").order("orden").order("nombre")
 ]);
 if(b.error){$("resultsMsg").textContent="Error al cargar catálogo";return}
 allBooks=b.data||[];
 // Si aún no existe la tabla de categorías, se usan las categorías que tienen los libros.
 categories=(!c.error&&c.data?.length)?c.data.map(x=>x.nombre):[...new Set(allBooks.map(x=>x.categoria))];
 renderPills(); renderResults();
}
function renderPills(){
 const box=$("categoryPills"); box.innerHTML="";
 [["","Todos"],...categories.map(n=>[n,n])].forEach(([value,label])=>{
  const btn=document.createElement("button");
  btn.textContent=label; if(value===currentCategory)btn.className="active";
  btn.onclick=()=>{currentCategory=value;renderPills();renderResults()};
  box.appendChild(btn);
 });
}
function filteredBooks(){
 const q=$("search").value.trim().toLowerCase();
 return allBooks.filter(b=>{let cat=!currentCategory||b.categoria===currentCategory;let h=[b.codigo,b.titulo,b.autor,b.genero,b.categoria].join(" ").toLowerCase();return cat&&(!q||h.includes(q))})
}
function renderResults(){
 // Volver a la lista: se oculta el detalle y se muestran los libros filtrados.
 currentSelected=null;
 $("previewCard").classList.add("hidden");
 $("resultsSection").classList.remove("hidden");
 $("catalogLayout").classList.remove("single");
 const books=filteredBooks(), grid=$("resultsGrid");
 grid.innerHTML="";
 $("resultCount").textContent=books.length+" libro(s)";
 $("resultsMsg").textContent=books.length?"Seleccione un libro para ver detalles":"No hay resultados";
 books.forEach(b=>{
  let c=document.createElement("div"); c.className="bookCard"; c.tabIndex=0; c.setAttribute("role","button");
  c.setAttribute("aria-label","Ver "+b.titulo);
  c.innerHTML=`<img src="${esc(b.portada_url||'')}" alt="" onerror="this.style.display='none'"><b>${esc(b.titulo)}</b><small>${esc(b.autor||'')}</small>`;
  c.onclick=()=>selectBook(b);
  c.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectBook(b)}};
  grid.appendChild(c);
 });
}
function selectBook(book){
 currentSelected=book;
 // Solo se muestra el libro elegido: se oculta el resto de la lista.
 $("resultsSection").classList.add("hidden");
 $("catalogLayout").classList.add("single");
 $("previewCard").classList.remove("hidden");
 $("imageWrap").innerHTML=book.portada_url
  ?`<img id="imageArea" src="${esc(book.portada_url)}" alt="Portada de ${esc(book.titulo)}">`
  :`<div class="noimg">Sin imagen disponible</div>`;
 const disponible=Number(book.stock)>0;
 $("previewInfo").innerHTML=`
 <h2>${esc(book.titulo)}</h2>
 <p><b>Autor:</b> ${esc(book.autor||'')}</p>
 <p><b>Código:</b> ${esc(book.codigo||'')}</p>
 <p><b>Estado:</b> <span class="badge ${disponible?'ok':'out'}">${disponible?'Disponible':'Agotado'}</span></p>
 <div class="orangeButtons">
 <button class="btn orange" onclick="openWhatsapp()">🟢 WhatsApp</button>
 <button class="btn orange" ${book.muestra_pdf_url?'':'disabled'} onclick="openPdf()">📄 Muestra</button>
 <button class="btn orange" onclick="openLocation()">📍 Ubicación</button>
 </div>`;
 window.scrollTo({top:0,behavior:"smooth"});
}
function openWhatsapp(){
 let b=currentSelected;
 let msg=`Hola, deseo cotizar este libro:\n\nTítulo: ${b.titulo}\nAutor: ${b.autor||''}\nCódigo: ${b.codigo||''}\nPrecio: ${money(b.precio_venta)}`;
 window.open("https://wa.me/"+waNumber()+"?text="+encodeURIComponent(msg),"_blank");
}
function openLocation(){
 const s=window.siteSettings||{};
 if(s.ubicacion_imagen_url){
  $("locImg").src=s.ubicacion_imagen_url;
  const a=$("locLink");
  if(s.ubicacion_url){a.href=s.ubicacion_url;a.classList.remove("hidden")}else{a.classList.add("hidden")}
  $("locModal").classList.add("open");
  return;
 }
 if(s.ubicacion_url){window.open(s.ubicacion_url,"_blank","noopener");return}
 toast("La ubicación aún no está disponible.","error");
}
function closeLocation(){$("locModal").classList.remove("open")}
function openPdf(){if(currentSelected?.muestra_pdf_url){$("pdfFrame").src=currentSelected.muestra_pdf_url;$("pdfModal").classList.add("open")}}
function closePdf(){$("pdfModal").classList.remove("open");$("pdfFrame").src=""}
$("searchBtn").onclick=renderResults;$("search").oninput=renderResults;
$("backBtn").onclick=renderResults;
$("closePdf").onclick=closePdf;
$("closeLoc").onclick=closeLocation;
$("locModal").onclick=e=>{if(e.target.id==="locModal")closeLocation()};
loadCatalog();
