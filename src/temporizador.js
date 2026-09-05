let tempoRestante = 0;
let tempoMaximoInicial = 0;
let duracaoContagemFinalSegundos = 0;
let limiarExibicaoTempoSegundos = 0;

let intervalo = null;
let temporizadorAtivo = false;
let temporizadorPausado = false;
let modoSabadoAtivo = false;
let momentoPausa = null;

let dataInicioAgendada = null;
let dataFimAgendada = null;
let dataAtivacaoPalco = null;
let dataAtivacaoRetorno = null;
let instanteAtual = null;

let faseTemporizador = 'parado';

let ultimoTextoTempo = '';
let ultimaHoraFormatada = '';

let nomeFicheiroAudioAtual = '';
let arrastandoTimelineAudio = false;
let volumeAnteriorAoMute = 1;
let gatilhoAudioDisparado = false;
let gatilhoAudioAtivo = false;
let ultimoTempoAudioExibido = -1;
let mostrarTempoRestanteAudio = false;

/*
Estados possíveis:
- parado
- aguardaInicio
- contagem
- terminado
*/
let detalhesMonitores = null;


let estadoTelas = {
    palco: false,
    retorno: false
};

const elementos = {
    timer: document.getElementById('timer'),

    timerFase1: document.getElementById('timer-fase1'),
    timerTempo: document.getElementById('timer-tempo'),
    timerHora: document.getElementById('timer-hora'),
    timerContagem: document.getElementById('timer-contagem'),

    painelConfig: document.getElementById('painel-config'),
    estadoExecucao: document.getElementById('estado-execucao'),
    configuracaoHoras: document.getElementById('configuracao-horas'),
    selecaoModo: document.getElementById('selecao-modo'),
    horaInicio: document.getElementById('hora-inicio'),
    horaFim: document.getElementById('hora-alvo'),
    avancadoInicio: document.getElementById('avancado-inicio'),
    avancadoFim: document.getElementById('avancado-fim'),
    duracaoContagemFinal: document.getElementById('duracao-contagem-final'),
    limiarExibicaoTempo: document.getElementById('limiar-exibicao-tempo'),

    configuracaoAtivacaoTelas: document.getElementById('configuracao-ativacao-telas'),
    horaAtivacaoPalco: document.getElementById('hora-ativacao-palco'),
    horaAtivacaoRetorno: document.getElementById('hora-ativacao-retorno'),

    previewPreset: document.getElementById('preview-preset'),

    previewFase1: document.getElementById('preview-fase1'),
    previewTempo: document.getElementById('preview-tempo'),
    previewHora: document.getElementById('preview-hora'),
    previewOperador: document.getElementById('preview-operador'),

    controlosRapidos: document.getElementById('controlos-rapidos'),
    textoAtalhos: document.getElementById('texto-atalhos'),

    estadoMonitor: document.getElementById('estado-monitor'),
    monitorPalco: document.getElementById('monitor-palco'),
    monitorRetorno: document.getElementById('monitor-retorno'),

    audioInput: document.getElementById('audio-input'),
    audioElemento: document.getElementById('audio-elemento'),
    audioBotaoImportar: document.getElementById('audio-botao-importar'),
    audioSelecaoWrapper: document.getElementById('audio-selecao-wrapper'),
    audioSelecaoBotao: document.getElementById('audio-selecao-botao'),
    audioSelecaoTexto: document.getElementById('audio-selecao-texto'),
    audioSelecaoLista: document.getElementById('audio-selecao-lista'),
    audioBotaoPlayPause: document.getElementById('audio-botao-play-pause'),
    audioBotaoStop: document.getElementById('audio-botao-stop'),
    audioTempoAtual: document.getElementById('audio-tempo-atual'),
    audioTimeline: document.getElementById('audio-timeline'),
    audioTempoTotal: document.getElementById('audio-tempo-total'),
    audioBotaoVolume: document.getElementById('audio-botao-volume'),
    audioVolumeSlider: document.getElementById('audio-volume'),
    audioVolumeGrupo: document.getElementById('audio-volume-grupo'),
    audioVolumePopup: document.getElementById('audio-volume-popup'),
    audioBotaoGatilho: document.getElementById('audio-botao-gatilho'),
    audioGatilhoTempo: document.getElementById('audio-gatilho-tempo'),
    audioGatilhoWrapper: document.getElementById('audio-gatilho-wrapper')
};

const modoExportado =
    new URLSearchParams(window.location.search).get('modo') === 'exportado';

const telaTipo =
    new URLSearchParams(window.location.search).get('tela');

const {
    formatarHora,
    aplicarHoraCampo,
    criarConfiguracaoTemporizador
} = window.temporizadorCore || {};

const CORES = {
    branco: 'rgb(255, 255, 255)',
    vermelho: 'rgb(255, 0, 0)'
};

const LIMITES_COR = {
    inicio: 300,
    amarelo: 120,
    vermelho: 30
};

const LIMIAR_EXIBICAO_TEMPO_SEGUNDOS = 60 * 60;

// Altura suficiente para mostrar "Escolher música:" + 4 músicas; mais do
// que isso passa a ficar acessível só com scroll dentro da própria lista.
const ALTURA_MAXIMA_LISTA_AUDIO_PX = 168;

const NOMES_PRESET = {
    sabado: 'SÁBADO',
    personalizado: 'PERSONALIZADO',
    padrao5: 'TESTE'
};

function progressaoSuave(valor) {
    const valorLimitado = Math.max(0, Math.min(1, valor));

    return valorLimitado * valorLimitado * (3 - 2 * valorLimitado);
}

function interpolar(valorInicial, valorFinal, progresso) {
    return Math.round(
        valorInicial +
        (valorFinal - valorInicial) * progresso
    );
}

function obterFaseAtual() {

    if (!dataFimAgendada) {
        return 'parado';
    }

    const agora = new Date();

    if (
        dataInicioAgendada &&
        agora < dataInicioAgendada
    ) {
        return 'aguardandoPublico';
    }

    if (modoSabadoAtivo) {

        const inicioContagemFinalSabado =
            new Date(
                dataFimAgendada.getTime() - duracaoContagemFinalSegundos * 1000
            );

        if (agora < inicioContagemFinalSabado) {
            return 'aguardaInicio';
        }

        if (agora < dataFimAgendada) {
            return 'contagem';
        }

        return 'terminado';
    }

    const inicioContagemFinal =
        new Date(
            dataFimAgendada.getTime() - duracaoContagemFinalSegundos * 1000
        );

    const limiteExibicaoTempo =
        new Date(
            dataFimAgendada.getTime() - limiarExibicaoTempoSegundos * 1000
        );

    const inicioExibicaoTempo =
        dataInicioAgendada
            ? new Date(
                Math.max(
                    dataInicioAgendada.getTime(),
                    limiteExibicaoTempo.getTime()
                )
            )
            : limiteExibicaoTempo;

    if (agora < inicioExibicaoTempo) {
        return 'aguardando';
    }

    if (agora < inicioContagemFinal) {
        return 'aguardaInicio';
    }

    if (agora < dataFimAgendada) {
        return 'contagem';
    }

    return 'terminado';
}

const COR_BRANCO = [255, 255, 255];
const COR_AMARELO_CLARO = [255, 255, 210];
const COR_AMARELO_SUAVE = [255, 255, 150];
const COR_AMARELO = [255, 255, 0];
const COR_LARANJA = [255, 160, 0];
const COR_VERMELHO = [255, 0, 0];

function calcularCor(segundos, duracaoTotalSegundos = LIMITES_COR.inicio) {

    const D = duracaoTotalSegundos;

    function misturar(corInicial, corFinal, progresso) {

        progresso = Math.max(0, Math.min(1, progresso));

        const r =
            Math.round(corInicial[0] + (corFinal[0] - corInicial[0]) * progresso);

        const g =
            Math.round(corInicial[1] + (corFinal[1] - corInicial[1]) * progresso);

        const b =
            Math.round(corInicial[2] + (corFinal[2] - corInicial[2]) * progresso);

        return `rgb(${r},${g},${b})`;
    }

    if (segundos >= 0.8 * D) {
        return misturar(
            COR_BRANCO,
            COR_AMARELO_CLARO,
            (D - segundos) / (0.2 * D)
        );
    }

    if (segundos >= 0.6 * D) {
        return misturar(
            COR_AMARELO_CLARO,
            COR_AMARELO_SUAVE,
            (0.8 * D - segundos) / (0.2 * D)
        );
    }

    if (segundos >= 0.4 * D) {
        return misturar(
            COR_AMARELO_SUAVE,
            COR_AMARELO,
            (0.6 * D - segundos) / (0.2 * D)
        );
    }

    if (segundos >= 0.2 * D) {
        return misturar(
            COR_AMARELO,
            COR_LARANJA,
            (0.4 * D - segundos) / (0.2 * D)
        );
    }

    if (segundos >= 0.1 * D) {
        return misturar(
            COR_LARANJA,
            COR_VERMELHO,
            (0.2 * D - segundos) / (0.1 * D)
        );
    }

    return 'rgb(255,0,0)';
}

function deveExibirTela(dataAtivacao) {
    if (!dataFimAgendada) {
        return false;
    }

    if (
        dataInicioAgendada &&
        instanteAtual < dataInicioAgendada
    ) {
        return false;
    }

    if (!(dataAtivacao instanceof Date)) {
        return false;
    }

    return instanteAtual >= dataAtivacao;
}

function obterEstadoTemporizador(cor) {

    return {

        fase: faseTemporizador,

        tempo:
            ultimoTextoTempo,

        hora:
            ultimaHoraFormatada,

        contagem:
            ultimoTextoTempo,

        mostrarPalco:
            deveExibirTela(dataAtivacaoPalco),

        mostrarRetorno:
            deveExibirTela(dataAtivacaoRetorno),

        cor,

        aPiscar:
            elementos.timer.classList.contains('piscar'),

        ativo:
            temporizadorAtivo,

        pausado:
            temporizadorPausado

    };

}

function atualizarPrevisualizacoes(cor = null) {

    const corAtual =
        cor ||
        CORES.branco;

    const aPiscar =
        elementos.timer.classList.contains('piscar');

    if (faseTemporizador === 'contagem') {

        elementos.previewOperador.style.color =
            corAtual;

        elementos.previewOperador.classList.toggle(
            'piscar',
            aPiscar
        );

    }
    else {

        elementos.previewTempo.style.color =
            corAtual;

    }

}

function enviarEstadoParaMonitor(cor) {
    if (
        modoExportado ||
        !window.electronAPI
    ) {
        return;
    }

    window.electronAPI.enviarEstado(
        obterEstadoTemporizador(cor)
    );
}

function atualizarEstadoOperador() {
    if (modoExportado) {
        return;
    }

    if (!temporizadorAtivo) {
        elementos.estadoExecucao.textContent =
            'PRONTO PARA INICIAR';

        return;
    }

    if (temporizadorPausado) {
        elementos.estadoExecucao.textContent =
            'TEMPORIZADOR EM PAUSA';

        return;
    }

    if (
        tempoRestante === 0 &&
        !modoSabadoAtivo
    ) {
        elementos.estadoExecucao.textContent =
            'TEMPORIZADOR TERMINADO';

        return;
    }

    elementos.estadoExecucao.textContent =
        'TEMPORIZADOR EM EXECUÇÃO';
}

function parseDuracaoParaSegundos(texto, padraoSegundos) {
    const partes =
        String(texto).trim().split(':').map(Number);

    if (
        partes.length === 2 &&
        partes.every(numero => Number.isFinite(numero) && numero >= 0)
    ) {
        const [minutos, segundos] = partes;

        return minutos * 60 + segundos;
    }

    return padraoSegundos;
}

function alternarPainelFlutuante(idWrapper) {
    document.getElementById(idWrapper).classList.toggle('aberto');
}

function ajustesManuaisPermitidos() {
    const modo =
        elementos.selecaoModo.value;

    return modo !== 'sabado' && modo !== 'personalizado';
}

function atualizarControlosRapidos() {
    const permitido =
        ajustesManuaisPermitidos();

    elementos.controlosRapidos.style.display =
        permitido ? '' : 'none';

    elementos.textoAtalhos.style.display =
        permitido ? '' : 'none';
}

function atualizarCamposPorPreset() {
    const modo =
        elementos.selecaoModo.value;

    const agora = new Date();

    atualizarControlosRapidos();

    elementos.avancadoInicio.classList.remove('aberto');
    elementos.avancadoFim.classList.remove('aberto');

    if (modo === 'sabado') {
        elementos.configuracaoHoras.style.display =
            'flex';

        elementos.avancadoInicio.style.display =
            'none';

        elementos.avancadoFim.style.display =
            'none';

        elementos.horaInicio.value =
            formatarHora(agora);

        elementos.horaFim.value =
            '10:50';

        elementos.horaInicio.disabled =
            false;

        elementos.horaFim.disabled =
            false;

        const dataFimSabado =
            new Date(agora);

        dataFimSabado.setHours(10, 50, 0, 0);

        elementos.configuracaoAtivacaoTelas.style.display =
            'flex';

        elementos.horaAtivacaoPalco.value =
            formatarHora(
                new Date(dataFimSabado.getTime() - LIMITES_COR.inicio * 1000)
            );

        elementos.horaAtivacaoRetorno.value =
            elementos.horaInicio.value;

        elementos.horaAtivacaoPalco.disabled =
            false;

        elementos.horaAtivacaoRetorno.disabled =
            false;

        return;
    }

    if (modo === 'personalizado') {
        elementos.configuracaoHoras.style.display =
            'flex';

        elementos.avancadoInicio.style.display =
            '';

        elementos.avancadoFim.style.display =
            '';

        elementos.horaInicio.value =
            formatarHora(agora);

        const dataFimPadrao =
            new Date(
                agora.getTime() + 5 * 60 * 1000
            );

        elementos.horaFim.value =
            formatarHora(dataFimPadrao);

        elementos.horaInicio.disabled =
            false;

        elementos.horaFim.disabled =
            false;

        const duracaoContagemFinalAtual =
            parseDuracaoParaSegundos(
                elementos.duracaoContagemFinal.value,
                LIMITES_COR.inicio
            );

        elementos.configuracaoAtivacaoTelas.style.display =
            'flex';

        elementos.horaAtivacaoPalco.value =
            formatarHora(
                new Date(dataFimPadrao.getTime() - duracaoContagemFinalAtual * 1000)
            );

        elementos.horaAtivacaoRetorno.value =
            elementos.horaInicio.value;

        elementos.horaAtivacaoPalco.disabled =
            false;

        elementos.horaAtivacaoRetorno.disabled =
            false;

        return;
    }

    elementos.configuracaoHoras.style.display =
        'none';

    elementos.avancadoInicio.style.display =
        'none';

    elementos.avancadoFim.style.display =
        'none';

    elementos.horaInicio.disabled =
        true;

    elementos.horaFim.disabled =
        true;

    elementos.configuracaoAtivacaoTelas.style.display =
        'none';

    elementos.horaAtivacaoPalco.disabled =
        true;

    elementos.horaAtivacaoRetorno.disabled =
        true;
}

function prepararTemporizadorSabado() {
    const configuracao =
        criarConfiguracaoTemporizador(
            'sabado',
            elementos.horaInicio.value,
            elementos.horaFim.value,
            new Date()
        );

    dataInicioAgendada =
        configuracao.dataInicio;

    dataFimAgendada =
        configuracao.dataFim;

    tempoRestante =
        configuracao.tempoRestante;

    tempoMaximoInicial =
        configuracao.tempoMaximoInicial;

    duracaoContagemFinalSegundos =
        LIMITES_COR.inicio;

    limiarExibicaoTempoSegundos =
        LIMIAR_EXIBICAO_TEMPO_SEGUNDOS;
}

function iniciarTemporizadorPersonalizado() {
    const configuracao =
        criarConfiguracaoTemporizador(
            'personalizado',
            elementos.horaInicio.value,
            elementos.horaFim.value,
            new Date()
        );

    tempoRestante =
        configuracao.tempoRestante;

    tempoMaximoInicial =
        configuracao.tempoMaximoInicial;

    dataInicioAgendada =
        configuracao.dataInicio;

    dataFimAgendada =
        configuracao.dataFim;

    duracaoContagemFinalSegundos =
        parseDuracaoParaSegundos(
            elementos.duracaoContagemFinal.value,
            LIMITES_COR.inicio
        );

    limiarExibicaoTempoSegundos =
        parseDuracaoParaSegundos(
            elementos.limiarExibicaoTempo.value,
            LIMIAR_EXIBICAO_TEMPO_SEGUNDOS
        );
}

function iniciarTemporizadorPadrao() {
    const configuracao =
        criarConfiguracaoTemporizador(
            'padrao5',
            '',
            '',
            new Date()
        );

    tempoRestante =
        configuracao.tempoRestante;

    tempoMaximoInicial =
        configuracao.tempoMaximoInicial;

    dataInicioAgendada =
        configuracao.dataInicio;

    dataFimAgendada =
        configuracao.dataFim;

    duracaoContagemFinalSegundos =
        LIMITES_COR.inicio;

    limiarExibicaoTempoSegundos =
        LIMIAR_EXIBICAO_TEMPO_SEGUNDOS;
}

function validarEIniciar() {
    const modo =
        elementos.selecaoModo.value;

    pararIntervalo();

    temporizadorAtivo = true;
    temporizadorPausado = false;
    modoSabadoAtivo = modo === 'sabado';
    gatilhoAudioDisparado = false;

    elementos.previewPreset.textContent =
        NOMES_PRESET[modo] || '';

    elementos.previewPreset.style.display =
        'block';

    if (modo === 'sabado') {
        prepararTemporizadorSabado();
    } else if (modo === 'personalizado') {
        iniciarTemporizadorPersonalizado();
    } else {
        iniciarTemporizadorPadrao();
    }

    dataAtivacaoPalco =
        elementos.horaAtivacaoPalco.value
            ? aplicarHoraCampo(dataFimAgendada, elementos.horaAtivacaoPalco.value)
            : new Date(dataInicioAgendada);

    dataAtivacaoRetorno =
        elementos.horaAtivacaoRetorno.value
            ? aplicarHoraCampo(dataInicioAgendada, elementos.horaAtivacaoRetorno.value)
            : new Date(dataInicioAgendada);

    elementos.timer.classList.remove('piscar');

    atualizarContagem();

    iniciarIntervalo();

    atualizarEstadoOperador();
}

function formatarTempo(segundos) {
    const mins =
        Math.floor(segundos / 60);

    const segs =
        segundos % 60;

    if (mins >= 60) {
        const horas =
            Math.floor(mins / 60);

        const minutos =
            mins % 60;

        return [
            horas,
            minutos,
            segs
        ]
            .map(valor =>
                valor.toString().padStart(2, '0')
            )
            .join(':');
    }

    return [
        mins,
        segs
    ]
        .map(valor =>
            valor.toString().padStart(2, '0')
        )
        .join(':');
}

function atualizarContagem() {

    instanteAtual =
        new Date();

    faseTemporizador =
        obterFaseAtual();

    if (
        dataFimAgendada &&
        dataFimAgendada instanceof Date
    ) {

        tempoRestante =
            Math.max(
                0,
                Math.floor(
                    (
                        dataFimAgendada.getTime() -
                        instanteAtual.getTime()
                    ) / 1000
                )
            );

    }
    const texto =
        formatarTempo(tempoRestante);

    ultimoTextoTempo =
        texto;

    const mostrarContagem =
        faseTemporizador === 'contagem';

    const aguardandoPublico =
        faseTemporizador === 'aguardandoPublico';

    const mostrarTempoAteFim =
        faseTemporizador !== 'aguardando' &&
        faseTemporizador !== 'contagem' &&
        faseTemporizador !== 'aguardandoPublico';

    const horaSozinha =
        faseTemporizador === 'aguardando';

    elementos.timerHora.classList.toggle(
        'hora-sozinha',
        horaSozinha
    );

    elementos.previewHora.classList.toggle(
        'hora-sozinha',
        horaSozinha
    );

    elementos.previewTempo.classList.toggle(
        'rotulo-contagem',
        aguardandoPublico
    );

    elementos.previewHora.classList.toggle(
        'valor-contagem',
        aguardandoPublico
    );

    const corAtual =
        calcularCor(tempoRestante, duracaoContagemFinalSegundos);

    elementos.timerFase1.style.display =
        (mostrarContagem || aguardandoPublico) ? 'none' : 'flex';

    elementos.timerContagem.style.display =
        (mostrarContagem && !aguardandoPublico) ? 'block' : 'none';

    elementos.previewFase1.style.display =
        mostrarContagem ? 'none' : 'flex';

    elementos.previewOperador.style.display =
        mostrarContagem ? 'block' : 'none';

    elementos.timerTempo.style.display =
        mostrarTempoAteFim ? '' : 'none';

    elementos.previewTempo.style.display =
        (mostrarTempoAteFim || aguardandoPublico) ? '' : 'none';

    const horaAtual =
        instanteAtual.toLocaleTimeString(
            'pt-PT',
            {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }
        );

    ultimaHoraFormatada =
        horaAtual;

    if (aguardandoPublico) {

        const tempoAteInicio =
            Math.max(
                0,
                Math.floor(
                    (
                        dataInicioAgendada.getTime() -
                        instanteAtual.getTime()
                    ) / 1000
                )
            );

        elementos.previewTempo.textContent =
            'Contagem em:';

        elementos.previewHora.textContent =
            formatarTempo(tempoAteInicio);

    }
    else if (!mostrarContagem) {

        elementos.previewTempo.textContent =
            texto;

        elementos.timerTempo.textContent =
            texto;

        elementos.previewHora.textContent =
            horaAtual;

        elementos.timerHora.textContent =
            horaAtual;

    }
    else {

        elementos.previewOperador.textContent =
            texto;

        elementos.timerContagem.textContent =
            texto;

    }

    elementos.timer.classList.toggle(
        'piscar',
        tempoRestante === 0
    );

    atualizarPrevisualizacoes(corAtual);

    enviarEstadoParaMonitor(corAtual);

    atualizarEstadoOperador();

    verificarGatilhoAudio();

    if (tempoRestante === 0) {
        pararIntervalo();

        return;
    }

    if (!modoSabadoAtivo) {
        tempoRestante--;
    }
}

function iniciarIntervalo() {
    const atraso =
        1000 - (Date.now() % 1000);

    intervalo = setTimeout(
        () => {
            atualizarContagem();

            if (intervalo !== null) {
                iniciarIntervalo();
            }
        },
        atraso
    );
}

function pararIntervalo() {
    if (intervalo !== null) {
        clearTimeout(intervalo);
        intervalo = null;
    }
}

function alterarTempo(segundos) {
    if (!ajustesManuaisPermitidos()) {
        return;
    }

    tempoRestante =
        Math.max(
            0,
            tempoRestante + segundos
        );

    if (dataFimAgendada instanceof Date) {
        dataFimAgendada =
            new Date(
                dataFimAgendada.getTime() + segundos * 1000
            );
    }

    elementos.timer.classList.remove('piscar');

    if (
        temporizadorAtivo &&
        !temporizadorPausado &&
        intervalo === null &&
        tempoRestante > 0
    ) {
        iniciarIntervalo();
    }

    atualizarContagem();
}

function alternarPausa() {
    if (!ajustesManuaisPermitidos()) {
        return;
    }

    if (!temporizadorAtivo) {
        return;
    }

    temporizadorPausado =
        !temporizadorPausado;

    if (temporizadorPausado) {
        momentoPausa =
            new Date();

        pararIntervalo();

        atualizarEstadoOperador();

        enviarEstadoParaMonitor(
            elementos.timer.style.color ||
            CORES.branco
        );

        return;
    }

    if (momentoPausa) {
        const duracaoPausa =
            Date.now() - momentoPausa.getTime();

        if (dataInicioAgendada instanceof Date) {
            dataInicioAgendada =
                new Date(
                    dataInicioAgendada.getTime() + duracaoPausa
                );
        }

        if (dataFimAgendada instanceof Date) {
            dataFimAgendada =
                new Date(
                    dataFimAgendada.getTime() + duracaoPausa
                );
        }

        momentoPausa = null;
    }

    elementos.timer.classList.remove('piscar');

    if (intervalo === null) {
        iniciarIntervalo();
    }

    atualizarContagem();
}

async function detetarMonitores() {
    if (!window.electronAPI) {
        elementos.estadoMonitor.textContent =
            'Electron não está disponível.';

        return;
    }

    try {
        elementos.estadoMonitor.textContent =
            'A detetar monitores...';

        detalhesMonitores =
            await window.electronAPI.detetarMonitores();

        const selecoes = [
            elementos.monitorPalco,
            elementos.monitorRetorno
        ];

        selecoes.forEach((selecao) => {
            selecao.innerHTML = '';

            detalhesMonitores.forEach((monitor) => {
                const opcao =
                    document.createElement('option');

                const identificacao =
                    monitor.principal
                        ? `Monitor ${monitor.indice + 1} — PRINCIPAL`
                        : `Monitor ${monitor.indice + 1}`;

                const posicaoHorizontal =
                    monitor.x > 0
                        ? 'DIREITA'
                        : monitor.x < 0
                            ? 'ESQUERDA'
                            : '';

                opcao.value =
                    monitor.id;

                opcao.textContent =
                    posicaoHorizontal
                        ? `${identificacao} — ${posicaoHorizontal}`
                        : identificacao;

                selecao.appendChild(opcao);
            });

            selecao.disabled = false;
        });

        selecionarMonitoresPorPredefinicao();

        elementos.estadoMonitor.textContent =
            `${detalhesMonitores.length} monitor(es) real(is) detetado(s).`;

    } catch (erro) {
        console.error(erro);

        elementos.estadoMonitor.textContent =
            'Não foi possível detetar os monitores.';
    }
}

function selecionarMonitoresPorPredefinicao() {
    const monitoresExternos =
        detalhesMonitores.filter(
            monitor => !monitor.principal
        );

    const monitorDireita =
        monitoresExternos.find(
            monitor => monitor.x > 0
        );

    const monitorEsquerda =
        monitoresExternos.find(
            monitor => monitor.x < 0
        );

    const monitorPalco =
        monitorDireita ||
        monitoresExternos[0] ||
        detalhesMonitores[0];

    const monitorRetorno =
        monitorEsquerda ||
        monitoresExternos.find(
            monitor => monitor !== monitorPalco
        ) ||
        monitorPalco;

    if (monitorPalco) {
        elementos.monitorPalco.value =
            monitorPalco.id;
    }

    if (monitorRetorno) {
        elementos.monitorRetorno.value =
            monitorRetorno.id;
    }
}

async function alternarTela(tipo) {
    if (!detalhesMonitores) {
        alert('Deteta primeiro os monitores.');

        return;
    }

    const selecao =
        tipo === 'palco'
            ? elementos.monitorPalco
            : elementos.monitorRetorno;

    const nomeTela =
        tipo === 'palco'
            ? 'Tela do Palco'
            : 'Tela de Retorno';

    const idMonitor =
        selecao.value;

    if (!idMonitor) {
        alert('Seleciona um monitor válido.');

        return;
    }

    const resultado =
        await window.electronAPI.alternarTela(
            tipo,
            idMonitor
        );

    if (!resultado.sucesso) {
        alert(resultado.mensagem);

        return;
    }

    estadoTelas[tipo] =
        resultado.ativa;

    atualizarControlosTelas();

    elementos.estadoMonitor.textContent =
        resultado.ativa
            ? `${nomeTela} ativa e sincronizada.`
            : `${nomeTela} desativada.`;
}

function atualizarControlosTelas() {
    ['palco', 'retorno'].forEach((tipo) => {
        const ativa =
            estadoTelas[tipo];

        const cartao =
            document.getElementById(`cartao-${tipo}`);

        const estado =
            document.getElementById(`estado-${tipo}`);

        const botao =
            document.getElementById(`botao-${tipo}`);

        const nome =
            tipo === 'palco'
                ? 'Tela do Palco'
                : 'Tela de Retorno';

        cartao.classList.toggle(
            'ativa',
            ativa
        );

        cartao.classList.toggle(
            'inativa',
            !ativa
        );

        estado.textContent =
            ativa
                ? 'ATIVA — TEMPORIZADOR PROJETADO'
                : 'INATIVA';

        botao.textContent =
            ativa
                ? `Desativar ${nome}`
                : `Ativar ${nome}`;

        botao.classList.toggle(
            'btn-tela-ativa',
            ativa
        );

        botao.classList.toggle(
            'btn-tela-inativa',
            !ativa
        );
    });
}

function importarAudio() {
    elementos.audioInput.click();
}

function iniciarCarregamentoAudio(nome, src) {
    pararAudio();

    nomeFicheiroAudioAtual = nome;

    desativarControlosAudio();

    elementos.audioElemento.src = src;
}

function criarOpcaoAudio(nome, url) {
    const opcao =
        document.createElement('li');

    opcao.className = 'audio-selecao-opcao';
    opcao.dataset.valor = url;
    opcao.textContent = nome;
    opcao.setAttribute('role', 'option');

    return opcao;
}

function abrirListaAudio() {
    const retanguloBotao =
        elementos.audioSelecaoBotao.getBoundingClientRect();

    const margem = 8;

    const espacoAbaixo =
        window.innerHeight - retanguloBotao.bottom - margem;

    elementos.audioSelecaoLista.style.top = `${retanguloBotao.bottom + 4}px`;
    elementos.audioSelecaoLista.style.left = `${retanguloBotao.left + retanguloBotao.width / 2}px`;
    elementos.audioSelecaoLista.style.maxHeight = `${Math.max(80, Math.min(ALTURA_MAXIMA_LISTA_AUDIO_PX, espacoAbaixo))}px`;

    elementos.audioSelecaoLista.hidden = false;
    elementos.audioSelecaoBotao.setAttribute('aria-expanded', 'true');
}

function fecharListaAudio() {
    elementos.audioSelecaoLista.hidden = true;
    elementos.audioSelecaoBotao.setAttribute('aria-expanded', 'false');
}

function alternarListaAudio() {
    if (elementos.audioSelecaoLista.hidden) {
        abrirListaAudio();
    } else {
        fecharListaAudio();
    }
}

function selecionarOpcaoAudio(opcao) {
    elementos.audioSelecaoTexto.textContent = opcao.textContent;

    fecharListaAudio();

    if (!opcao.dataset.valor) {
        return;
    }

    iniciarCarregamentoAudio(opcao.textContent, opcao.dataset.valor);
}

function carregarAudioSelecionado() {
    const ficheiro =
        elementos.audioInput.files[0];

    if (!ficheiro) {
        return;
    }

    const urlObjeto =
        URL.createObjectURL(ficheiro);

    const opcaoImportada =
        criarOpcaoAudio(ficheiro.name.replace(/\.[^.]+$/, ''), urlObjeto);

    elementos.audioSelecaoLista.appendChild(opcaoImportada);
    selecionarOpcaoAudio(opcaoImportada);

    elementos.audioInput.value = '';
}

async function carregarListaAudiosLocais() {
    if (!window.electronAPI) {
        return;
    }

    const audios =
        await window.electronAPI.listarAudiosLocais();

    audios.forEach(({ nome, url }) => {
        const opcao =
            criarOpcaoAudio(nome.replace(/\.[^.]+$/, ''), url);

        elementos.audioSelecaoLista.appendChild(opcao);
    });
}

function aoCarregarMetadadosAudio() {
    const duracao =
        Number.isFinite(elementos.audioElemento.duration)
            ? Math.floor(elementos.audioElemento.duration)
            : 0;

    elementos.audioTimeline.max = duracao;
    elementos.audioTimeline.value = 0;

    atualizarTextoDuracaoAudio();

    elementos.audioTempoAtual.textContent =
        formatarTempo(0);

    ultimoTempoAudioExibido = 0;

    ativarControlosAudio();
    atualizarFundoTimelineAudio(0);
    atualizarSimboloPlayPause();
}

function atualizarTextoDuracaoAudio() {
    const duracao =
        Number.isFinite(elementos.audioElemento.duration)
            ? Math.floor(elementos.audioElemento.duration)
            : Number(elementos.audioTimeline.max) || 0;

    if (mostrarTempoRestanteAudio) {
        const tempoAtual =
            Math.floor(elementos.audioElemento.currentTime);

        elementos.audioTempoTotal.innerHTML =
            `<span class="audio-tempo-sinal">−</span>${formatarTempo(Math.max(0, duracao - tempoAtual))}`;

        return;
    }

    elementos.audioTempoTotal.textContent =
        formatarTempo(duracao);
}

function alternarExibicaoDuracaoAudio() {
    mostrarTempoRestanteAudio = !mostrarTempoRestanteAudio;
    atualizarTextoDuracaoAudio();
}

function aoFalharAudio() {
    desativarControlosAudio();
}

function ativarControlosAudio() {
    elementos.audioBotaoPlayPause.disabled = false;
    elementos.audioBotaoStop.disabled = false;
    elementos.audioTimeline.disabled = false;
    elementos.audioBotaoVolume.disabled = false;
    elementos.audioVolumeSlider.disabled = false;
    elementos.audioBotaoGatilho.disabled = false;
}

function desativarControlosAudio() {
    elementos.audioBotaoPlayPause.disabled = true;
    elementos.audioBotaoStop.disabled = true;
    elementos.audioTimeline.disabled = true;
    elementos.audioBotaoVolume.disabled = true;
    elementos.audioVolumeSlider.disabled = true;
    elementos.audioBotaoGatilho.disabled = true;
}

function ajustarVolumeAudio() {
    const volume =
        Number(elementos.audioVolumeSlider.value) / 100;

    elementos.audioElemento.volume = volume;

    elementos.audioBotaoVolume.textContent =
        volume === 0
            ? '🔇'
            : '🔊';
}

function alternarMuteAudio() {
    if (elementos.audioElemento.volume > 0) {
        volumeAnteriorAoMute =
            elementos.audioElemento.volume;

        elementos.audioElemento.volume = 0;
        elementos.audioVolumeSlider.value = 0;
        elementos.audioBotaoVolume.textContent = '🔇';
    } else {
        elementos.audioElemento.volume = volumeAnteriorAoMute;

        elementos.audioVolumeSlider.value =
            Math.round(volumeAnteriorAoMute * 100);

        elementos.audioBotaoVolume.textContent = '🔊';
    }
}

function verificarGatilhoAudio() {
    if (
        !gatilhoAudioAtivo ||
        gatilhoAudioDisparado
    ) {
        return;
    }

    if (
        !temporizadorAtivo ||
        temporizadorPausado ||
        faseTemporizador === 'parado' ||
        faseTemporizador === 'aguardandoPublico'
    ) {
        return;
    }

    if (!elementos.audioElemento.src) {
        return;
    }

    const valorCampo =
        elementos.audioGatilhoTempo.value.trim();

    if (!valorCampo) {
        return;
    }

    const limiarSegundos =
        parseDuracaoParaSegundos(valorCampo, -1);

    if (limiarSegundos < 0) {
        return;
    }

    if (tempoRestante > limiarSegundos) {
        return;
    }

    gatilhoAudioDisparado = true;

    if (elementos.audioElemento.paused) {
        elementos.audioElemento.play();

        atualizarSimboloPlayPause();
    }
}

function mostrarPopupFlutuante(elementoAlvo) {
    if (elementoAlvo.temporizadorEsconder) {
        clearTimeout(elementoAlvo.temporizadorEsconder);

        elementoAlvo.temporizadorEsconder = null;
    }

    elementoAlvo.classList.add('aberto');
}

function agendarEsconderPopupFlutuante(elementoAlvo) {
    elementoAlvo.temporizadorEsconder = setTimeout(
        () => {
            elementoAlvo.classList.remove('aberto');

            elementoAlvo.temporizadorEsconder = null;
        },
        500
    );
}

function alternarGatilhoAudioAtivo() {
    gatilhoAudioAtivo = !gatilhoAudioAtivo;

    elementos.audioBotaoGatilho.classList.toggle(
        'ativo',
        gatilhoAudioAtivo
    );
}

function atualizarSimboloPlayPause() {
    const emPausa =
        elementos.audioElemento.paused;

    if (emPausa) {
        elementos.audioBotaoPlayPause.textContent = '▶';
    } else {
        elementos.audioBotaoPlayPause.innerHTML =
            '<svg class="audio-pausa-icone" viewBox="0 0 14 18" fill="currentColor">' +
            '<rect x="0" y="0" width="5" height="18"></rect>' +
            '<rect x="9" y="0" width="5" height="18"></rect>' +
            '</svg>';
    }
}

function alternarReproducaoAudio() {
    if (!elementos.audioElemento.src) {
        return;
    }

    if (elementos.audioElemento.paused) {
        elementos.audioElemento.play();
    } else {
        elementos.audioElemento.pause();
    }

    atualizarSimboloPlayPause();
}

function pararAudio() {
    elementos.audioElemento.pause();
    elementos.audioElemento.currentTime = 0;

    atualizarSimboloPlayPause();
}

function aoTerminarAudio() {
    atualizarSimboloPlayPause();
}

function aoAtualizarTempoAudio() {
    if (arrastandoTimelineAudio) {
        return;
    }

    const tempoAtual =
        Math.floor(elementos.audioElemento.currentTime);

    if (tempoAtual === ultimoTempoAudioExibido) {
        return;
    }

    ultimoTempoAudioExibido = tempoAtual;

    elementos.audioTimeline.value = tempoAtual;

    elementos.audioTempoAtual.textContent =
        formatarTempo(tempoAtual);

    atualizarTextoDuracaoAudio();
    atualizarFundoTimelineAudio(tempoAtual);
}

function atualizarFundoTimelineAudio(valorAtual) {
    const maximo =
        Number(elementos.audioTimeline.max) || 0;

    const percentagem =
        maximo > 0
            ? (valorAtual / maximo) * 100
            : 0;

    elementos.audioTimeline.style.background =
        `linear-gradient(to right, #007bff 0%, #007bff ${percentagem}%, #3a3a3a ${percentagem}%, #3a3a3a 100%)`;
}

function sairDoTemporizador() {
    if (!temporizadorAtivo) {
        return;
    }

    pararIntervalo();

    temporizadorAtivo = false;
    temporizadorPausado = false;
    modoSabadoAtivo = false;

    dataInicioAgendada = null;
    dataFimAgendada = null;

    tempoRestante = 0;
    tempoMaximoInicial = 0;
    duracaoContagemFinalSegundos = 0;
    limiarExibicaoTempoSegundos = 0;

    elementos.timer.classList.remove('piscar');

    elementos.timer.textContent =
        '00:00';

    elementos.timer.style.color =
        CORES.branco;

    elementos.previewOperador.textContent =
        '00:00';

    elementos.previewOperador.style.color =
        CORES.branco;

    elementos.painelConfig.style.display =
        'block';

    atualizarEstadoOperador();
    atualizarPrevisualizacoes(CORES.branco);

    if (window.electronAPI) {
        window.electronAPI.enviarEstado({
            texto: '00:00',
            cor: CORES.branco,
            aPiscar: false,
            ativo: false,
            pausado: false
        });

        window.electronAPI.sairTemporizador();
    }
}

function iniciarModoExportado() {
    document.body.classList.add(
        'modo-exportado'
    );

    elementos.painelConfig.style.display =
        'none';

    elementos.timerFase1.style.display =
        'none';

    elementos.timerContagem.style.display =
        'none';

    if (!window.electronAPI) {
        return;
    }

    window.electronAPI.aoReceberEstado(
        (dados) => {

            if (
                telaTipo === 'palco' &&
                !dados.mostrarPalco
            ) {
                elementos.timerFase1.style.display =
                    'none';

                elementos.timerContagem.style.display =
                    'none';

                return;
            }

            if (telaTipo === 'retorno') {

                if (!dados.mostrarRetorno) {
                    elementos.timerFase1.style.display =
                        'none';

                    elementos.timerContagem.style.display =
                        'none';

                    return;
                }

                elementos.timerContagem.style.display =
                    'none';

                elementos.timerFase1.style.display =
                    'flex';

                elementos.timerTempo.style.display =
                    '';

                elementos.timerHora.classList.remove(
                    'hora-sozinha'
                );

                elementos.timerTempo.textContent =
                    dados.tempo;

                elementos.timerHora.textContent =
                    dados.hora;

                elementos.timerTempo.style.color =
                    dados.cor;

                elementos.timer.classList.toggle(
                    'piscar',
                    dados.aPiscar
                );

                return;
            }

            const mostrarContagem =
                dados.fase === 'contagem';

            const aguardandoPublico =
                dados.fase === 'aguardandoPublico';

            const mostrarTempoAteFim =
                dados.fase !== 'aguardando' &&
                dados.fase !== 'contagem' &&
                dados.fase !== 'aguardandoPublico';

            elementos.timerFase1.style.display =
                (mostrarContagem || aguardandoPublico) ? 'none' : 'flex';

            elementos.timerContagem.style.display =
                (mostrarContagem && !aguardandoPublico) ? 'block' : 'none';

            elementos.timerTempo.style.display =
                mostrarTempoAteFim ? '' : 'none';

            elementos.timerHora.classList.toggle(
                'hora-sozinha',
                dados.fase === 'aguardando'
            );

            if (!mostrarContagem) {

                elementos.timerTempo.textContent =
                    dados.tempo;

                elementos.timerHora.textContent =
                    dados.hora;

                elementos.timerTempo.style.color =
                    dados.cor;

            }
            else {

                elementos.timerContagem.textContent =
                    dados.contagem;

                elementos.timerContagem.style.color =
                    dados.cor;

            }

            elementos.timer.classList.toggle(
                'piscar',
                dados.aPiscar
            );

        }
    );;
}

window.addEventListener(
    'keydown',
    (event) => {
        if (modoExportado) {
            if (event.key === 'Escape') {
                window.close();
            }

            return;
        }

        if (event.key === 'Escape') {
            sairDoTemporizador();

            return;
        }

        const focoEmControloAudio =
            document.activeElement === elementos.audioBotaoPlayPause ||
            document.activeElement === elementos.audioBotaoStop ||
            document.activeElement === elementos.audioTimeline ||
            document.activeElement === elementos.audioSelecaoBotao;

        if (focoEmControloAudio) {
            return;
        }

        if (
            event.code === 'Space' &&
            temporizadorAtivo
        ) {
            event.preventDefault();

            alternarPausa();

            return;
        }

        if (!temporizadorAtivo) {
            return;
        }

        if (event.key === 'ArrowRight') {
            alterarTempo(10);
        }

        if (event.key === 'ArrowLeft') {
            alterarTempo(-10);
        }
    }
);

if (modoExportado) {
    iniciarModoExportado();
} else {
    atualizarCamposPorPreset();
    atualizarPrevisualizacoes(CORES.branco);
    atualizarControlosTelas();

    elementos.audioInput.addEventListener('change', carregarAudioSelecionado);

    elementos.audioSelecaoBotao.addEventListener('click', alternarListaAudio);

    elementos.audioSelecaoLista.addEventListener('click', (evento) => {
        const opcao = evento.target.closest('.audio-selecao-opcao');

        if (opcao) {
            selecionarOpcaoAudio(opcao);
        }
    });

    document.addEventListener('click', (evento) => {
        if (!elementos.audioSelecaoWrapper.contains(evento.target)) {
            fecharListaAudio();
        }
    });

    elementos.audioElemento.addEventListener('loadedmetadata', aoCarregarMetadadosAudio);
    elementos.audioElemento.addEventListener('timeupdate', aoAtualizarTempoAudio);
    elementos.audioElemento.addEventListener('ended', aoTerminarAudio);
    elementos.audioElemento.addEventListener('error', aoFalharAudio);

    carregarListaAudiosLocais();

    elementos.audioBotaoPlayPause.addEventListener('click', alternarReproducaoAudio);
    elementos.audioBotaoStop.addEventListener('click', pararAudio);

    elementos.audioTimeline.addEventListener('input', () => {
        arrastandoTimelineAudio = true;

        const valor =
            Number(elementos.audioTimeline.value);

        elementos.audioTempoAtual.textContent =
            formatarTempo(valor);

        atualizarFundoTimelineAudio(valor);
    });

    elementos.audioTimeline.addEventListener('change', () => {
        elementos.audioElemento.currentTime =
            Number(elementos.audioTimeline.value);

        arrastandoTimelineAudio = false;
    });

    elementos.audioVolumeSlider.addEventListener('input', ajustarVolumeAudio);

    elementos.audioVolumeGrupo.addEventListener(
        'mouseenter',
        () => mostrarPopupFlutuante(elementos.audioVolumePopup)
    );

    elementos.audioVolumeGrupo.addEventListener(
        'mouseleave',
        () => agendarEsconderPopupFlutuante(elementos.audioVolumePopup)
    );

    elementos.audioGatilhoWrapper.addEventListener(
        'mouseenter',
        () => mostrarPopupFlutuante(elementos.audioGatilhoWrapper)
    );

    elementos.audioGatilhoWrapper.addEventListener(
        'mouseleave',
        () => agendarEsconderPopupFlutuante(elementos.audioGatilhoWrapper)
    );

    if (window.electronAPI) {
        window.electronAPI.aoReceberEstadoTelas(
            (novoEstado) => {
                estadoTelas = novoEstado;
                atualizarControlosTelas();
            }
        );
    }
}