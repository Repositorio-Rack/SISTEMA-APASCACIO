<<<<<<< HEAD
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('apiApp', {
  obtenerRolesActivos: () => ipcRenderer.invoke('obtener-roles-activos'),
  obtenerDepartamentos: () => ipcRenderer.invoke('obtener-departamentos'),
  obtenerPersonal: () => ipcRenderer.invoke('obtener-personal'),
  actualizarPersonal: (datos) => ipcRenderer.invoke('actualizar-personal', datos),
  registrarNuevoPersonal: (datos) => ipcRenderer.invoke('registrar-nuevo-personal', datos),
  registrarNuevoUsuario: (datos) => ipcRenderer.invoke('registrar-nuevo-usuario', datos),

  iniciarSesion: (datos) => ipcRenderer.invoke('iniciar-sesion', datos)
});
=======
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('apiApp', {
  obtenerRolesActivos: () => ipcRenderer.invoke('obtener-roles-activos'),
  obtenerDepartamentos: () => ipcRenderer.invoke('obtener-departamentos'),
  obtenerPersonal: () => ipcRenderer.invoke('obtener-personal'),
  actualizarPersonal: (datos) => ipcRenderer.invoke('actualizar-personal', datos),
  registrarNuevoPersonal: (datos) => ipcRenderer.invoke('registrar-nuevo-personal', datos),
  registrarNuevoUsuario: (datos) => ipcRenderer.invoke('registrar-nuevo-usuario', datos),

  iniciarSesion: (datos) => ipcRenderer.invoke('iniciar-sesion', datos)
});
>>>>>>> 9d584b1b6357a6f57d775dd813fd0424a0bef228
