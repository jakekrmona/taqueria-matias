let folioSeleccionado = null;
let carritoManual = [];
let productosAdmin = [];
let ultimaOrdenDetectada = null;
let hayOrdenesNuevas = false;

const sonidoOrden = new Audio('/sounds/campana.mp3');
sonidoOrden.preload = 'auto';
sonidoOrden.volume = 1;

let audioDesbloqueado = false;

function desbloquearAudio() {
  if (audioDesbloqueado) return;

  sonidoOrden.play()
    .then(() => {
      sonidoOrden.pause();
      sonidoOrden.currentTime = 0;
      audioDesbloqueado = true;
      console.log('Audio desbloqueado');
    })
    .catch(error => {
      console.log('Audio todavía bloqueado:', error);
    });
}

function reproducirSonidoOrden() {
  if (!audioDesbloqueado) {
    console.log('Audio no desbloqueado todavía');
    return;
  }

  sonidoOrden.currentTime = 0;

  sonidoOrden.play().catch(error => {
    console.log('No se pudo reproducir:', error);
  });
}

document.addEventListener('click', desbloquearAudio, { once: true });
document.addEventListener('touchstart', desbloquearAudio, { once: true });

function mostrarNotificacionOrdenes() {
  const badge = document.getElementById('badgeOrdenesNuevas');
  if (badge) badge.classList.remove('d-none');
}

function ocultarNotificacionOrdenes() {
  const badge = document.getElementById('badgeOrdenesNuevas');
  if (badge) badge.classList.add('d-none');
}

function abrirVistaOrdenes(boton) {
  hayOrdenesNuevas = false;
  ocultarNotificacionOrdenes();
  cambiarVistaAdmin('vistaOrdenes', boton);
}

function cambiarVistaAdmin(idVista, boton) {
  localStorage.setItem('vistaAdminActiva', idVista);

  document.querySelectorAll('.admin-view').forEach(vista => {
    vista.classList.add('d-none');
  });

  document.getElementById(idVista).classList.remove('d-none');

  document.querySelectorAll('.admin-nav').forEach(nav => {
    nav.classList.remove('active');
  });

  boton.classList.add('active');
}

async function cargarOrdenesAdmin() {
  const respuesta = await fetch('/api/ordenes');
  const ordenes = await respuesta.json();

  if (ordenes.length > 0) {
  const ordenMasNueva = Math.max(...ordenes.map(orden => Number(orden.id)));

  if (ultimaOrdenDetectada && ordenMasNueva > ultimaOrdenDetectada) {
    const vistaOrdenesAbierta = !document
      .getElementById('vistaOrdenes')
      .classList
      .contains('d-none');

    if (!vistaOrdenesAbierta) {
      hayOrdenesNuevas = true;
      mostrarNotificacionOrdenes();
    }

    reproducirSonidoOrden();
  }

  ultimaOrdenDetectada = ordenMasNueva;
}

  const contenedor = document.getElementById('listaOrdenesAdmin');
  contenedor.innerHTML = '';

  if (ordenes.length === 0) {
    contenedor.innerHTML = `<div class="admin-card">Todavía no hay órdenes.</div>`;
    return;
  }

  const ordenesOrdenadas = ordenes.sort((a, b) => {
    if (a.estado === 'Completado' && b.estado !== 'Completado') return 1;
    if (a.estado !== 'Completado' && b.estado === 'Completado') return -1;
    return a.id - b.id;
  });

  ordenesOrdenadas.forEach(orden => {
    const completada = orden.estado === 'Completado';

    const productosHTML = orden.productos.map(producto => {
      return `<li>${producto.cantidad} x ${producto.nombre}</li>`;
    }).join('');

    contenedor.innerHTML += `
      <article class="admin-card order-admin-card ${completada ? 'order-completed' : ''}">
        <div class="d-flex justify-content-between gap-3 flex-wrap">
          <div>
            <h3 class="fw-bold">#${orden.folio || '---'} · ${orden.cliente}</h3>

            <span class="badge rounded-pill ${completada ? 'text-bg-success' : 'text-bg-warning'}">
              ${completada ? 'Completado' : 'Pendiente'}
            </span>

            <p class="mt-2 mb-0">${orden.fecha}</p>
          </div>

          <h3 class="text-warning fw-bold">$${orden.total}</h3>
        </div>

        <hr>

        <ul>${productosHTML}</ul>

        ${orden.notas ? `<p><strong>Notas:</strong> ${orden.notas}</p>` : ''}

        ${
          completada
            ? `<div class="completed-mark"><i class="bi bi-check-lg"></i></div>`
            : `
              <button class="complete-order-btn" onclick="completarOrden(${orden.id})">
                <i class="bi bi-check-lg"></i>
              </button>
            `
        }
      </article>
    `;
  });
}

async function completarOrden(idOrden) {
  await fetch(`/api/ordenes/${idOrden}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'Completado' })
  });

  cargarOrdenesAdmin();
}

async function cargarProductosAdmin() {
  const respuesta = await fetch('/api/productos');
  const productos = await respuesta.json();

  productos.sort((a, b) => (a.orden || 0) - (b.orden || 0));

  const contenedor = document.getElementById('listaProductosAdmin');
  contenedor.innerHTML = '';

  productos.forEach(producto => {
    contenedor.innerHTML += `
      <article class="admin-card">
        <div class="row align-items-center g-3">
          <div class="col-md-3">
            <input class="form-control rounded-4" id="nombre-${producto.id}" value="${producto.nombre}">
          </div>

          <div class="col-md-2">
            <input class="form-control rounded-4" id="precio-${producto.id}" type="number" value="${producto.precio}">
          </div>

          <div class="col-md-2">
            <input class="form-control rounded-4" id="categoria-${producto.id}" value="${producto.categoria}">
          </div>

          <div class="col-md-3">
            <input class="form-control rounded-4" id="descripcion-${producto.id}" value="${producto.descripcion}">
          </div>

          <div class="col-md-2">
            <div class="form-check form-switch mb-2">
              <input
                class="form-check-input"
                type="checkbox"
                ${producto.disponible ? 'checked' : ''}
                onchange="cambiarDisponibilidad(${producto.id}, this.checked)"
              >
              <label class="form-check-label">${producto.disponible ? 'Activo' : 'Inactivo'}</label>
            </div>

            <div class="d-flex gap-2 mb-2">
              <button class="btn btn-outline-warning btn-sm rounded-4 w-50 fw-bold" onclick="moverProducto(${producto.id}, 'arriba')">
                <i class="bi bi-arrow-up"></i>
              </button>

              <button class="btn btn-outline-warning btn-sm rounded-4 w-50 fw-bold" onclick="moverProducto(${producto.id}, 'abajo')">
                <i class="bi bi-arrow-down"></i>
              </button>
            </div>

            <button class="btn btn-warning btn-sm rounded-4 w-100 mb-2 fw-bold" onclick="guardarCambios(${producto.id})">
              Guardar
            </button>

            <button class="btn btn-outline-danger btn-sm rounded-4 w-100" onclick="eliminarProducto(${producto.id})">
              Eliminar
            </button>
          </div>
        </div>
      </article>
    `;
  });
}

async function agregarProducto() {
  const nuevoProducto = {
    nombre: document.getElementById('nombreProducto').value.trim(),
    precio: Number(document.getElementById('precioProducto').value),
    categoria: document.getElementById('categoriaProducto').value.trim(),
    descripcion: document.getElementById('descripcionProducto').value.trim()
  };

  await fetch('/api/productos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nuevoProducto)
  });

  document.getElementById('nombreProducto').value = '';
  document.getElementById('precioProducto').value = '';
  document.getElementById('categoriaProducto').value = '';
  document.getElementById('descripcionProducto').value = '';

  cargarProductosAdmin();
  cargarTomarOrden();
}

async function guardarCambios(id) {
  const productoActualizado = {
    nombre: document.getElementById(`nombre-${id}`).value.trim(),
    precio: Number(document.getElementById(`precio-${id}`).value),
    categoria: document.getElementById(`categoria-${id}`).value.trim(),
    descripcion: document.getElementById(`descripcion-${id}`).value.trim()
  };

  await fetch(`/api/productos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productoActualizado)
  });

  cargarProductosAdmin();
  cargarTomarOrden();
}

async function cambiarDisponibilidad(id, disponible) {
  await fetch(`/api/productos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disponible })
  });

  cargarProductosAdmin();
  cargarTomarOrden();
}

async function eliminarProducto(id) {
  await fetch(`/api/productos/${id}`, { method: 'DELETE' });

  cargarProductosAdmin();
  cargarTomarOrden();
}

async function moverProducto(id, direccion) {
  await fetch(`/api/productos/${id}/mover`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ direccion })
  });

  cargarProductosAdmin();
  cargarTomarOrden();
}

async function cargarCuentasAdmin() {
  const respuesta = await fetch('/api/cuentas');
  const cuentas = await respuesta.json();

  const abiertas = cuentas.filter(cuenta => cuenta.estado === 'abierta');
  const contenedor = document.getElementById('listaCuentasAdmin');

  contenedor.innerHTML = '';

  if (abiertas.length === 0) {
    contenedor.innerHTML = `<p class="text-secondary mb-0">No hay cuentas abiertas.</p>`;
    return;
  }

  abiertas.forEach(cuenta => {
    const activa = cuenta.folio === folioSeleccionado;

    contenedor.innerHTML += `
<button
  data-folio="${cuenta.folio}"
  class="admin-mini-card cuenta-folio-card text-start text-white ${activa ? 'active' : ''}"
  onclick="verDetalleCuenta('${cuenta.folio}')"
>
        <h4 class="fw-bold mb-1">#${cuenta.folio} · ${cuenta.cliente}</h4>
        <p class="mb-0">Total: <strong>$${cuenta.total}</strong></p>
      </button>
    `;
  });
}

function marcarFolioActivo() {
  document.querySelectorAll('.cuenta-folio-card').forEach(card => {
    card.classList.remove('active');
  });

  const cardActiva = document.querySelector(
    `.cuenta-folio-card[data-folio="${folioSeleccionado}"]`
  );

  if (cardActiva) {
    cardActiva.classList.add('active');
  }
}

async function verDetalleCuenta(folio) {
  folioSeleccionado = folio;
  marcarFolioActivo();

  const respuesta = await fetch(`/api/cuentas/${folio}/detalle`);
  const datos = await respuesta.json();

  const detalle = document.getElementById('detalleCuentaAdmin');

  const productosHTML = datos.productosAcumulados.map(producto => {
    return `
      <div class="detalle-producto-item">
        <span>${producto.cantidad} x ${producto.nombre}</span>
        <strong>$${producto.subtotal}</strong>
      </div>
    `;
  }).join('');

  detalle.innerHTML = `
    <div class="cuenta-detail-layout">

      <div class="cuenta-detail-header">
        <h2 class="fw-bold mb-1">
          Detalle #${datos.cuenta.folio} · ${datos.cuenta.cliente}
        </h2>
        <p class="text-secondary mb-0">${datos.cuenta.fechaApertura}</p>
      </div>

      <div class="detalle-productos-scroll">
        <div id="productosDetalleCuenta">
          ${productosHTML}
        </div>
      </div>

<div class="cuenta-detail-footer">
  <div class="payment-summary-row">
    <h2 class="text-warning fw-bold mb-0">
      Total: $<span id="totalDetalleCuenta">${datos.cuenta.total}</span>
    </h2>

    <div class="payment-method-buttons">
      <button id="btnPagoEfectivo" class="btn btn-outline-warning rounded-4 fw-bold" onclick="mostrarPagoEfectivo()">
        Efectivo
      </button>

      <button id="btnPagoTransferencia" class="btn btn-outline-warning rounded-4 fw-bold" onclick="mostrarConfirmacionPago('${datos.cuenta.folio}', 'Transferencia')">
        Transferencia
      </button>

      <button id="btnPagoTarjeta" class="btn btn-outline-warning rounded-4 fw-bold" onclick="mostrarConfirmacionPago('${datos.cuenta.folio}', 'Tarjeta')">
        Tarjeta
      </button>
    </div>
  </div>

  <div id="panelPago" class="payment-action-card d-none"></div>
</div>

    </div>
  `;
}

function seleccionarMetodoPago(metodoPago) {
  const botones = {
    efectivo: document.getElementById('btnPagoEfectivo'),
    transferencia: document.getElementById('btnPagoTransferencia'),
    tarjeta: document.getElementById('btnPagoTarjeta')
  };

  Object.values(botones).forEach(boton => {
    if (!boton) return;

    boton.classList.remove('btn-warning');
    boton.classList.add('btn-outline-warning');
  });

  if (botones[metodoPago]) {
    botones[metodoPago].classList.remove('btn-outline-warning');
    botones[metodoPago].classList.add('btn-warning');
  }
}

function mostrarPagoEfectivo() {
  seleccionarMetodoPago('efectivo');

  const panelPago = document.getElementById('panelPago');
  const total = Number(document.getElementById('totalDetalleCuenta').textContent || 0);

  if (!panelPago) return;

  panelPago.classList.remove('d-none');

  panelPago.innerHTML = `
    <input
      id="montoRecibido"
      type="tel"
      inputmode="numeric"
      class="form-control no-spinner"
      placeholder="Recibido"
      oninput="calcularCambio()"
    >

    <strong id="textoCambio" class="text-danger">
      Faltan: $${total}
    </strong>

    <button
      type="button"
      class="btn btn-warning payment-check-btn"
      onclick="cerrarCuenta('${folioSeleccionado}', 'efectivo')"
    >
      <i class="bi bi-check-lg"></i>
    </button>
  `;

  document.getElementById('montoRecibido').focus();
}

function calcularCambio() {
  const inputMonto = document.getElementById('montoRecibido');
  const textoCambio = document.getElementById('textoCambio');
  const totalDetalle = document.getElementById('totalDetalleCuenta');

  if (!inputMonto || !textoCambio || !totalDetalle) return;

  const total = Number(totalDetalle.textContent || 0);
  const monto = Number(inputMonto.value || 0);
  const cambio = monto - total;

  if (cambio >= 0) {
    textoCambio.textContent = `Cambio: $${cambio}`;
    textoCambio.classList.remove('text-danger');
    textoCambio.classList.add('text-warning');
  } else {
    textoCambio.textContent = `Faltan: $${Math.abs(cambio)}`;
    textoCambio.classList.remove('text-warning');
    textoCambio.classList.add('text-danger');
  }
}

function mostrarConfirmacionPago(folio, metodoPago) {
  metodoPago = metodoPago.toLowerCase();

  seleccionarMetodoPago(metodoPago);

  const panelPago = document.getElementById('panelPago');
  if (!panelPago) return;

  panelPago.classList.remove('d-none');

  panelPago.innerHTML = `
    <strong class="payment-method-text">
      Método: ${metodoPago}
    </strong>

    <button
      type="button"
      class="btn btn-warning payment-check-btn"
      onclick="cerrarCuenta('${folio}', '${metodoPago}')"
    >
      <i class="bi bi-check-lg"></i>
    </button>
  `;
}

async function actualizarDetalleSeleccionado() {
  if (!folioSeleccionado) return;

  const totalDetalle = document.getElementById('totalDetalleCuenta');
  const productosDetalle = document.getElementById('productosDetalleCuenta');

  if (!totalDetalle || !productosDetalle) return;

  const respuesta = await fetch(`/api/cuentas/${folioSeleccionado}/detalle`);

  if (!respuesta.ok) return;

  const datos = await respuesta.json();

  if (datos.cuenta.estado !== 'abierta') return;

  totalDetalle.textContent = datos.cuenta.total;

productosDetalle.innerHTML = datos.productosAcumulados.map(producto => {
  return `
    <div class="detalle-producto-item">
      <span>${producto.cantidad} x ${producto.nombre}</span>
      <strong>$${producto.subtotal}</strong>
    </div>
  `;
}).join('');

  calcularCambio();
}

async function cerrarCuenta(folio, metodoPago) {
  metodoPago = metodoPago.toLowerCase();

  const inputMonto = document.getElementById('montoRecibido');

const totalCuenta = Number(
  document.getElementById('totalDetalleCuenta')?.textContent || 0
);

const montoRecibido =
  metodoPago === 'efectivo' && inputMonto
    ? Number(inputMonto.value || 0)
    : 0;

if (metodoPago === 'efectivo') {
  if (!montoRecibido || montoRecibido < totalCuenta) {
    inputMonto.classList.add('is-invalid');
    inputMonto.focus();
    return;
  }

  inputMonto.classList.remove('is-invalid');
}

  const respuesta = await fetch(`/api/cuentas/${folio}/cerrar`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metodoPago, montoRecibido })
  });

  const cuenta = await respuesta.json();

  folioSeleccionado = null;

  document.getElementById('detalleCuentaAdmin').innerHTML = `
    <div class="success-box">
      <div class="success-check"><i class="bi bi-check-lg"></i></div>
      <h3>Cuenta cerrada</h3>
      <p>#${cuenta.folio} · ${cuenta.cliente}</p>
      <h2 class="text-warning fw-bold">Total: $${cuenta.total}</h2>
      <p>Método: ${cuenta.metodoPago}</p>
      ${cuenta.metodoPago === 'efectivo' ? `<p>Cambio: $${cuenta.cambio}</p>` : ''}
    </div>
  `;

  cargarCuentasAdmin();
  cargarBalanceAdmin();
}

async function cargarBalanceAdmin() {
  const respuestaCuentas = await fetch('/api/cuentas');
  const cuentas = await respuestaCuentas.json();

  const respuestaOrdenes = await fetch('/api/ordenes');
  const ordenes = await respuestaOrdenes.json();

  const cerradas = cuentas.filter(cuenta => cuenta.estado === 'cerrada');

  const total = cerradas.reduce((suma, cuenta) => suma + cuenta.total, 0);

  const efectivo = cerradas
    .filter(cuenta => cuenta.metodoPago === 'efectivo')
    .reduce((suma, cuenta) => suma + cuenta.total, 0);

  const transferencia = cerradas
    .filter(cuenta => cuenta.metodoPago === 'transferencia')
    .reduce((suma, cuenta) => suma + cuenta.total, 0);

  const tarjeta = cerradas
    .filter(cuenta => cuenta.metodoPago === 'tarjeta')
    .reduce((suma, cuenta) => suma + cuenta.total, 0);

  const productosVendidos = {};

  ordenes.forEach(orden => {
    orden.productos.forEach(producto => {
      if (!productosVendidos[producto.nombre]) {
        productosVendidos[producto.nombre] = {
          nombre: producto.nombre,
          cantidad: 0,
          total: 0
        };
      }

      productosVendidos[producto.nombre].cantidad += producto.cantidad;
      productosVendidos[producto.nombre].total += producto.precio * producto.cantidad;
    });
  });

  const productosOrdenados = Object.values(productosVendidos)
    .sort((a, b) => b.cantidad - a.cantidad);

  const productosHTML = productosOrdenados.length === 0
    ? `<p class="text-secondary mb-0">Todavía no hay productos vendidos.</p>`
    : productosOrdenados.map(producto => {
      return `
        <div class="balance-product-item">
          <div>
            <strong>${producto.nombre}</strong>
            <p class="mb-0">${producto.cantidad} vendidos</p>
          </div>

          <strong class="text-warning">$${producto.total}</strong>
        </div>
      `;
    }).join('');

  const balance = document.getElementById('balanceAdmin');

  if (!balance) return;

  balance.innerHTML = `
    <div class="col-md-3">
      <div class="admin-card">
        <p class="section-label">Total vendido</p>
        <h2 class="text-warning fw-bold">$${total}</h2>
      </div>
    </div>

    <div class="col-md-3">
      <div class="admin-card">
        <p class="section-label">Efectivo</p>
        <h2 class="fw-bold">$${efectivo}</h2>
      </div>
    </div>

    <div class="col-md-3">
      <div class="admin-card">
        <p class="section-label">Transferencia</p>
        <h2 class="fw-bold">$${transferencia}</h2>
      </div>
    </div>

    <div class="col-md-3">
      <div class="admin-card">
        <p class="section-label">Tarjeta</p>
        <h2 class="fw-bold">$${tarjeta}</h2>
      </div>
    </div>

    <div class="col-12">
      <div class="admin-card">
        <p class="section-label">Productos vendidos hoy</p>
        <h2 class="fw-bold mb-3">Resumen de venta</h2>

        <div class="balance-products-list">
          ${productosHTML}
        </div>
      </div>
    </div>
  `;
}

function abrirModalCerrarDia() {
  const modal = new bootstrap.Modal(document.getElementById('modalCerrarDia'));
  modal.show();
}

async function confirmarCerrarDia() {
  await fetch('/api/reiniciar-dia', { method: 'DELETE' });

  folioSeleccionado = null;

  const modalElement = document.getElementById('modalCerrarDia');
  const modal = bootstrap.Modal.getInstance(modalElement);
  modal.hide();

  document.getElementById('detalleCuentaAdmin').innerHTML = `
    <div class="success-box">
      <div class="success-check"><i class="bi bi-check-lg"></i></div>
      <h3>Día cerrado</h3>
      <p>Órdenes, cuentas, balance y folios fueron reiniciados.</p>
    </div>
  `;

  cargarOrdenesAdmin();
  cargarCuentasAdmin();
  cargarBalanceAdmin();
}

async function cargarTomarOrden() {
  const respuesta = await fetch('/api/productos');
  productosAdmin = await respuesta.json();

  productosAdmin.sort((a, b) => (a.orden || 0) - (b.orden || 0));

  const contenedor = document.getElementById('productosTomarOrden');
  if (!contenedor) return;

  contenedor.innerHTML = '';

  productosAdmin.forEach(producto => {
    if (!producto.disponible) return;

    const itemCarrito = carritoManual.find(item => item.id === producto.id);
    const cantidad = itemCarrito ? itemCarrito.cantidad : 0;

    contenedor.innerHTML += `
      <article class="manual-product-tile">
        <strong>${producto.nombre}</strong>

        <div class="manual-qty">
          <button onclick="cambiarCantidadManual(${producto.id}, -1)">−</button>
          <span>${cantidad}</span>
          <button onclick="cambiarCantidadManual(${producto.id}, 1)">+</button>
        </div>
      </article>
    `;
  });
}

function cambiarCantidadManual(idProducto, cambio) {
  const producto = productosAdmin.find(p => p.id === idProducto);
  if (!producto) return;

  const existente = carritoManual.find(p => p.id === idProducto);

  if (existente) {
    existente.cantidad += cambio;

    if (existente.cantidad <= 0) {
      carritoManual = carritoManual.filter(p => p.id !== idProducto);
    }
  } else if (cambio > 0) {
    carritoManual.push({ ...producto, cantidad: 1 });
  }

  cargarTomarOrden();
  renderizarCarritoManual();
}

function renderizarCarritoManual() {
  const contenedor = document.getElementById('carritoOrdenManual');
  if (!contenedor) return;

  contenedor.innerHTML = '';

  let total = 0;

  carritoManual.forEach(producto => {
    total += producto.precio * producto.cantidad;

    contenedor.innerHTML += `
      <div class="manual-cart-item">
        <span>${producto.cantidad} x ${producto.nombre}</span>
        <strong>$${producto.precio * producto.cantidad}</strong>
      </div>
    `;
  });

  document.getElementById('totalOrdenManual').textContent = total;
}

async function enviarOrdenManual() {
  const nombreInput = document.getElementById('nombreOrdenManual');
  const notasInput = document.getElementById('notasOrdenManual');

  const nombre = nombreInput.value.trim();
  const notas = notasInput.value.trim();
  const folio = document.getElementById('folioOrdenManual').value;

  if (carritoManual.length === 0 || !nombre) {
    nombreInput.focus();
    return;
  }

  const total = carritoManual.reduce((suma, producto) => {
    return suma + producto.precio * producto.cantidad;
  }, 0);

  await fetch('/api/ordenes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cliente: nombre,
      folio: folio || null,
      productos: carritoManual,
      notas,
      total
    })
  });

  carritoManual = [];
  nombreInput.value = '';
  notasInput.value = '';

  nombreInput.readOnly = false;
document.getElementById('folioOrdenManual').value = '';
cargarFoliosManual();

  cargarTomarOrden();
  cargarFoliosManual();
  renderizarCarritoManual();
  cargarOrdenesAdmin();
  cargarCuentasAdmin();

  mostrarExitoOrdenManual();
}

function mostrarExitoOrdenManual() {
  const modalElement = document.getElementById('modalOrdenManualExito');
  const modal = new bootstrap.Modal(modalElement);

  modal.show();

  setTimeout(() => {
    modal.hide();
  }, 1800);
}

cargarOrdenesAdmin();
cargarProductosAdmin();
cargarCuentasAdmin();
cargarBalanceAdmin();
cargarTomarOrden();

setInterval(cargarOrdenesAdmin, 3000);
setInterval(cargarCuentasAdmin, 3000);
setInterval(actualizarDetalleSeleccionado, 3000);
setInterval(cargarBalanceAdmin, 3000);
setInterval(cargarFoliosManual, 3000);

window.addEventListener('DOMContentLoaded', () => {
  const vistaGuardada = localStorage.getItem('vistaAdminActiva') || 'vistaOrdenes';
  const boton = document.querySelector(`[onclick*="${vistaGuardada}"]`);

  if (boton) {
    cambiarVistaAdmin(vistaGuardada, boton);
  }
});

async function cargarFoliosManual() {
  const respuesta = await fetch('/api/cuentas');
  const cuentas = await respuesta.json();

  const select = document.getElementById('folioOrdenManual');
  if (!select) return;

  const valorActual = select.value;

  const abiertas = cuentas.filter(cuenta => cuenta.estado === 'abierta');

  select.innerHTML = `<option value="">Nueva cuenta</option>`;

  abiertas.forEach(cuenta => {
    select.innerHTML += `
      <option value="${cuenta.folio}">
        #${cuenta.folio} · ${cuenta.cliente} · $${cuenta.total}
      </option>
    `;
  });

  select.value = valorActual;
}

async function seleccionarFolioManual() {
  const folio = document.getElementById('folioOrdenManual').value;
  const nombreInput = document.getElementById('nombreOrdenManual');

  if (!folio) {
    nombreInput.value = '';
    nombreInput.readOnly = false;
    return;
  }

  const respuesta = await fetch(`/api/cuentas/${folio}`);
  const cuenta = await respuesta.json();

  nombreInput.value = cuenta.cliente;
  nombreInput.readOnly = true;
}