
let allBooks=[];
let currentCategory="";
let currentSelected=null;

const $=id=>document.getElementById(id);

function showConfigWarning(){
  $("configWarning").classList.remove("hidden");
  $("resultsMsg").textContent="Configura Supabase para cargar el catálogo.";
}

async function loadCatalog(){
  if(!window.isSupabaseConfigured){showConfigWarning();return}
  $("resultsMsg").innerHTML='<div class="loading"><span class="spinner"></span>Cargando libros...</div>';
  const {data,error}=await dbClient.from("libros")
    .select("id,codigo,categoria,titulo,autor,genero,precio_venta,precio_mayor,stock,portada_url,muestra_pdf_url,activo")
    .eq("activo",true).order("titulo",{ascending:true});
  if(error){
    console.error(error);$("resultsMsg").textContent="No se pudo cargar el catálogo.";toast(error.message,"error");return;
  }
  allBooks=data||[];
  renderResults();
}

function filteredBooks(){
  const q=$("search").value.trim().toLocaleLowerCase("es");
  return allBooks.filter(b=>{
    const categoryOk=!currentCategory || b.categoria===currentCategory;
    const haystack=[b.codigo,b.titulo,b.autor,b.genero,b.categoria].join(" ").toLocaleLowerCase("es");
    return categoryOk && (!q || haystack.includes(q));
  });
}

function renderResults(){
  const books=filteredBooks();
  const tbody=$("resultsTable").querySelector("tbody");
  tbody.innerHTML="";
  $("resultCount").textContent=books.length+" resultado(s)";
  if(!books.length){
    $("resultsTable").classList.add("hidden");
    $("resultsMsg").textContent="No se encontraron obras con ese criterio.";
    clearSelection();
    return;
  }
  $("resultsMsg").textContent="Selecciona una obra para ver sus detalles.";
  $("resultsTable").classList.remove("hidden");
  books.forEach((b,i)=>{
    const tr=document.createElement("tr");tr.className="resultRow";tr.dataset.id=b.id;
    tr.innerHTML=`<td>${esc(b.codigo||"—")}</td><td><b>${esc(b.titulo)}</b></td><td>${esc(b.autor||"—")}</td>
      <td>${money(b.precio_venta)}</td>
      <td>${Number(b.stock||0)>0?`<span class="badge ok">${Number(b.stock)} disp.</span>`:`<span class="badge out">Agotado</span>`}</td>
      <td>${esc(b.categoria)}</td>`;
    tr.onclick=()=>selectBook(b,tr);
    tbody.appendChild(tr);
  });
  if(books.length){
    const first=tbody.querySelector("tr");
    selectBook(books[0],first);
  }
}

function clearSelection(){
  currentSelected=null;
  document.querySelectorAll(".resultRow").forEach(r=>r.classList.remove("selected"));
  $("imageArea").outerHTML='<div id="imageArea" class="noimg">Sin imagen disponible</div>';
  $("previewInfo").innerHTML='<h2>Selecciona una obra</h2><p class="muted">Aquí se mostrará la información del libro.</p>';
}

function selectBook(book,row){
  currentSelected=book;
  document.querySelectorAll(".resultRow").forEach(r=>r.classList.remove("selected"));
  if(row) row.classList.add("selected");
  const area=$("imageArea");
  if(book.portada_url){
    area.outerHTML=`<img id="imageArea" src="${esc(book.portada_url)}" alt="Portada de ${esc(book.titulo)}" onerror="this.outerHTML='<div id=&quot;imageArea&quot; class=&quot;noimg&quot;>Imagen no disponible</div>'">`;
  }else{
    area.outerHTML='<div id="imageArea" class="noimg">Sin imagen disponible</div>';
  }
  const available=Number(book.stock||0)>0;
  $("previewInfo").innerHTML=`
    <h2>${esc(book.titulo)}</h2>
    <p><b>Autor:</b> ${esc(book.autor||"—")}</p>
    <p><b>Código:</b> ${esc(book.codigo||"—")}</p>
    <p><b>Categoría:</b> ${esc(book.categoria)}</p>
    <p><b>Género:</b> ${esc(book.genero||"—")}</p>
    <p><b>Precio:</b> ${money(book.precio_venta)}</p>
    <p><b>Estado:</b> ${available?'<span class="badge ok">DISPONIBLE</span>':'<span class="badge out">AGOTADO</span>'}</p>
    <p><b>Stock:</b> ${Number(book.stock||0)}</p>
    <div class="toolbar" style="margin-top:16px">
      <button class="btn primary" id="viewPdfBtn" ${book.muestra_pdf_url?"":"disabled"}>📖 Ver índice / muestra</button>
    </div>
    ${book.muestra_pdf_url?"":'<p class="hint">Este libro todavía no tiene PDF de muestra.</p>'}`;
  const btn=$("viewPdfBtn");
  if(btn && book.muestra_pdf_url) btn.onclick=()=>openPdf(book);
}

function openPdf(book){
  $("pdfTitle").textContent="Muestra — "+book.titulo;
  $("pdfFrame").src=book.muestra_pdf_url;
  $("pdfModal").classList.add("open");
}
function closePdf(){
  $("pdfModal").classList.remove("open");$("pdfFrame").src="";
}

$("searchBtn").onclick=renderResults;
$("search").addEventListener("input",renderResults);
$("search").addEventListener("keydown",e=>{if(e.key==="Enter")renderResults()});
document.querySelectorAll("#categoryPills button").forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll("#categoryPills button").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");currentCategory=btn.dataset.category;renderResults();
  };
});
$("closePdf").onclick=closePdf;
$("pdfModal").onclick=e=>{if(e.target.id==="pdfModal")closePdf()};
document.addEventListener("keydown",e=>{if(e.key==="Escape")closePdf()});
loadCatalog();
