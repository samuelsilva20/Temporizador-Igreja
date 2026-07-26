function formatarHora(data) {
  return `${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;
}

function obterProximoSabado(horaInicio, horaFim) {
  const agora = new Date();

  const [hInicio, mInicio] = horaInicio.split(':').map(Number);
  const [hFim, mFim] = horaFim.split(':').map(Number);

  let dataInicio = new Date(agora);

  const diasAteSabado = (6 - agora.getDay() + 7) % 7;

  dataInicio.setDate(agora.getDate() + diasAteSabado);
  dataInicio.setHours(hInicio, mInicio, 0, 0);

  let dataFim = new Date(dataInicio);
  dataFim.setHours(hFim, mFim, 0, 0);

  if (dataFim <= dataInicio) {
    dataFim.setDate(dataFim.getDate() + 1);
  }

  if (agora >= dataFim) {
    dataInicio.setDate(dataInicio.getDate() + 7);
    dataFim.setDate(dataFim.getDate() + 7);
  }

  return { inicio: dataInicio, fim: dataFim };
}

function criarConfiguracaoTemporizador(modo, horaInicio, horaFim, agora = new Date()) {
  if (modo === 'sabado') {
    const agendamento = obterProximoSabado(horaInicio, horaFim);
    const tempoInicio = Math.floor((agendamento.inicio.getTime() - agora.getTime()) / 1000);
    const tempoFim = Math.floor((agendamento.fim.getTime() - agora.getTime()) / 1000);

    const tempoRestante = agora < agendamento.inicio ? tempoInicio : tempoFim;
    const tempoMaximoInicial = Math.floor((agendamento.fim.getTime() - agendamento.inicio.getTime()) / 1000);

    return {
      tempoRestante,
      tempoMaximoInicial,
      modoSabadoAtivo: true,
      dataInicio: agendamento.inicio,
      dataFim: agendamento.fim
    };
  }

  if (modo === 'personalizado') {

    const [hInicio, mInicio] =
      horaInicio.split(':');

    const [hFim, mFim] =
      horaFim.split(':');

    const dataInicio =
      new Date(agora);

    dataInicio.setHours(
      parseInt(hInicio, 10),
      parseInt(mInicio, 10),
      0,
      0
    );

    const dataFim =
      new Date(agora);

    dataFim.setHours(
      parseInt(hFim, 10),
      parseInt(mFim, 10),
      0,
      0
    );

    if (dataFim <= dataInicio) {
      dataFim.setDate(
        dataFim.getDate() + 1
      );
    }

    const tempoRestante =
      agora < dataInicio
        ? Math.floor((dataFim - agora) / 1000)
        : Math.max(0, Math.floor((dataFim - agora) / 1000));

    const tempoMaximoInicial =
      Math.floor((dataFim - dataInicio) / 1000);

    return {
      tempoRestante,
      tempoMaximoInicial,
      modoSabadoAtivo: false,
      dataInicio,
      dataFim
    };
  }

  const dataInicio = new Date(agora);
  const dataFim = new Date(agora.getTime() + 5 * 60 * 1000);

  return {
    tempoRestante: 5 * 60,
    tempoMaximoInicial: 5 * 60,
    modoSabadoAtivo: false,
    dataInicio,
    dataFim
  };
}

module.exports = {
  formatarHora,
  obterProximoSabado,
  criarConfiguracaoTemporizador
};
