// Usar dbClient para conectar con tu configuración de supabase-client.js

async function cargarCategorias() {
    if(!window.isSupabaseConfigured){
        console.error("Supabase no está configurado. Revisa tu js/config.js");
        return;
    }

    const { data: categorias, error } = await dbClient.from('categorias').select('*').order('nombre');
    
    if (error) {
        console.error("Error cargando categorías:", error);
        return;
    }

    const select = document.getElementById('categoria-libro');
    const lista = document.getElementById('lista-categorias');
    select.innerHTML = '';
    lista.innerHTML = '';

    categorias.forEach(cat => {
        select.innerHTML += `<option value="${cat.nombre}">${cat.nombre}</option>`;
        lista.innerHTML += `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee;">
                <span>${cat.nombre}</span>
                <button class="btn" onclick="editarCategoria(${cat.id}, '${cat.nombre}')">Editar</button>
            </li>`;
    });
}

document.getElementById('btn-agregar-categoria').addEventListener('click', async () => {
    const nombre = document.getElementById('nueva-categoria').value.trim();
    if (nombre) {
        const { error } = await dbClient.from('categorias').insert([{ nombre }]);
        if(error) {
            alert("Error al guardar: " + error.message);
        } else {
            document.getElementById('nueva-categoria').value = '';
            cargarCategorias();
            alert("Categoría agregada con éxito.");
        }
    }
});

async function editarCategoria(id, nombreActual) {
    const nuevoNombre = prompt("Editar nombre de la categoría:", nombreActual);
    if (nuevoNombre && nuevoNombre !== nombreActual) {
        const { error } = await dbClient.from('categorias').update({ nombre: nuevoNombre }).eq('id', id);
        if(error){
             alert("Error al actualizar: " + error.message);
        } else {
            cargarCategorias();
            alert("Categoría actualizada.");
        }
    }
}

document.getElementById('form-libro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = document.getElementById('titulo-libro').value;
    const categoria = document.getElementById('categoria-libro').value; 
    const archivo = document.getElementById('ubicacion-img').files[0];
    let urlUbicacion = null;

    if (archivo) {
        const fileExt = archivo.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data, error } = await dbClient.storage
            .from('imagenes-ubicacion')
            .upload(`ubicaciones/${fileName}`, archivo);
            
        if (error) {
            alert("Error subiendo la imagen: " + error.message);
            return;
        }
        urlUbicacion = dbClient.storage.from('imagenes-ubicacion').getPublicUrl(data.path).data.publicUrl;
    }

    const { error: errorLibro } = await dbClient.from('libros').insert([
        { 
            titulo: titulo,
            categoria: categoria,
            ubicacion_img: urlUbicacion,
            activo: true // Aseguramos que se cree como activo para que aparezca en el catálogo
        }
    ]);

    if(errorLibro) {
        alert("Error guardando el libro: " + errorLibro.message);
    } else {
        alert("¡Libro guardado exitosamente!");
        document.getElementById('form-libro').reset();
    }
});

// Cargar categorías automáticamente al entrar a la página
window.onload = cargarCategorias;
