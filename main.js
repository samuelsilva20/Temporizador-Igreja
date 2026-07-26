const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const temBloqueio = app.requestSingleInstanceLock();

if (!temBloqueio) {
    app.quit();
}

let janelaPrincipal = null;
const janelasDeSaida = { palco: null, retorno: null };
let estadoAtual = null;

function criarJanelaPrincipal() {
    const monitorPrincipal = screen.getPrimaryDisplay();

    janelaPrincipal = new BrowserWindow({
        show: false,
        x: monitorPrincipal.bounds.x + 40,
        y: monitorPrincipal.bounds.y + 40,
        width: Math.min(1400, monitorPrincipal.bounds.width - 80),
        height: Math.min(900, monitorPrincipal.bounds.height - 80),

        icon: path.join(__dirname, 'assets', 'icon.ico'),

        backgroundColor: '#000000',
        autoHideMenuBar: true,

        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    janelaPrincipal.loadFile(path.join(__dirname, 'src', 'temporizador.html'));

    janelaPrincipal.once('ready-to-show', () => {
        janelaPrincipal.maximize();
        janelaPrincipal.show();
    });

    janelaPrincipal.removeMenu();

    janelaPrincipal.on('closed', () => {
        janelaPrincipal = null;
    });
}

function obterInformacaoMonitores() {
    const monitorPrincipal = screen.getPrimaryDisplay();

    return screen.getAllDisplays().map((monitor, indice) => ({
        id: String(monitor.id),
        indice,
        principal: monitor.id === monitorPrincipal.id,
        x: monitor.bounds.x,
        y: monitor.bounds.y,
        largura: monitor.bounds.width,
        altura: monitor.bounds.height,
        escala: monitor.scaleFactor
    }));
}

function enviarEstadoParaTelas() {
    if (!estadoAtual) {
        return;
    }

    Object.values(janelasDeSaida).forEach((janela) => {
        if (janela && !janela.isDestroyed()) {
            try {
                janela.webContents.send('estado-temporizador', estadoAtual);
            } catch (erro) {
                console.error('Erro ao enviar estado para janela de saída:', erro);
            }
        }
    });
}

function obterEstadoTelas() {
    return {
        palco: Boolean(
            janelasDeSaida.palco &&
            !janelasDeSaida.palco.isDestroyed()
        ),
        retorno: Boolean(
            janelasDeSaida.retorno &&
            !janelasDeSaida.retorno.isDestroyed()
        )
    };
}

function enviarEstadoTelasParaOperador() {
    if (janelaPrincipal && !janelaPrincipal.isDestroyed()) {
        janelaPrincipal.webContents.send(
            'estado-telas',
            obterEstadoTelas()
        );
    }
}

function fecharTelasDeSaida() {
    Object.values(janelasDeSaida).forEach((janela) => {
        if (janela && !janela.isDestroyed()) {
            janela.close();
        }
    });
}

function criarTelaDeSaida(tipo, monitor) {
    const janelaAnterior = janelasDeSaida[tipo];

    if (janelaAnterior && !janelaAnterior.isDestroyed()) {
        janelaAnterior.close();
    }

    const janela = new BrowserWindow({
        x: monitor.bounds.x,
        y: monitor.bounds.y,
        width: monitor.bounds.width,
        height: monitor.bounds.height,
        frame: false,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        closable: true,
        skipTaskbar: true,
        backgroundColor: '#000000',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    janelasDeSaida[tipo] = janela;
    enviarEstadoTelasParaOperador();

    janela.removeMenu();

    const arquivoHtml = path.join(__dirname, 'src', 'temporizador.html');
    const urlExportada = new URL(pathToFileURL(arquivoHtml).toString());
    urlExportada.searchParams.set('modo', 'exportado');
    urlExportada.searchParams.set('tela', tipo);

    janela.loadURL(urlExportada.toString());

    janela.webContents.on('did-finish-load', () => {
        janela.setFullScreen(true);
        setTimeout(() => {
            enviarEstadoParaTelas();
        }, 150);
    });

    janela.on('closed', () => {
        if (janelasDeSaida[tipo] === janela) {
            janelasDeSaida[tipo] = null;
            enviarEstadoTelasParaOperador();
        }
    });
}

ipcMain.handle('detetar-monitores', () => obterInformacaoMonitores());

function abrirOuAlternarTela(tipo, idMonitor, alternar = true) {
    if (!['palco', 'retorno'].includes(tipo)) {
        return { sucesso: false, mensagem: 'Tipo de tela inválido.' };
    }

    const janelaExistente = janelasDeSaida[tipo];

    if (alternar && janelaExistente && !janelaExistente.isDestroyed()) {
        janelaExistente.close();
        return { sucesso: true, ativa: false };
    }

    const monitorPrincipal = screen.getPrimaryDisplay();
    const monitor = screen.getAllDisplays().find(
        (item) => String(item.id) === String(idMonitor)
    );

    if (!monitor) {
        return { sucesso: false, mensagem: 'Monitor não encontrado.' };
    }

    if (String(monitor.id) === String(monitorPrincipal.id)) {
        return { sucesso: false, mensagem: 'Seleciona um monitor secundário para a projeção ou retorno.' };
    }

    criarTelaDeSaida(tipo, monitor);
    return { sucesso: true, ativa: true };
}

ipcMain.handle('abrir-tela', (event, tipo, idMonitor) => abrirOuAlternarTela(tipo, idMonitor, false));

ipcMain.handle('alternar-tela', (event, tipo, idMonitor) => abrirOuAlternarTela(tipo, idMonitor, true));

ipcMain.handle('exportar-temporizador', (event, idMonitor) => abrirOuAlternarTela('palco', idMonitor, false));

ipcMain.on('estado-temporizador', (event, estado) => {
    estadoAtual = estado;
    enviarEstadoParaTelas();
});

ipcMain.on('sair-temporizador', () => {
    estadoAtual = null;
    fecharTelasDeSaida();
    enviarEstadoTelasParaOperador();
});

app.on('web-contents-created', (event, contents) => {

    contents.on('before-input-event', (event, input) => {

        const tecla = (input.key || '').toUpperCase();

        const abrirDevTools =
            tecla === 'F12' ||
            (input.control && input.shift && tecla === 'I') ||
            (input.control && input.shift && tecla === 'J');

        if (abrirDevTools) {
            event.preventDefault();
        }

    });

    contents.setWindowOpenHandler(() => ({
        action: 'deny'
    }));

    contents.on('will-navigate', (event) => {
        event.preventDefault();
    });

});

app.on('second-instance', () => {

    if (!janelaPrincipal) {
        return;
    }

    if (janelaPrincipal.isMinimized()) {
        janelaPrincipal.restore();
    }

    janelaPrincipal.focus();

});

app.whenReady().then(() => {
    criarJanelaPrincipal();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            criarJanelaPrincipal();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
