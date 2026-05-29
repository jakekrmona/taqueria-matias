const listaOrdenes = document.getElementById('listaOrdenes');

async function cargarOrdenes() {
  const respuesta = await fetch('/api/ordenes');
  const ordenes = await respuesta.json();

  listaOrdenes.innerHTML = '';

  if (ordenes.length === 0) {
    listaOrdenes.innerHTML = `
      <div class="orders-card">
        Todavía no hay órdenes.
      </div>
    `;
    return;
  }

  ordenes.forEach(orden => {
    const productosHTML = orden.productos.map(producto => {
      return `<li>${producto.cantidad} x ${producto.nombre}</li>`;
    }).join('');

    listaOrdenes.innerHTML += `
      <article class="orders-card">
        <div class="d-flex justify-content-between gap-3 flex-wrap">
          <div>
            <h3 class="fw-bold mb-1">#${orden.folio || '---'} · ${orden.cliente}</h3>
            <span class="badge text-bg-warning rounded-pill">${orden.estado}</span>
            <p class="mt-2 mb-0">${orden.fecha}</p>
          </div>

          <h3 class="text-warning fw-bold">$${orden.total}</h3>
        </div>

        <hr>

        <ul>${productosHTML}</ul>

        ${orden.notas ? `<p><strong>Notas:</strong> ${orden.notas}</p>` : ''}
      </article>
    `;
  });
}

cargarOrdenes();
setInterval(cargarOrdenes, 3000);