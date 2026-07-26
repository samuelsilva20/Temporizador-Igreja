const test = require('node:test');
const assert = require('node:assert/strict');
const { formatarHora, obterProximoSabado, criarConfiguracaoTemporizador } = require('../src/temporizador-core.js');

test('formatarHora formata datas corretamente', () => {
  const data = new Date(2024, 0, 1, 9, 5, 0);
  assert.equal(formatarHora(data), '09:05');
});

test('obterProximoSabado retorna um intervalo válido', () => {
  const resultado = obterProximoSabado('10:45', '10:50');
  assert.ok(resultado.inicio instanceof Date);
  assert.ok(resultado.fim instanceof Date);
  assert.ok(resultado.fim > resultado.inicio);
});

test('criarConfiguracaoTemporizador para 5 minutos define valores corretos', () => {
  const agora = new Date(2024, 0, 1, 10, 0, 0);
  const resultado = criarConfiguracaoTemporizador('padrao5', '', '', agora);

  assert.equal(resultado.tempoRestante, 300);
  assert.equal(resultado.tempoMaximoInicial, 300);
  assert.equal(resultado.modoSabadoAtivo, false);

  // Sem hora marcada, o temporizador deve iniciar diretamente na fase de contagem
  // (dataInicio = agora), sem mostrar a hora do PC em nenhum momento.
  assert.ok(resultado.dataInicio instanceof Date);
  assert.ok(resultado.dataFim instanceof Date);
  assert.ok(agora >= resultado.dataInicio);
  assert.ok(agora < resultado.dataFim);
});

test('criarConfiguracaoTemporizador para personalizado (Fase 1, antes do início) mostra tempo até ao fim', () => {
  const agora = new Date(2024, 0, 1, 10, 0, 0);
  const resultado = criarConfiguracaoTemporizador('personalizado', '10:45', '10:50', agora);

  // Fase 1: ainda não chegou a hora de início, então o tempo mostrado é até à hora de fim (10:00 -> 10:50 = 50 min)
  assert.equal(resultado.tempoRestante, 50 * 60);
  assert.equal(resultado.tempoMaximoInicial, 5 * 60);
  assert.equal(resultado.modoSabadoAtivo, false);
  assert.equal(resultado.dataInicio.getHours(), 10);
  assert.equal(resultado.dataInicio.getMinutes(), 45);
  assert.equal(resultado.dataFim.getHours(), 10);
  assert.equal(resultado.dataFim.getMinutes(), 50);
});

test('criarConfiguracaoTemporizador para personalizado (Fase 2, contagem regressiva) mostra tempo até ao fim', () => {
  const agora = new Date(2024, 0, 1, 10, 47, 0);
  const resultado = criarConfiguracaoTemporizador('personalizado', '10:45', '10:50', agora);

  // Fase 2: já passou a hora de início, então mostra apenas a contagem regressiva até ao fim (10:47 -> 10:50 = 3 min)
  assert.equal(resultado.tempoRestante, 3 * 60);
  assert.equal(resultado.tempoMaximoInicial, 5 * 60);
});
