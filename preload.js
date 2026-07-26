const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    detetarMonitores: () => ipcRenderer.invoke('detetar-monitores'),
    alternarTela: (tipo, idMonitor) =>
        ipcRenderer.invoke('alternar-tela', tipo, idMonitor),
    abrirTela: (tipo, idMonitor) =>
        ipcRenderer.invoke('abrir-tela', tipo, idMonitor),
    exportarTemporizador: (idMonitor) =>
        ipcRenderer.invoke('exportar-temporizador', idMonitor),
    enviarEstado: (estado) =>
        ipcRenderer.send('estado-temporizador', estado),
    sairTemporizador: () =>
        ipcRenderer.send('sair-temporizador'),
    aoReceberEstado: (funcao) => {
        ipcRenderer.on('estado-temporizador', (event, estado) => {
            funcao(estado);
        });
    },
    aoReceberEstadoTelas: (funcao) => {
        ipcRenderer.on('estado-telas', (event, estado) => {
            funcao(estado);
        });
    }
});
