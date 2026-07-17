<<<<<<< HEAD
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

let mainWindow;

// Configuración de tu base de datos PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'apascacio',
  password: ' ',
  port: 5432,
  max: 200, // Máximo de conexiones simultáneas
  options: "-c search_path=uci,public",
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- CANALES IPC ---

// Canal para cargar los roles activos al registrarse
ipcMain.handle('obtener-roles-activos', async () => {
  try {
    const queryStr = 'SELECT id_rol, nombre_rol FROM seguridad.roles WHERE activo = true ORDER BY nombre_rol ASC;';
    const res = await pool.query(queryStr); // pool.query gestiona todo automáticamente
    return { success: true, roles: res.rows };
  } catch (err) {
    return { success: false, error: err.message };
  }

});

// canal para registrar un nuevo usuario en la base de datos
ipcMain.handle('registrar-nuevo-usuario', async (event, datos) => {
  const client = await pool.connect(); // Obtener una conexión del pool
  try {
    await client.query('BEGIN');
    // Cifrar clave
    const hashPassword = await bcrypt.hash(datos.password, 10);
   // 1. Buscar el id_personal correspondiente a la cédula ingresada
    const sqlBuscarPersona = `
      SELECT id_personal FROM personal.personal WHERE cedula = $1;
    `;
    const resPersona = await client.query(sqlBuscarPersona, [datos.cedula]);
    // Si la cédula no existe en el sistema, cancelamos el registro
    if (resPersona.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'La cédula ingresada no está registrada como personal laboral de la Institución.' };
    }
    const idPersonalEncontrado = resPersona.rows[0].id_personal;
    // Inserción de usuario
    const sqlUsuario = `
      INSERT INTO seguridad.usuarios (usuario, password_hash, cuenta_activa, id_personal)
      VALUES ($1, $2,  true, $3) RETURNING id_usuario;
    `;
    const resUsuario = await client.query(sqlUsuario, [datos.usuario, hashPassword, idPersonalEncontrado]);
    const idUsuarioGenerado = resUsuario.rows[0].id_usuario;

    // Inserción de relación (Ojo: verifica si tu columna se llama id_rol o id_role en usuarios_x_roles)
    const sqlRelacion = `
      INSERT INTO seguridad.usuarios_x_roles (id_usuario, id_rol)
      VALUES ($1, $2);
    `;
    await client.query(sqlRelacion, [idUsuarioGenerado, datos.idRol]);

    await client.query('COMMIT');
    return { success: true };

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error interno en el Main Process:", err); // Esto imprimirá el error real en tu terminal de VS Code/CMD
    if (err.code === '23505') {
      return { success: false, error: 'La cédula ingresada ya está registrada.' };
    }
    return { success: false, error: err.message };
  } finally {
    client.release(); // Liberamos la conexión al pool  
  }
});

ipcMain.handle('iniciar-sesion', async (event, datos) => {
  try {
    // 1. Buscar el usuario y obtener su ID, hash de contraseña y su rol asignado
   const sqlLogin = `
  SELECT u.id_usuario, u.password_hash, u.cuenta_activa, r.nombre_rol
  FROM seguridad.usuarios u
  LEFT JOIN seguridad.usuarios_x_roles ur ON u.id_usuario = ur.id_usuario
  LEFT JOIN seguridad.roles r ON ur.id_rol = r.id_rol
  WHERE u.usuario::text = $1::text; -- Forzamos a ambos a ser tratados como texto plano
`;
    
    const res = await pool.query(sqlLogin, [datos.usuario]);
    console.log("-> Filas encontradas en BD:", res.rows.length);
    // Si no encuentra el usuario
    if (res.rows.length === 0) {
      return { success: false, error: 'Usuario o contraseña incorrectos.' };
    }

    const usuarioDb = res.rows[0];
    console.log("-> Hash en BD:", usuarioDb.password_hash);
    console.log("-> Contraseña ingresada en texto plano:", datos.password);
    // Verificar si la cuenta está activa
    if (!usuarioDb.cuenta_activa) {
      return { success: false, error: 'Esta cuenta se encuentra desactivada.' };
    }

    // 2. Comparar la contraseña ingresada con el hash de la base de datos
    const coinciden = await bcrypt.compare(datos.password, usuarioDb.password_hash);
    console.log("-> ¿Bcrypt determinó que coinciden?:", coinciden);
    if (!coinciden) {
      return { success: false, error: 'Usuario o contraseña incorrectos.' };
    }

    // Si todo está bien, devolvemos el éxito y su rol
    return { 
      success: true, 
      rol: usuarioDb.nombre_rol 
    };

  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  } 
});



// Canal para obtener los departamentos dinámicos de forma única
ipcMain.handle('obtener-departamentos', async () => {
  
  try {
    // Extrae los departamentos existentes de forma única para poblar el select
    const queryStr = 'SELECT DISTINCT departamento FROM personal.personal WHERE departamento IS NOT NULL AND departamento != \'\' ORDER BY departamento ASC;';
    const res = await pool.query(queryStr);
    return { success: true, departamentos: res.rows };
  } catch (err) {
    return { success: false, error: err.message };
  } 

});

// Canal para la inserción masiva de la ficha técnica del trabajador
ipcMain.handle('registrar-nuevo-personal', async (event, datos) => {

  try {
    
    const sqlInsert = `
      INSERT INTO personal.personal (
        cedula, nombre, apellido, sexo, fecha_nacimiento, 
        lugar_nacimiento, telefono, correo, fecha_ingreso, 
        cargo, departamento, estado_laboral, direccion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id_personal;
    `;

    const params = [
      datos.cedula,
      datos.nombre,
      datos.apellido,
      datos.sexo,
      datos.fechaNac,
      datos.lugarNac,
      datos.telefono,
      datos.correo,
      datos.fechaIngreso,
      datos.cargo,
      datos.departamento,
      datos.estadoLaboral,
      datos.direccion
    ];

    const res = await pool.query(sqlInsert, params);
    return { success: true, idPersonal: res.rows[0].id_personal };

  } catch (err) {
    console.error("Error en inserción de personal:", err);
    if (err.code === '23505') {
      return { success: false, error: 'Esta cédula de identidad ya se encuentra registrada en el sistema.' };
    }
    return { success: false, error: err.message };
  }
});

// obtencion de personal para mostrarlo en la tabla de RRHH
ipcMain.handle('obtener-personal', async () => {

  try {
    const res = await pool.query('SELECT cedula, nombre, apellido, departamento, cargo, estado_laboral FROM personal.personal ORDER BY apellido ASC;');
    return { success: true, personal: res.rows };
  } catch (err) {
    return { success: false, error: err.message };
  } 
  
});

ipcMain.handle('actualizar-personal', async (event, d) => {

  try {
    const sql = `UPDATE personal.personal 
                 SET cedula=$1, nombre=$2, apellido=$3, departamento=$4, cargo=$5, estado_laboral=$6 
                 WHERE cedula=$7`;
    await pool.query(sql, [d.cedula, d.nombre, d.apellido, d.departamento, d.cargo, d.estado, d.cedulaOriginal]);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
=======
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

let mainWindow;

// Configuración de tu base de datos PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'apascacio',
  password: ' ',
  port: 5432,
  max: 200, // Máximo de conexiones simultáneas
  options: "-c search_path=uci,public",
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- CANALES IPC ---

// Canal para cargar los roles activos al registrarse
ipcMain.handle('obtener-roles-activos', async () => {
  try {
    const queryStr = 'SELECT id_rol, nombre_rol FROM seguridad.roles WHERE activo = true ORDER BY nombre_rol ASC;';
    const res = await pool.query(queryStr); // pool.query gestiona todo automáticamente
    return { success: true, roles: res.rows };
  } catch (err) {
    return { success: false, error: err.message };
  }

});

// canal para registrar un nuevo usuario en la base de datos
ipcMain.handle('registrar-nuevo-usuario', async (event, datos) => {
  const client = await pool.connect(); // Obtener una conexión del pool
  try {
    await client.query('BEGIN');
    // Cifrar clave
    const hashPassword = await bcrypt.hash(datos.password, 10);
   // 1. Buscar el id_personal correspondiente a la cédula ingresada
    const sqlBuscarPersona = `
      SELECT id_personal FROM personal.personal WHERE cedula = $1;
    `;
    const resPersona = await client.query(sqlBuscarPersona, [datos.cedula]);
    // Si la cédula no existe en el sistema, cancelamos el registro
    if (resPersona.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'La cédula ingresada no está registrada como personal laboral de la Institución.' };
    }
    const idPersonalEncontrado = resPersona.rows[0].id_personal;
    // Inserción de usuario
    const sqlUsuario = `
      INSERT INTO seguridad.usuarios (usuario, password_hash, cuenta_activa, id_personal)
      VALUES ($1, $2,  true, $3) RETURNING id_usuario;
    `;
    const resUsuario = await client.query(sqlUsuario, [datos.usuario, hashPassword, idPersonalEncontrado]);
    const idUsuarioGenerado = resUsuario.rows[0].id_usuario;

    // Inserción de relación (Ojo: verifica si tu columna se llama id_rol o id_role en usuarios_x_roles)
    const sqlRelacion = `
      INSERT INTO seguridad.usuarios_x_roles (id_usuario, id_rol)
      VALUES ($1, $2);
    `;
    await client.query(sqlRelacion, [idUsuarioGenerado, datos.idRol]);

    await client.query('COMMIT');
    return { success: true };

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error interno en el Main Process:", err); // Esto imprimirá el error real en tu terminal de VS Code/CMD
    if (err.code === '23505') {
      return { success: false, error: 'La cédula ingresada ya está registrada.' };
    }
    return { success: false, error: err.message };
  } finally {
    client.release(); // Liberamos la conexión al pool  
  }
});

ipcMain.handle('iniciar-sesion', async (event, datos) => {
  try {
    // 1. Buscar el usuario y obtener su ID, hash de contraseña y su rol asignado
   const sqlLogin = `
  SELECT u.id_usuario, u.password_hash, u.cuenta_activa, r.nombre_rol
  FROM seguridad.usuarios u
  LEFT JOIN seguridad.usuarios_x_roles ur ON u.id_usuario = ur.id_usuario
  LEFT JOIN seguridad.roles r ON ur.id_rol = r.id_rol
  WHERE u.usuario::text = $1::text; -- Forzamos a ambos a ser tratados como texto plano
`;
    
    const res = await pool.query(sqlLogin, [datos.usuario]);
    console.log("-> Filas encontradas en BD:", res.rows.length);
    // Si no encuentra el usuario
    if (res.rows.length === 0) {
      return { success: false, error: 'Usuario o contraseña incorrectos.' };
    }

    const usuarioDb = res.rows[0];
    console.log("-> Hash en BD:", usuarioDb.password_hash);
    console.log("-> Contraseña ingresada en texto plano:", datos.password);
    // Verificar si la cuenta está activa
    if (!usuarioDb.cuenta_activa) {
      return { success: false, error: 'Esta cuenta se encuentra desactivada.' };
    }

    // 2. Comparar la contraseña ingresada con el hash de la base de datos
    const coinciden = await bcrypt.compare(datos.password, usuarioDb.password_hash);
    console.log("-> ¿Bcrypt determinó que coinciden?:", coinciden);
    if (!coinciden) {
      return { success: false, error: 'Usuario o contraseña incorrectos.' };
    }

    // Si todo está bien, devolvemos el éxito y su rol
    return { 
      success: true, 
      rol: usuarioDb.nombre_rol 
    };

  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  } 
});



// Canal para obtener los departamentos dinámicos de forma única
ipcMain.handle('obtener-departamentos', async () => {
  
  try {
    // Extrae los departamentos existentes de forma única para poblar el select
    const queryStr = 'SELECT DISTINCT departamento FROM personal.personal WHERE departamento IS NOT NULL AND departamento != \'\' ORDER BY departamento ASC;';
    const res = await pool.query(queryStr);
    return { success: true, departamentos: res.rows };
  } catch (err) {
    return { success: false, error: err.message };
  } 

});

// Canal para la inserción masiva de la ficha técnica del trabajador
ipcMain.handle('registrar-nuevo-personal', async (event, datos) => {

  try {
    
    const sqlInsert = `
      INSERT INTO personal.personal (
        cedula, nombre, apellido, sexo, fecha_nacimiento, 
        lugar_nacimiento, telefono, correo, fecha_ingreso, 
        cargo, departamento, estado_laboral, direccion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id_personal;
    `;

    const params = [
      datos.cedula,
      datos.nombre,
      datos.apellido,
      datos.sexo,
      datos.fechaNac,
      datos.lugarNac,
      datos.telefono,
      datos.correo,
      datos.fechaIngreso,
      datos.cargo,
      datos.departamento,
      datos.estadoLaboral,
      datos.direccion
    ];

    const res = await pool.query(sqlInsert, params);
    return { success: true, idPersonal: res.rows[0].id_personal };

  } catch (err) {
    console.error("Error en inserción de personal:", err);
    if (err.code === '23505') {
      return { success: false, error: 'Esta cédula de identidad ya se encuentra registrada en el sistema.' };
    }
    return { success: false, error: err.message };
  }
});

// obtencion de personal para mostrarlo en la tabla de RRHH
ipcMain.handle('obtener-personal', async () => {

  try {
    const res = await pool.query('SELECT cedula, nombre, apellido, departamento, cargo, estado_laboral FROM personal.personal ORDER BY apellido ASC;');
    return { success: true, personal: res.rows };
  } catch (err) {
    return { success: false, error: err.message };
  } 
  
});

ipcMain.handle('actualizar-personal', async (event, d) => {

  try {
    const sql = `UPDATE personal.personal 
                 SET cedula=$1, nombre=$2, apellido=$3, departamento=$4, cargo=$5, estado_laboral=$6 
                 WHERE cedula=$7`;
    await pool.query(sql, [d.cedula, d.nombre, d.apellido, d.departamento, d.cargo, d.estado, d.cedulaOriginal]);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
>>>>>>> 9d584b1b6357a6f57d775dd813fd0424a0bef228
