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
let instanteAtual = null;

let faseTemporizador = 'parado';

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

    previewFase1: document.getElementById('preview-fase1'),
    previewTempo: document.getElementById('preview-tempo'),
    previewHora: document.getElementById('preview-hora'),
    previewOperador: document.getElementById('preview-operador'),

    controlosRapidos: document.getElementById('controlos-rapidos'),
    textoAtalhos: document.getElementById('texto-atalhos'),

    estadoMonitor: document.getElementById('estado-monitor'),
    monitorPalco: document.getElementById('monitor-palco'),
    monitorRetorno: document.getElementById('monitor-retorno')
};

const modoExportado =
    new URLSearchParams(window.location.search).get('modo') === 'exportado';

const {
    formatarHora,
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

    if (modoSabadoAtivo) {

        if (
            dataInicioAgendada &&
            agora < dataInicioAgendada
        ) {
            return 'aguardandoPublico';
        }

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

function obterEstadoTemporizador(cor) {

    return {

        fase: faseTemporizador,

        tempo:
            elementos.timerTempo.textContent,

        hora:
            elementos.timerHora.textContent,

        contagem:
            elementos.timerContagem.textContent,

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

    if (modo === 'sabado') {
        prepararTemporizadorSabado();
    } else if (modo === 'personalizado') {
        iniciarTemporizadorPersonalizado();
    } else {
        iniciarTemporizadorPadrao();
    }

    elementos.timer.classList.remove('piscar');

    atualizarContagem();

    intervalo = setInterval(
        atualizarContagem,
        1000
    );

    atualizarEstadoOperador();
}

function atualizarTemporizadorSabado() {
    const agora = new Date();

    if (agora < dataInicioAgendada) {
        tempoRestante =
            Math.floor(
                (
                    dataInicioAgendada.getTime() -
                    agora.getTime()
                ) / 1000
            );

        return;
    }

    if (agora < dataFimAgendada) {
        tempoRestante =
            Math.floor(
                (
                    dataFimAgendada.getTime() -
                    agora.getTime()
                ) / 1000
            );

        return;
    }

    const novoAgendamento =
        window.temporizadorCore.obterProximoSabado(
            elementos.horaInicio.value,
            elementos.horaFim.value
        );

    dataInicioAgendada =
        novoAgendamento.inicio;

    dataFimAgendada =
        novoAgendamento.fim;

    tempoRestante =
        Math.floor(
            (
                dataInicioAgendada.getTime() -
                agora.getTime()
            ) / 1000
        );
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

    if (modoSabadoAtivo) {
        atualizarTemporizadorSabado();
    }

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

    let corAtual =
        'rgb(255,255,255)';

    if (mostrarContagem) {

        corAtual =
            calcularCor(tempoRestante, duracaoContagemFinalSegundos);

    }

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
        tempoRestante === 0 &&
        !modoSabadoAtivo
    );

    atualizarPrevisualizacoes(corAtual);

    enviarEstadoParaMonitor(corAtual);

    atualizarEstadoOperador();

    if (
        tempoRestante === 0 &&
        !modoSabadoAtivo
    ) {
        pararIntervalo();

        return;
    }

    if (!modoSabadoAtivo) {
        tempoRestante--;
    }
}

function pararIntervalo() {
    if (intervalo !== null) {
        clearInterval(intervalo);
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
        intervalo = setInterval(
            atualizarContagem,
            1000
        );
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
        intervalo = setInterval(
            atualizarContagem,
            1000
        );
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

                opcao.value =
                    monitor.id;

                opcao.textContent =
                    `${identificacao} — ` +
                    `${monitor.largura} × ${monitor.altura} — ` +
                    `posição ${monitor.x}, ${monitor.y}`;

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

    const monitorPalco =
        monitoresExternos[0] ||
        detalhesMonitores[0];

    const monitorRetorno =
        monitoresExternos[1] ||
        monitoresExternos[0] ||
        detalhesMonitores[0];

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

    if (window.electronAPI) {
        window.electronAPI.aoReceberEstadoTelas(
            (novoEstado) => {
                estadoTelas = novoEstado;
                atualizarControlosTelas();
            }
        );
    }
}