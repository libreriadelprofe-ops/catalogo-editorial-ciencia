
let allBooks=[], currentCategory="", currentSelected=null;
const $=id=>document.getElementById(id);
function showConfigWarning(){ $("configWarning").classList.remove("hidden"); }
function money(n){return "Bs. "+Number(n||0).toFixed(2)}
function esc(x){return String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
async function loadCatalog(){
 if(!window.isSupabaseConfigured){showConfigWarning();return}
 const {data,error}=await dbClient.from("libros").select("id,codigo,categoria,titulo,autor,genero,precio_venta,precio_mayor,stock,portada_url,muestra_pdf_url,activo").eq("activo",true).order("titulo");
 if(error){$("resultsMsg").textContent="Error al cargar catálogo";return}
 allBooks=data||[]; renderResults();
}
function filteredBooks(){
 const q=$("search").value.trim().toLowerCase();
 return allBooks.filter(b=>{let cat=!currentCategory||b.categoria===currentCategory;let h=[b.codigo,b.titulo,b.autor,b.genero,b.categoria].join(" ").toLowerCase();return cat&&(!q||h.includes(q))})
}
function renderResults(){
 const books=filteredBooks(), grid=$("resultsGrid");
 grid.innerHTML="";
 $("resultCount").textContent=books.length+" libro(s)";
 $("resultsMsg").textContent=books.length?"Seleccione un libro para ver detalles":"No hay resultados";
 books.forEach(b=>{
  let c=document.createElement("div"); c.className="bookCard";
  c.innerHTML=`<img src="${esc(b.portada_url||'')}" onerror="this.style.display='none'"><b>${esc(b.titulo)}</b><small>${esc(b.autor||'')}</small>`;
  c.onclick=()=>selectBook(b); grid.appendChild(c);
 });
 $("previewCard").classList.add("hidden");
}
function selectBook(book){
 currentSelected=book;
 $("previewCard").classList.remove("hidden");
 $("imageArea").outerHTML=`<img id="imageArea" src="${esc(book.portada_url||'')}" alt="Portada">`;
 $("previewInfo").innerHTML=`
 <h2>${esc(book.titulo)}</h2>
 <p><b>Autor:</b> ${esc(book.autor||'')}</p>
 <p><b>Código:</b> ${esc(book.codigo||'')}</p>
 <p><b>Estado:</b> ${Number(book.stock)>0?'Disponible':'Agotado'}</p>
 <div class="orangeButtons">
 <button class="btn orange" onclick="openWhatsapp()">🟢 WhatsApp</button>
 <button class="btn orange" ${book.muestra_pdf_url?'':'disabled'} onclick="openPdf()">📄 Muestra</button>
 </div>`;
}
function openWhatsapp(){
 let b=currentSelected;
 let msg=`Hola, deseo cotizar este libro:%0A%0ATítulo: ${b.titulo}%0AAutor: ${b.autor}%0ACódigo: ${b.codigo}%0APrecio: ${money(b.precio_venta)}`;
 window.open("https://wa.me/59167655641?text="+msg,"_blank");
}
function openPdf(){if(currentSelected?.muestra_pdf_url){$("pdfFrame").src=currentSelected.muestra_pdf_url;$("pdfModal").classList.add("open")}}
function closePdf(){$("pdfModal").classList.remove("open");$("pdfFrame").src=""}
$("searchBtn").onclick=renderResults;$("search").oninput=renderResults;
document.querySelectorAll("#categoryPills button").forEach(b=>b.onclick=()=>{document.querySelectorAll("#categoryPills button").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentCategory=b.dataset.category;renderResults()});
$("closePdf").onclick=closePdf;
loadCatalog();
