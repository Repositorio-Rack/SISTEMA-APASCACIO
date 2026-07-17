<<<<<<< HEAD
// 1. Función global de navegación entre vistas
function navegarA(idVista) {
    // Quita la clase 'activa' de todas las vistas
    document.querySelectorAll('.vista').forEach(vista => {
        vista.classList.remove('activa');
    });
    
    // Añade la clase 'activa' a la vista seleccionada
    const vistaDestino = document.getElementById(idVista);
    vistaDestino.classList.add('activa');

    // Si el usuario va a registrarse, cargamos dinámicamente los roles de la BD
    if (idVista === 'vistaRegistro') {
        cargarRolesEnSelector();
    }
}

// 2. Función para rellenar el selector de roles desde PostgreSQL
async function cargarRolesEnSelector() {
    const selectRoles = document.getElementById('selectRoles');
    selectRoles.innerHTML = '<option value="">-- Seleccione un Rol --</option>';

    try {
        const respuesta = await window.apiApp.obtenerRolesActivos();
        
        if (respuesta.success) {
            if (respuesta.roles.length === 0) {
                selectRoles.innerHTML = '<option value="">No hay roles activos disponibles</option>';
                return;
            }
            
            respuesta.roles.forEach(rol => {
                const option = document.createElement('option');
                option.value = rol.id_rol;         
                option.textContent = rol.nombre_rol; 
                selectRoles.appendChild(option);
            });
        } else {
            console.error("Error BD:", respuesta.error);
            selectRoles.innerHTML = '<option value="">Error al conectar con seguridad.roles</option>';
        }
    } catch (err) {
        console.error("Error de comunicación:", err);
    }
}

// ==========================================
// 3. ESCUCHADORES DE EVENTOS (FORMULARIOS)
// ==========================================

// Escucha para el envío del formulario de Registro
document.getElementById('formRegistro').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Capturar los valores de las cajas de texto
    const nombre = document.querySelector('#formRegistro input[placeholder="Ej: Juan Pérez"]').value.trim();
    const cedula = document.getElementById('regCedula').value.trim();
    const password = document.querySelector('#formRegistro input[type="password"]').value;
    const idRol = document.getElementById('selectRoles').value;

    // Validaciones rápidas en el cliente
    if (!idRol) {
        mostrarMensaje('Por favor, seleccione un rol válido.', 'No se puede registrar un usuario sin asignarle un rol.');
            document.getElementById('modalEdicion').style.display = 'none';
        
        return;
    }
    if (password.length < 8) {
        mostrarMensaje('Error', 'La contraseña debe tener al menos 8 caracteres.');
        return;
    }

    const datosRegistro = {
        usuario: cedula,
        nombre: nombre,
        cedula: cedula,
        password: password,
        idRol: parseInt(idRol)
    };

    try {
        // Enviar los datos estructurados al Main Process de Electron
        const respuesta = await window.apiApp.registrarNuevoUsuario(datosRegistro);

        if (respuesta.success) {
            mostrarMensaje('¡Usuario registrado exitosamente en el esquema de seguridad!', 'El usuario ahora puede iniciar sesión con sus credenciales.');
            document.getElementById('modalEdicion').style.display = 'none';
            
            document.getElementById('formRegistro').reset(); // Limpiar cajas de texto
            navegarA('vistaBienvenida'); // Regresar al menú
        } else {
            mostrarMensaje('Error', 'Error al registrar: ' + respuesta.error);
        }
    } catch (error) {
        console.error('Error en la comunicación:', error);
        mostrarMensaje('Error', 'Ocurrió un error inesperado al procesar el registro.');
    }
});

// Busca el formulario de login en tu renderer.js (ajusta el ID si se llama diferente)
document.getElementById('formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Capturamos los datos de los inputs del Login
    const usuarioInput = document.getElementById('loginUsuario').value.trim();
    const passwordInput = document.getElementById('loginPassword').value;

    // Llamamos al proceso principal
    const respuesta = await window.apiApp.iniciarSesion({ 
        usuario: usuarioInput, 
        password: passwordInput 
    });

    if (respuesta.success) {
        // ¡Login correcto! Evaluamos el rol para saber a dónde mandarlo
        if (respuesta.rol === 'ADMIN_SISTEMA' || respuesta.rol === 'RRHH') {
            
            mostrarMensaje(`¡Bienvenido al sistema! Rol detectado: ${respuesta.rol}`);
            document.getElementById('modalEdicion').style.display = 'none';
            
            // Llamamos a la función que armamos en el paso anterior para abrir la vista de RRHH
            irAModuloRRHH(usuarioInput, respuesta.rol); 
        } else {
            mostrarMensaje(`Inicio de sesión correcto con rol: ${respuesta.rol}. Redirigiendo...`, 'Se redirigirá a la vista correspondiente.');
            // Aquí puedes mandar a otras vistas (médicos, citas, etc.) según corresponda
        }
    } else {
        // Si las credenciales fallan o no coinciden
        mostrarMensaje('Error', respuesta.error);
    // Como el modal no es bloqueante, el foco funcionará perfectamente
        document.getElementById('editNombre').focus();
    }
});




  
// 1. FUNCIÓN PRINCIPAL: Muestra la pantalla de RRHH y oculta el Login/Bienvenida
function irAModuloRRHH(usuario, rol) {
// Rellenar datos en el Header
    document.getElementById('headerNombreUsuario').textContent = `Usuario: ${usuario}`;
    document.getElementById('headerRolUsuario').textContent = `Rol: ${rol}`;
// Rellenar datos en el Header
    document.getElementById('headerNombreUsuario').textContent = `Usuario: ${usuario}`;
    document.getElementById('headerRolUsuario').textContent = `Rol: ${rol}`;

// CORRECCIÓN: Forzamos la visualización con estilo en línea directo al DOM
    const header = document.getElementById('headerUsuario');
    header.style.setProperty('display', 'block', 'important');

    // CORRECCIÓN: Le quitamos la clase 'activa' a la vista de login para que el CSS permita ocultarla
    document.getElementById('vistaLogin').classList.remove('activa');
    document.getElementById('vistaBienvenida').classList.remove('activa');
    
    // Ocultas tus otras pantallas principales por manipulación directa de estilo
    document.getElementById('vistaLogin').style.display = 'none'; 
    document.getElementById('vistaBienvenida').style.display = 'none';
    
    // Muestras la pantalla de RRHH
    document.getElementById('vistaRRHH').style.display = 'block';
    
  cargarDepartamentosEnSelector();
    // Por defecto, que arranque mostrando el formulario de registro de personal
    navegarRRHH('registro-personal');
}
async function cargarDepartamentosEnSelector() {
    const selectDep = document.getElementById('perDepartamento');
    selectDep.innerHTML = '<option value="">-- Seleccione Departamento --</option>';

    try {
        const respuesta = await window.apiApp.obtenerDepartamentos();
        if (respuesta.success) {
            // Si la tabla está vacía, añadimos opciones básicas por defecto
            if (respuesta.departamentos.length === 0) {
                const opcionesPorDefecto = ['Sistemas', 'Recursos Humanos', 'Administración', 'Mantenimiento'];
                opcionesPorDefecto.forEach(dep => {
                    const option = document.createElement('option');
                    option.value = dep;
                    option.textContent = dep;
                    selectDep.appendChild(option);
                });
                return;
            }
            
            respuesta.departamentos.forEach(row => {
                const option = document.createElement('option');
                option.value = row.departamento;         
                option.textContent = row.departamento; 
                selectDep.appendChild(option);
            });
        }
    } catch (err) {
        console.error("Error cargando departamentos:", err);
    }
}



// 2. FUNCIÓN DE CERRAR SESIÓN
function cerrarSesion() {
    if (confirm('¿Está seguro de que desea cerrar su sesión actual?')) {
        // 1. Limpiar formularios
        document.getElementById('formLogin').reset();
        
        // 2. FORZAR el ocultado de todos los contenedores de sistema
        const elementosSistema = [
            'headerUsuario', 
            'vistaRRHH', 
            'modalEdicion', 
            'modalGlobal'
        ];
        
        elementosSistema.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // 3. Restaurar la navegación a la vista de bienvenida
        navegarA('vistaBienvenida');
        
        // 4. Quitar cualquier foco residual
        if (document.activeElement) document.activeElement.blur();
        
        console.log("Sesión cerrada correctamente");
    }
}
// 3. FUNCIÓN INTERNA: Cambia el contenido según lo que elijan en el menú desplegable de RRHH
function navegarRRHH(subVista) {
    // Primero ocultamos las 3 sub-vistas de RRHH
    document.getElementById('sub-registro-personal').style.display = 'none';
    document.getElementById('sub-nomina').style.display = 'none';
    document.getElementById('sub-ver-personal').style.display = 'none';

    // Mostramos únicamente la que el usuario seleccionó
    if (subVista === 'registro-personal') {
        document.getElementById('sub-registro-personal').style.display = 'block';
    } else if (subVista === 'nomina') {
        document.getElementById('sub-nomina').style.display = 'block';
    } else if (subVista === 'ver-personal') {
        document.getElementById('sub-ver-personal').style.display = 'block';
        cargarTablaPersonal();
    }
}

// 4. CAPTURADOR: Escuchar cuando envíen el formulario de registro de personal
document.getElementById('formRegistroPersonal').addEventListener('submit', async (e) => {
    e.preventDefault();

    const datosPersonal = {
        cedula: document.getElementById('perCedula').value.trim(),
        nombre: document.getElementById('perNombre').value.trim(),
        apellido: document.getElementById('perApellido').value.trim(),
        sexo: document.getElementById('perSexo').value,
        fechaNac: document.getElementById('perFechaNac').value,
        lugarNac: document.getElementById('perLugarNac').value.trim(), 
        telefono: document.getElementById('perTelefono').value.trim(),
        correo: document.getElementById('perCorreo').value.trim(),
        fechaIngreso: document.getElementById('perFechaIngreso').value,
        cargo: document.getElementById('perCargo').value.trim(),
        departamento: document.getElementById('perDepartamento').value, // Recoge el valor seleccionado del select
        estadoLaboral: document.getElementById('perEstadoLaboral').value,
        direccion: document.getElementById('perDireccion').value.trim()
    };

   try {
        const respuesta = await window.apiApp.registrarNuevoPersonal(datosPersonal);
        if (respuesta.success) {
            mostrarMensaje('Éxito', '¡Trabajador registrado exitosamente en la base de datos!');
            document.getElementById('formRegistroPersonal').reset();
            // Recargamos el selector por si acaso se creó uno nuevo
            cargarDepartamentosEnSelector();
        } else {
            mostrarMensaje('Error', 'Error al guardar en personal.personal: ' + respuesta.error);
        }
    } catch (err) {
        mostrarMensaje('Error', 'Error de comunicación con el proceso principal.');
    }
});


// 5. Función para cargar y filtrar la tabla
function filtrarTabla() {
    const input = document.getElementById("filtroPersonal");
    const filtro = input.value.toUpperCase();
    const tabla = document.getElementById("tablaPersonal");
    const tr = tabla.getElementsByTagName("tr");

    for (let i = 1; i < tr.length; i++) {
        const textoFila = tr[i].textContent || tr[i].innerText;
        tr[i].style.display = textoFila.toUpperCase().indexOf(filtro) > -1 ? "" : "none";
    }
}

// Actualización de la función que pinta la tabla
async function cargarTablaPersonal() {
    const cuerpoTabla = document.getElementById('cuerpoTablaPersonal');
    const respuesta = await window.apiApp.obtenerPersonal();
    
    if (respuesta.success) {
        cuerpoTabla.innerHTML = '';
        respuesta.personal.forEach(p => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td><input type="radio" name="selPersonal" value="${p.cedula}"></td>
                <td>${p.cedula}</td>
                <td>${p.nombre}</td>
                <td>${p.apellido}</td>
                <td>${p.departamento}</td>
                <td>${p.cargo}</td>
                <td>${p.estado_laboral}</td>
                <td></td>
            `;
            cuerpoTabla.appendChild(fila);
        });
    }
}

function modificarPersonal(cedula) {
     mostrarMensaje('Redirigiendo a edición para:' + cedula, 'Se abrirá el formulario de edición para este personal.');
    document.getElementById('modalEdicion').style.display = 'none';
    // Aquí puedes llamar a una función que cargue los datos en el formulario
    // y cambie de sub-vista a 'registro-personal'
}

// 6.funcion para modificar personal
function abrirEdicion() {
    const radio = document.querySelector('input[name="selPersonal"]:checked');
    if (!radio) return  mostrarMensaje('error', 'Por favor, seleccione un personal para modificar.');
    document.getElementById('modalEdicion').style.display = 'none'; 
     
  

    const fila = radio.closest('tr');
    const celdas = fila.getElementsByTagName('td');

    document.getElementById('editCedulaOriginal').value = celdas[1].textContent;
    document.getElementById('editCedula').value = celdas[1].textContent;
    document.getElementById('editNombre').value = celdas[2].textContent;
    document.getElementById('editApellido').value = celdas[3].textContent;
    document.getElementById('editDepartamento').value = celdas[4].textContent;
    document.getElementById('editCargo').value = celdas[5].textContent;
    document.getElementById('editEstado').value = celdas[6].textContent;
    
    document.getElementById('modalEdicion').style.display = 'block';
}
// Envío de actualización
document.getElementById('formEdicion').addEventListener('submit', async (e) => {
    e.preventDefault(); // ¡Esto es lo más importante! Evita que la página se reinicie

    const datos = {
        cedulaOriginal: document.getElementById('editCedulaOriginal').value,
        cedula: document.getElementById('editCedula').value,
        nombre: document.getElementById('editNombre').value,
        apellido: document.getElementById('editApellido').value,
        departamento: document.getElementById('editDepartamento').value,
        cargo: document.getElementById('editCargo').value,
        estado: document.getElementById('editEstado').value
    };

    const respuesta = await window.apiApp.actualizarPersonal(datos);

    if (respuesta.success) {
        mostrarMensaje('Éxito', 'Datos actualizados correctamente');
    document.getElementById('modalEdicion').style.display = 'none';
        cargarTablaPersonal(); // Refresca la tabla
    } else  {
    mostrarMensaje('Error', respuesta.error);
    // Como el modal no es bloqueante, el foco funcionará perfectamente
    document.getElementById('editNombre').focus(); 
}
});




// Lógica para mostrar / ocultar contraseña
const txtPassword = document.getElementById('loginPassword');
const btnTogglePassword = document.getElementById('togglePassword');

btnTogglePassword.addEventListener('click', function () {
    // Revisamos el tipo actual del input
    const tipoActual = txtPassword.getAttribute('type');
    
    if (tipoActual === 'password') {
        txtPassword.setAttribute('type', 'text');
        this.textContent = '🙈'; // Cambia el icono si lo deseas
    } else {
        txtPassword.setAttribute('type', 'password');
        this.textContent = '👁️';
    }
});

// Función para mostrar el modal
function mostrarMensaje(titulo, mensaje) {
    document.getElementById('modalTitulo').textContent = titulo;
    document.getElementById('modalMensaje').textContent = mensaje;
    document.getElementById('modalGlobal').style.display = 'flex';
}

// Función para cerrar el modal
function cerrarModalGlobal() {
    document.getElementById('modalGlobal').style.display = 'none';
}

=======
// 1. Función global de navegación entre vistas
function navegarA(idVista) {
    // Quita la clase 'activa' de todas las vistas
    document.querySelectorAll('.vista').forEach(vista => {
        vista.classList.remove('activa');
    });
    
    // Añade la clase 'activa' a la vista seleccionada
    const vistaDestino = document.getElementById(idVista);
    vistaDestino.classList.add('activa');

    // Si el usuario va a registrarse, cargamos dinámicamente los roles de la BD
    if (idVista === 'vistaRegistro') {
        cargarRolesEnSelector();
    }
}

// 2. Función para rellenar el selector de roles desde PostgreSQL
async function cargarRolesEnSelector() {
    const selectRoles = document.getElementById('selectRoles');
    selectRoles.innerHTML = '<option value="">-- Seleccione un Rol --</option>';

    try {
        const respuesta = await window.apiApp.obtenerRolesActivos();
        
        if (respuesta.success) {
            if (respuesta.roles.length === 0) {
                selectRoles.innerHTML = '<option value="">No hay roles activos disponibles</option>';
                return;
            }
            
            respuesta.roles.forEach(rol => {
                const option = document.createElement('option');
                option.value = rol.id_rol;         
                option.textContent = rol.nombre_rol; 
                selectRoles.appendChild(option);
            });
        } else {
            console.error("Error BD:", respuesta.error);
            selectRoles.innerHTML = '<option value="">Error al conectar con seguridad.roles</option>';
        }
    } catch (err) {
        console.error("Error de comunicación:", err);
    }
}

// ==========================================
// 3. ESCUCHADORES DE EVENTOS (FORMULARIOS)
// ==========================================

// Escucha para el envío del formulario de Registro
document.getElementById('formRegistro').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Capturar los valores de las cajas de texto
    const nombre = document.querySelector('#formRegistro input[placeholder="Ej: Juan Pérez"]').value.trim();
    const cedula = document.getElementById('regCedula').value.trim();
    const password = document.querySelector('#formRegistro input[type="password"]').value;
    const idRol = document.getElementById('selectRoles').value;

    // Validaciones rápidas en el cliente
    if (!idRol) {
        mostrarMensaje('Por favor, seleccione un rol válido.', 'No se puede registrar un usuario sin asignarle un rol.');
            document.getElementById('modalEdicion').style.display = 'none';
        
        return;
    }
    if (password.length < 8) {
        mostrarMensaje('Error', 'La contraseña debe tener al menos 8 caracteres.');
        return;
    }

    const datosRegistro = {
        usuario: cedula,
        nombre: nombre,
        cedula: cedula,
        password: password,
        idRol: parseInt(idRol)
    };

    try {
        // Enviar los datos estructurados al Main Process de Electron
        const respuesta = await window.apiApp.registrarNuevoUsuario(datosRegistro);

        if (respuesta.success) {
            mostrarMensaje('¡Usuario registrado exitosamente en el esquema de seguridad!', 'El usuario ahora puede iniciar sesión con sus credenciales.');
            document.getElementById('modalEdicion').style.display = 'none';
            
            document.getElementById('formRegistro').reset(); // Limpiar cajas de texto
            navegarA('vistaBienvenida'); // Regresar al menú
        } else {
            mostrarMensaje('Error', 'Error al registrar: ' + respuesta.error);
        }
    } catch (error) {
        console.error('Error en la comunicación:', error);
        mostrarMensaje('Error', 'Ocurrió un error inesperado al procesar el registro.');
    }
});

// Busca el formulario de login en tu renderer.js (ajusta el ID si se llama diferente)
document.getElementById('formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Capturamos los datos de los inputs del Login
    const usuarioInput = document.getElementById('loginUsuario').value.trim();
    const passwordInput = document.getElementById('loginPassword').value;

    // Llamamos al proceso principal
    const respuesta = await window.apiApp.iniciarSesion({ 
        usuario: usuarioInput, 
        password: passwordInput 
    });

    if (respuesta.success) {
        // ¡Login correcto! Evaluamos el rol para saber a dónde mandarlo
        if (respuesta.rol === 'ADMIN_SISTEMA' || respuesta.rol === 'RRHH') {
            
            mostrarMensaje(`¡Bienvenido al sistema! Rol detectado: ${respuesta.rol}`);
            document.getElementById('modalEdicion').style.display = 'none';
            
            // Llamamos a la función que armamos en el paso anterior para abrir la vista de RRHH
            irAModuloRRHH(usuarioInput, respuesta.rol); 
        } else {
            mostrarMensaje(`Inicio de sesión correcto con rol: ${respuesta.rol}. Redirigiendo...`, 'Se redirigirá a la vista correspondiente.');
            // Aquí puedes mandar a otras vistas (médicos, citas, etc.) según corresponda
        }
    } else {
        // Si las credenciales fallan o no coinciden
        mostrarMensaje('Error', respuesta.error);
    // Como el modal no es bloqueante, el foco funcionará perfectamente
        document.getElementById('editNombre').focus();
    }
});




  
// 1. FUNCIÓN PRINCIPAL: Muestra la pantalla de RRHH y oculta el Login/Bienvenida
function irAModuloRRHH(usuario, rol) {
// Rellenar datos en el Header
    document.getElementById('headerNombreUsuario').textContent = `Usuario: ${usuario}`;
    document.getElementById('headerRolUsuario').textContent = `Rol: ${rol}`;
// Rellenar datos en el Header
    document.getElementById('headerNombreUsuario').textContent = `Usuario: ${usuario}`;
    document.getElementById('headerRolUsuario').textContent = `Rol: ${rol}`;

// CORRECCIÓN: Forzamos la visualización con estilo en línea directo al DOM
    const header = document.getElementById('headerUsuario');
    header.style.setProperty('display', 'block', 'important');

    // CORRECCIÓN: Le quitamos la clase 'activa' a la vista de login para que el CSS permita ocultarla
    document.getElementById('vistaLogin').classList.remove('activa');
    document.getElementById('vistaBienvenida').classList.remove('activa');
    
    // Ocultas tus otras pantallas principales por manipulación directa de estilo
    document.getElementById('vistaLogin').style.display = 'none'; 
    document.getElementById('vistaBienvenida').style.display = 'none';
    
    // Muestras la pantalla de RRHH
    document.getElementById('vistaRRHH').style.display = 'block';
    
  cargarDepartamentosEnSelector();
    // Por defecto, que arranque mostrando el formulario de registro de personal
    navegarRRHH('registro-personal');
}
async function cargarDepartamentosEnSelector() {
    const selectDep = document.getElementById('perDepartamento');
    selectDep.innerHTML = '<option value="">-- Seleccione Departamento --</option>';

    try {
        const respuesta = await window.apiApp.obtenerDepartamentos();
        if (respuesta.success) {
            // Si la tabla está vacía, añadimos opciones básicas por defecto
            if (respuesta.departamentos.length === 0) {
                const opcionesPorDefecto = ['Sistemas', 'Recursos Humanos', 'Administración', 'Mantenimiento'];
                opcionesPorDefecto.forEach(dep => {
                    const option = document.createElement('option');
                    option.value = dep;
                    option.textContent = dep;
                    selectDep.appendChild(option);
                });
                return;
            }
            
            respuesta.departamentos.forEach(row => {
                const option = document.createElement('option');
                option.value = row.departamento;         
                option.textContent = row.departamento; 
                selectDep.appendChild(option);
            });
        }
    } catch (err) {
        console.error("Error cargando departamentos:", err);
    }
}



// 2. FUNCIÓN DE CERRAR SESIÓN
function cerrarSesion() {
    if (confirm('¿Está seguro de que desea cerrar su sesión actual?')) {
        // 1. Limpiar formularios
        document.getElementById('formLogin').reset();
        
        // 2. FORZAR el ocultado de todos los contenedores de sistema
        const elementosSistema = [
            'headerUsuario', 
            'vistaRRHH', 
            'modalEdicion', 
            'modalGlobal'
        ];
        
        elementosSistema.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // 3. Restaurar la navegación a la vista de bienvenida
        navegarA('vistaBienvenida');
        
        // 4. Quitar cualquier foco residual
        if (document.activeElement) document.activeElement.blur();
        
        console.log("Sesión cerrada correctamente");
    }
}
// 3. FUNCIÓN INTERNA: Cambia el contenido según lo que elijan en el menú desplegable de RRHH
function navegarRRHH(subVista) {
    // Primero ocultamos las 3 sub-vistas de RRHH
    document.getElementById('sub-registro-personal').style.display = 'none';
    document.getElementById('sub-nomina').style.display = 'none';
    document.getElementById('sub-ver-personal').style.display = 'none';

    // Mostramos únicamente la que el usuario seleccionó
    if (subVista === 'registro-personal') {
        document.getElementById('sub-registro-personal').style.display = 'block';
    } else if (subVista === 'nomina') {
        document.getElementById('sub-nomina').style.display = 'block';
    } else if (subVista === 'ver-personal') {
        document.getElementById('sub-ver-personal').style.display = 'block';
        cargarTablaPersonal();
    }
}

// 4. CAPTURADOR: Escuchar cuando envíen el formulario de registro de personal
document.getElementById('formRegistroPersonal').addEventListener('submit', async (e) => {
    e.preventDefault();

    const datosPersonal = {
        cedula: document.getElementById('perCedula').value.trim(),
        nombre: document.getElementById('perNombre').value.trim(),
        apellido: document.getElementById('perApellido').value.trim(),
        sexo: document.getElementById('perSexo').value,
        fechaNac: document.getElementById('perFechaNac').value,
        lugarNac: document.getElementById('perLugarNac').value.trim(), 
        telefono: document.getElementById('perTelefono').value.trim(),
        correo: document.getElementById('perCorreo').value.trim(),
        fechaIngreso: document.getElementById('perFechaIngreso').value,
        cargo: document.getElementById('perCargo').value.trim(),
        departamento: document.getElementById('perDepartamento').value, // Recoge el valor seleccionado del select
        estadoLaboral: document.getElementById('perEstadoLaboral').value,
        direccion: document.getElementById('perDireccion').value.trim()
    };

   try {
        const respuesta = await window.apiApp.registrarNuevoPersonal(datosPersonal);
        if (respuesta.success) {
            mostrarMensaje('Éxito', '¡Trabajador registrado exitosamente en la base de datos!');
            document.getElementById('formRegistroPersonal').reset();
            // Recargamos el selector por si acaso se creó uno nuevo
            cargarDepartamentosEnSelector();
        } else {
            mostrarMensaje('Error', 'Error al guardar en personal.personal: ' + respuesta.error);
        }
    } catch (err) {
        mostrarMensaje('Error', 'Error de comunicación con el proceso principal.');
    }
});


// 5. Función para cargar y filtrar la tabla
function filtrarTabla() {
    const input = document.getElementById("filtroPersonal");
    const filtro = input.value.toUpperCase();
    const tabla = document.getElementById("tablaPersonal");
    const tr = tabla.getElementsByTagName("tr");

    for (let i = 1; i < tr.length; i++) {
        const textoFila = tr[i].textContent || tr[i].innerText;
        tr[i].style.display = textoFila.toUpperCase().indexOf(filtro) > -1 ? "" : "none";
    }
}

// Actualización de la función que pinta la tabla
async function cargarTablaPersonal() {
    const cuerpoTabla = document.getElementById('cuerpoTablaPersonal');
    const respuesta = await window.apiApp.obtenerPersonal();
    
    if (respuesta.success) {
        cuerpoTabla.innerHTML = '';
        respuesta.personal.forEach(p => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td><input type="radio" name="selPersonal" value="${p.cedula}"></td>
                <td>${p.cedula}</td>
                <td>${p.nombre}</td>
                <td>${p.apellido}</td>
                <td>${p.departamento}</td>
                <td>${p.cargo}</td>
                <td>${p.estado_laboral}</td>
                <td></td>
            `;
            cuerpoTabla.appendChild(fila);
        });
    }
}

function modificarPersonal(cedula) {
     mostrarMensaje('Redirigiendo a edición para:' + cedula, 'Se abrirá el formulario de edición para este personal.');
    document.getElementById('modalEdicion').style.display = 'none';
    // Aquí puedes llamar a una función que cargue los datos en el formulario
    // y cambie de sub-vista a 'registro-personal'
}

// 6.funcion para modificar personal
function abrirEdicion() {
    const radio = document.querySelector('input[name="selPersonal"]:checked');
    if (!radio) return  mostrarMensaje('error', 'Por favor, seleccione un personal para modificar.');
    document.getElementById('modalEdicion').style.display = 'none'; 
     
  

    const fila = radio.closest('tr');
    const celdas = fila.getElementsByTagName('td');

    document.getElementById('editCedulaOriginal').value = celdas[1].textContent;
    document.getElementById('editCedula').value = celdas[1].textContent;
    document.getElementById('editNombre').value = celdas[2].textContent;
    document.getElementById('editApellido').value = celdas[3].textContent;
    document.getElementById('editDepartamento').value = celdas[4].textContent;
    document.getElementById('editCargo').value = celdas[5].textContent;
    document.getElementById('editEstado').value = celdas[6].textContent;
    
    document.getElementById('modalEdicion').style.display = 'block';
}
// Envío de actualización
document.getElementById('formEdicion').addEventListener('submit', async (e) => {
    e.preventDefault(); // ¡Esto es lo más importante! Evita que la página se reinicie

    const datos = {
        cedulaOriginal: document.getElementById('editCedulaOriginal').value,
        cedula: document.getElementById('editCedula').value,
        nombre: document.getElementById('editNombre').value,
        apellido: document.getElementById('editApellido').value,
        departamento: document.getElementById('editDepartamento').value,
        cargo: document.getElementById('editCargo').value,
        estado: document.getElementById('editEstado').value
    };

    const respuesta = await window.apiApp.actualizarPersonal(datos);

    if (respuesta.success) {
        mostrarMensaje('Éxito', 'Datos actualizados correctamente');
    document.getElementById('modalEdicion').style.display = 'none';
        cargarTablaPersonal(); // Refresca la tabla
    } else  {
    mostrarMensaje('Error', respuesta.error);
    // Como el modal no es bloqueante, el foco funcionará perfectamente
    document.getElementById('editNombre').focus(); 
}
});




// Lógica para mostrar / ocultar contraseña
const txtPassword = document.getElementById('loginPassword');
const btnTogglePassword = document.getElementById('togglePassword');

btnTogglePassword.addEventListener('click', function () {
    // Revisamos el tipo actual del input
    const tipoActual = txtPassword.getAttribute('type');
    
    if (tipoActual === 'password') {
        txtPassword.setAttribute('type', 'text');
        this.textContent = '🙈'; // Cambia el icono si lo deseas
    } else {
        txtPassword.setAttribute('type', 'password');
        this.textContent = '👁️';
    }
});

// Función para mostrar el modal
function mostrarMensaje(titulo, mensaje) {
    document.getElementById('modalTitulo').textContent = titulo;
    document.getElementById('modalMensaje').textContent = mensaje;
    document.getElementById('modalGlobal').style.display = 'flex';
}

// Función para cerrar el modal
function cerrarModalGlobal() {
    document.getElementById('modalGlobal').style.display = 'none';
}

>>>>>>> 9d584b1b6357a6f57d775dd813fd0424a0bef228
