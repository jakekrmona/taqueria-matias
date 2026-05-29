let productos = [];
let carrito = [];
let categoriaActual = 'Todos';

let cuentaActual = null;

try {
  cuentaActual = JSON.parse(localStorage.getItem('cuentaActual'));
} catch (error) {
  localStorage.removeItem('cuentaActual');
  cuentaActual = null;
}

const contenedorProductos = document.getElementById('contenedorProductos');
const contenedorCategorias = document.getElementById('contenedorCategorias');

async function cargarProductos() {
  const respuesta = await fetch('/api/productos');
  productos = await respuesta.json();

productos.sort((a, b) => (a.orden || 0) - (b.orden || 0));

  renderizarCategorias();
  renderizarProductos();
}

function renderizarCategorias() {
  const categorias = ['Todos', ...new Set(productos.map(producto => producto.categoria))];

  contenedorCategorias.innerHTML = '';

  categorias.forEach(categoria => {
    contenedorCategorias.innerHTML += `
      <button
        class="category-chip ${categoria === categoriaActual ? 'active' : ''}"
        onclick="filtrarCategoria('${categoria}', this)"
      >
        ${categoria}
      </button>
    `;
  });
}

function filtrarCategoria(categoria, boton) {
  categoriaActual = categoria;

  document.querySelectorAll('.category-chip').forEach(chip => {
    chip.classList.remove('active');
  });

  boton.classList.add('active');
  renderizarProductos();
}

function renderizarProductos() {
  contenedorProductos.innerHTML = '';

  const lista = categoriaActual === 'Todos'
    ? productos
    : productos.filter(producto => producto.categoria === categoriaActual);

  lista.forEach(producto => {
    if (!producto.disponible) return;

    contenedorProductos.innerHTML += `
      <div class="col-12 col-md-6 col-xl-4">
        <article class="product-card">
          <div>
            <span class="badge text-bg-warning rounded-pill mb-3">
              ${producto.categoria}
            </span>

            <h3>${producto.nombre}</h3>
            <p>${producto.descripcion}</p>
          </div>

          <div class="product-bottom">
            <span class="price">$${producto.precio}</span>

            <button
              class="add-btn"
              data-producto="${producto.id}"
              onclick="agregarAlCarrito(${producto.id}); animarBotonAgregar(${producto.id})"
              aria-label="Agregar ${producto.nombre}"
            >
              <i class="bi bi-plus-lg"></i>
            </button>
          </div>
        </article>
      </div>
    `;
  });
}

function agregarAlCarrito(idProducto) {
  const producto = productos.find(item => item.id === idProducto);
  const productoEnCarrito = carrito.find(item => item.id === idProducto);

  if (productoEnCarrito) {
    productoEnCarrito.cantidad++;
  } else {
    carrito.push({ ...producto, cantidad: 1 });
  }

  actualizarCarrito();
}

function actualizarCarrito() {
  const cantidad = carrito.reduce((total, item) => total + item.cantidad, 0);
  const total = carrito.reduce((total, item) => total + item.precio * item.cantidad, 0);

  document.getElementById('cantidadCarrito').textContent = cantidad;
  document.getElementById('totalCarrito').textContent = total;

  animarCarrito();
}

function confirmarOrden() {
  if (carrito.length === 0) {
    alert('Primero agrega productos al pedido.');
    return;
  }

const nombreInput = document.getElementById('nombreCliente');

if (cuentaActual) {
  nombreInput.value = cuentaActual.cliente;
  nombreInput.readOnly = true;
} else {
  nombreInput.value = '';
  nombreInput.readOnly = false;
}

  const resumen = document.getElementById('resumenPedido');
  resumen.innerHTML = '';

 carrito.forEach(item => {
  resumen.innerHTML += `
    <div class="order-item d-flex justify-content-between align-items-center rounded-4 p-3">
      <div>
        <strong>${item.nombre}</strong><br>
        <small>$${item.precio} c/u</small>
      </div>

      <div class="quantity-control">
        <button onclick="cambiarCantidadCarrito(${item.id}, -1)">−</button>
        <span>${item.cantidad}</span>
        <button onclick="cambiarCantidadCarrito(${item.id}, 1)">+</button>
      </div>

      <strong>$${item.precio * item.cantidad}</strong>
    </div>
  `;
});

  const modal = new bootstrap.Modal(document.getElementById('modalPedido'));
  modal.show();
}

function cambiarCantidadCarrito(idProducto, cambio) {

  const producto = carrito.find(item => item.id === idProducto);

  if (!producto) return;

  producto.cantidad += cambio;

  if (producto.cantidad <= 0) {
    carrito = carrito.filter(item => item.id !== idProducto);
  }

  actualizarCarrito();

  const resumen = document.getElementById('resumenPedido');
  resumen.innerHTML = '';

  if (carrito.length === 0) {

    const modalElement = document.getElementById('modalPedido');
    const modal = bootstrap.Modal.getInstance(modalElement);

    if (modal) {
      modal.hide();
    }

    return;
  }

  carrito.forEach(item => {

    resumen.innerHTML += `
      <div class="order-item d-flex justify-content-between align-items-center rounded-4 p-3">

        <div>
          <strong>${item.nombre}</strong><br>
          <small>$${item.precio} c/u</small>
        </div>

        <div class="quantity-control">
          <button onclick="cambiarCantidadCarrito(${item.id}, -1)">−</button>

          <span>${item.cantidad}</span>

          <button onclick="cambiarCantidadCarrito(${item.id}, 1)">+</button>
        </div>

        <strong>$${item.precio * item.cantidad}</strong>

      </div>
    `;
  });

}

async function enviarOrden() {
  const nombreInput = document.getElementById('nombreCliente');
  const nombre = nombreInput.value.trim();
  const notas = document.getElementById('notasPedido').value.trim();

const errorNombre = document.getElementById('errorNombre');

if (!validarNombre(nombre)) {
  nombreInput.focus();
  nombreInput.classList.add('is-invalid');
  errorNombre.style.display = 'block';
  return;
}

nombreInput.classList.remove('is-invalid');
errorNombre.style.display = 'none';

  const total = carrito.reduce((total, item) => {
    return total + item.precio * item.cantidad;
  }, 0);

  const orden = {
    cliente: cuentaActual ? cuentaActual.cliente : nombre,
    folio: cuentaActual ? cuentaActual.folio : null,
    productos: carrito,
    notas,
    total
  };

  const respuesta = await fetch('/api/ordenes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(orden)
  });

  const datos = await respuesta.json();

  cuentaActual = datos.cuenta;

  localStorage.setItem(
    'cuentaActual',
    JSON.stringify(cuentaActual)
  );

  mostrarCuentaActiva();

  document.getElementById('formularioConfirmacion').classList.add('d-none');
  document.getElementById('mensajeExito').classList.remove('d-none');
  document.getElementById('footerModal').classList.add('d-none');

  carrito = [];
  actualizarCarrito();

  setTimeout(() => {
    const modalElement = document.getElementById('modalPedido');
    const modal = bootstrap.Modal.getInstance(modalElement);

    modal.hide();

    document.getElementById('formularioConfirmacion').classList.remove('d-none');
    document.getElementById('mensajeExito').classList.add('d-none');
    document.getElementById('footerModal').classList.remove('d-none');

    document.getElementById('nombreCliente').value = '';
    document.getElementById('nombreCliente').readOnly = false;
    document.getElementById('notasPedido').value = '';
  }, 2000);
}

function validarNombre(nombre) {
  const regex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{2,40}$/;
  return regex.test(nombre);
}

async function mostrarCuentaActiva() {
  const cuentaBox = document.getElementById('cuentaActiva');
  const textoCuenta = document.getElementById('textoCuentaActiva');

  if (!cuentaBox || !textoCuenta) return;

  if (!cuentaActual) {
    cuentaBox.classList.add('d-none');
    return;
  }

  const respuesta = await fetch(`/api/cuentas/${cuentaActual.folio}`);

  if (!respuesta.ok) {
    localStorage.removeItem('cuentaActual');
    cuentaActual = null;
    cuentaBox.classList.add('d-none');
    return;
  }

  const cuentaServidor = await respuesta.json();

  if (cuentaServidor.estado !== 'abierta') {
    localStorage.removeItem('cuentaActual');
    cuentaActual = null;
    cuentaBox.classList.add('d-none');
    return;
  }

  cuentaActual = cuentaServidor;
  localStorage.setItem('cuentaActual', JSON.stringify(cuentaActual));

  cuentaBox.classList.remove('d-none');
  textoCuenta.textContent = `Cuenta activa #${cuentaActual.folio} · ${cuentaActual.cliente}`;
}

function animarBotonAgregar(idProducto) {
  const boton = document.querySelector(`[data-producto="${idProducto}"]`);

  if (!boton) return;

  boton.classList.remove('added');
  void boton.offsetWidth;
  boton.classList.add('added');
}

function animarCarrito() {
  const barraCarrito = document.querySelector('.cart-bar');
  const cantidad = document.getElementById('cantidadCarrito');
  const total = document.getElementById('totalCarrito');

  barraCarrito.classList.remove('cart-bounce');
  cantidad.classList.remove('counter-pop');
  total.classList.remove('counter-pop');

  void barraCarrito.offsetWidth;

  barraCarrito.classList.add('cart-bounce');
  cantidad.classList.add('counter-pop');
  total.classList.add('counter-pop');
}

function actualizarHorario() {
  const led = document.getElementById('estadoLed');
  const texto = document.getElementById('textoHorario');

  const ahora = new Date();
  const dia = ahora.getDay();
  const hora = ahora.getHours();
  const minutos = ahora.getMinutes();

  const minutosActuales = hora * 60 + minutos;
  const apertura = 18 * 60;
  const cierre = 22 * 60;

  const esFinDeSemana = dia === 5 || dia === 6 || dia === 0;
  const estaAbierto = esFinDeSemana && minutosActuales >= apertura && minutosActuales < cierre;

  if (estaAbierto) {
    led.className = 'status-led open';
    texto.textContent = 'Hoy abierto · 18:00 – 22:00';
  } else {
    led.className = 'status-led closed';

    if (esFinDeSemana) {
      texto.textContent = 'Hoy cerrado · Abrimos 18:00 – 22:00';
    } else {
      texto.textContent = 'Cerrado · Abrimos viernes, sábado y domingo';
    }
  }
}

actualizarHorario();
setInterval(actualizarHorario, 60000);

cargarProductos();