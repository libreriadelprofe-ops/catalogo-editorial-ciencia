// Lógica de catálogo actualizada
const buscador = document.getElementById('buscador-libros');
const grilla = document.getElementById('grilla-libros');
const detalle = document.getElementById('detalle-libro');
const contenido = document.getElementById('contenido-detalle');
const btnVolver = document.getElementById('btn-volver');

// Ejemplo: Esta variable debe llenarse con tu petición a Supabase
let todosLosLibros = []; 

buscador.addEventListener('input', (e) => {
    const texto = e.target.value.toLowerCase();
    const filtrados = todosLosLibros.filter(l => 
        l.titulo.toLowerCase().includes(texto) || 
        l.autor.toLowerCase().includes(texto)
    );
    // renderizarGrilla(filtrados); // Llama a tu función de renderizado
});

// Llamar a esta función al hacer clic en un libro
function mostrarDetalleLibro(libro) {
    grilla.style.display = 'none';
    buscador.style.display = 'none';
    detalle.style.display = 'block';
    
    let htmlDetalle = `<h2>${libro.titulo}</h2>`;
    // htmlDetalle += `<p>Categoría: ${libro.categorias.nombre}</p>`;
    
    if(libro.ubicacion_img) {
        htmlDetalle += `
        <div class="ubicacion-container">
            <h3>Ubicación</h3>
            <img src="${libro.ubicacion_img}" alt="Ubicación del libro" style="max-width: 100%;">
        </div>`;
    }
    
    contenido.innerHTML = htmlDetalle;
}

btnVolver.addEventListener('click', () => {
    detalle.style.display = 'none';
    grilla.style.display = 'block'; // o grid/flex
    buscador.style.display = 'block';
});