const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const EXTENSOES_AUDIO = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];

const temBloqueio = app.requestSingleInstanceLock();

if (!temBloqueio) {
    app.quit();
}

// O backgroundThrottling:false (por janela) só cobre janelas escondidas/minimizadas.
// O Chromium tem um mecanismo separado (Intensive Wake Up Throttling) que continua a
// atrasar setInterval/setTimeout em janelas visíveis mas sem foco, o que fazia a
// contagem saltar números ou parar momentaneamente. Desativa-se ao nível da app.
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-features', 'IntensiveWakeUpThrottling,CalculateNativeWinOcclusion');

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
            nodeIntegration: false,
            backgroundThrottling: false
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

function obterCaminhoAudioLocal() {
    const base = app.isPackaged
        ? path.dirname(process.execPath)
        : __dirname;

    return path.join(base, 'audio-local');
}

function listarAudiosLocais() {
    try {
        return fs.readdirSync(obterCaminhoAudioLocal())
            .filter((nome) => EXTENSOES_AUDIO.includes(path.extname(nome).toLowerCase()))
            .sort((a, b) => a.localeCompare(b, 'pt'))
            .map((nome) => ({
                nome,
                url: pathToFileURL(path.join(obterCaminhoAudioLocal(), nome)).toString()
            }));
    } catch (erro) {
        return [];
    }
}

ipcMain.handle('listar-audios-locais', () => listarAudiosLocais());

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
        show: false,
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
            nodeIntegration: false,
            backgroundThrottling: false
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

    let janelaJaMostrada = false;

    function mostrarJanelaQuandoPronta() {
        if (janelaJaMostrada || janela.isDestroyed()) {
            return;
        }

        janelaJaMostrada = true;
        janela.show();
    }

    janela.webContents.on('did-finish-load', () => {
        // Esconde-se até estar em fullscreen com o estado real já aplicado,
        // para não se ver por instantes o painel do operador (#painel-config)
        // antes do JS o esconder (iniciarModoExportado()).
        janela.setFullScreen(true);
        enviarEstadoParaTelas();

        // Rede de segurança: se por algum motivo o evento 'enter-full-screen'
        // não disparar, a janela não deve ficar escondida para sempre.
        setTimeout(mostrarJanelaQuandoPronta, 2000);
    });

    janela.once('enter-full-screen', () => {
        setTimeout(mostrarJanelaQuandoPronta, 30);
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
