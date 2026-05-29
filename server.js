const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const cuentasPath = path.join(__dirname, 'data', 'cuentas.json');
const productosPath = path.join(__dirname, 'data', 'productos.json');
const ordenesPath = path.join(__dirname, 'data', 'ordenes.json');

function leerJSON(ruta) {
  if (!fs.existsSync(ruta)) {
    fs.writeFileSync(ruta, '[]');
  }

  const contenido = fs.readFileSync(ruta, 'utf-8');

  if (!contenido.trim()) {
    return [];
  }

  return JSON.parse(contenido);
}

function guardarJSON(ruta, datos) {
  fs.writeFileSync(ruta, JSON.stringify(datos, null, 2));
}

function generarFolio(cuentas) {
  const ultimoNumero = cuentas.reduce((mayor, cuenta) => {
    const numero = Number(cuenta.folio);
    return numero > mayor ? numero : mayor;
  }, 0);

  return String(ultimoNumero + 1).padStart(3, '0');
}

function buscarCuentaAbierta(cuentas, folio) {
  return cuentas.find(cuenta => cuenta.folio === folio && cuenta.estado === 'abierta');
}

// PÁGINAS

app.get('/', (req, res) => {
  res.redirect('/tacos/menu');
});

app.get('/tacos/menu', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'menu.html'));
});

app.get('/tacos/ordenes', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ordenes.html'));
});

app.get('/tacos/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// PRODUCTOS

app.get('/api/productos', (req, res) => {
  const productos = leerJSON(productosPath);
  res.json(productos);
});

app.post('/api/productos', (req, res) => {
  const productos = leerJSON(productosPath);

const nuevoProducto = {
  id: Date.now(),
  nombre: req.body.nombre,
  precio: Number(req.body.precio),
  categoria: req.body.categoria,
  descripcion: req.body.descripcion,
  disponible: true,
  orden: productos.length + 1
};

  productos.push(nuevoProducto);
  guardarJSON(productosPath, productos);

  res.json(nuevoProducto);
});

app.put('/api/productos/:id', (req, res) => {
  let productos = leerJSON(productosPath);
  const id = Number(req.params.id);

  productos = productos.map(producto => {
    if (producto.id === id) {
      return { ...producto, ...req.body };
    }

    return producto;
  });

  guardarJSON(productosPath, productos);
  res.json({ mensaje: 'Producto actualizado' });
});

app.delete('/api/productos/:id', (req, res) => {
  let productos = leerJSON(productosPath);
  const id = Number(req.params.id);

  productos = productos.filter(producto => producto.id !== id);
  guardarJSON(productosPath, productos);

  res.json({ mensaje: 'Producto eliminado' });
});

// ÓRDENES

app.get('/api/ordenes', (req, res) => {
  const ordenes = leerJSON(ordenesPath);
  res.json(ordenes);
});

app.post('/api/ordenes', (req, res) => {
  const ordenes = leerJSON(ordenesPath);
  const cuentas = leerJSON(cuentasPath);

  let cuenta = null;

  if (req.body.folio) {
    cuenta = buscarCuentaAbierta(cuentas, req.body.folio);
  }

  if (!cuenta) {
    const nuevoFolio = generarFolio(cuentas);

    cuenta = {
      folio: nuevoFolio,
      cliente: req.body.cliente,
      estado: 'abierta',
      ordenes: [],
      total: 0,
      pagado: false,
      metodoPago: null,
      montoRecibido: null,
      cambio: null,
      fechaApertura: new Date().toLocaleString(),
      fechaCierre: null
    };

    cuentas.push(cuenta);
  }

  const nuevaOrden = {
    id: Date.now(),
    folio: cuenta.folio,
    cliente: cuenta.cliente,
    productos: req.body.productos,
    notas: req.body.notas || '',
    total: Number(req.body.total),
    estado: 'Pendiente',
    fecha: new Date().toLocaleString()
  };

  ordenes.unshift(nuevaOrden);

  cuenta.ordenes.push(nuevaOrden.id);
  cuenta.total += nuevaOrden.total;

  guardarJSON(ordenesPath, ordenes);
  guardarJSON(cuentasPath, cuentas);

  res.json({
    orden: nuevaOrden,
    cuenta
  });
});

app.put('/api/ordenes/:id', (req, res) => {
  let ordenes = leerJSON(ordenesPath);
  const id = Number(req.params.id);

  ordenes = ordenes.map(orden => {
    if (orden.id === id) {
      return { ...orden, ...req.body };
    }

    return orden;
  });

  guardarJSON(ordenesPath, ordenes);
  res.json({ mensaje: 'Orden actualizada' });
});

// CUENTAS

app.get('/api/cuentas', (req, res) => {
  const cuentas = leerJSON(cuentasPath);
  res.json(cuentas);
});

app.get('/api/cuentas-abiertas', (req, res) => {
  const cuentas = leerJSON(cuentasPath);
  const abiertas = cuentas.filter(cuenta => cuenta.estado === 'abierta');

  res.json(abiertas);
});

app.get('/api/cuentas/:folio', (req, res) => {
  const cuentas = leerJSON(cuentasPath);
  const cuenta = cuentas.find(cuenta => cuenta.folio === req.params.folio);

  if (!cuenta) {
    return res.status(404).json({ mensaje: 'Cuenta no encontrada' });
  }

  res.json(cuenta);
});

app.get('/api/cuentas/:folio/detalle', (req, res) => {
  const cuentas = leerJSON(cuentasPath);
  const ordenes = leerJSON(ordenesPath);

  const cuenta = cuentas.find(cuenta => cuenta.folio === req.params.folio);

  if (!cuenta) {
    return res.status(404).json({ mensaje: 'Cuenta no encontrada' });
  }

  const ordenesCuenta = ordenes.filter(orden => orden.folio === cuenta.folio);

  const productosAcumulados = {};

  ordenesCuenta.forEach(orden => {
    orden.productos.forEach(producto => {
      if (!productosAcumulados[producto.id]) {
        productosAcumulados[producto.id] = {
          id: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          cantidad: 0,
          subtotal: 0
        };
      }

      productosAcumulados[producto.id].cantidad += producto.cantidad;
      productosAcumulados[producto.id].subtotal += producto.precio * producto.cantidad;
    });
  });

  res.json({
    cuenta,
    ordenes: ordenesCuenta,
    productosAcumulados: Object.values(productosAcumulados)
  });
});

app.put('/api/cuentas/:folio/cerrar', (req, res) => {
  const cuentas = leerJSON(cuentasPath);
  const folio = req.params.folio;

  const cuenta = cuentas.find(cuenta => cuenta.folio === folio);

  if (!cuenta) {
    return res.status(404).json({ mensaje: 'Cuenta no encontrada' });
  }

  const metodoPago = req.body.metodoPago || 'efectivo';
  const montoRecibido = metodoPago === 'efectivo'
  ? Number(req.body.montoRecibido) || cuenta.total
  : cuenta.total;

  cuenta.estado = 'cerrada';
  cuenta.pagado = true;
  cuenta.metodoPago = metodoPago;
  cuenta.montoRecibido = montoRecibido;
  cuenta.cambio = montoRecibido - cuenta.total;
  cuenta.fechaCierre = new Date().toLocaleString();

let ordenes = leerJSON(ordenesPath);

ordenes = ordenes.map(orden => {
  if (orden.folio === folio) {
    return {
      ...orden,
      estado: 'Completado'
    };
  }

  return orden;
});

guardarJSON(cuentasPath, cuentas);
guardarJSON(ordenesPath, ordenes);

res.json(cuenta);
});

// REINICIAR SISTEMA

app.delete('/api/reiniciar-dia', (req, res) => {

  guardarJSON(ordenesPath, []);
  guardarJSON(cuentasPath, []);

  res.json({
    mensaje: 'Sistema reiniciado correctamente'
  });

});

app.put('/api/productos/:id/mover', (req, res) => {
  let productos = leerJSON(productosPath);
  const id = Number(req.params.id);
  const direccion = req.body.direccion;

  productos = productos
    .map((producto, index) => ({
      ...producto,
      orden: producto.orden || index + 1
    }))
    .sort((a, b) => a.orden - b.orden);

  const index = productos.findIndex(producto => producto.id === id);

  if (index === -1) {
    return res.status(404).json({ mensaje: 'Producto no encontrado' });
  }

  const nuevoIndex = direccion === 'arriba' ? index - 1 : index + 1;

  if (nuevoIndex < 0 || nuevoIndex >= productos.length) {
    return res.json(productos);
  }

  const productoMovido = productos[index];
  productos.splice(index, 1);
  productos.splice(nuevoIndex, 0, productoMovido);

  productos = productos.map((producto, index) => ({
    ...producto,
    orden: index + 1
  }));

  guardarJSON(productosPath, productos);

  res.json(productos);
});

app.listen(PORT, () => {
  console.log(`Servidor funcionando en puerto ${PORT}`);
});