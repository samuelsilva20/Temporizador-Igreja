# Temporizador Igreja

Temporizador profissional para cultos, feito em Electron. Tem um painel de controlo para o operador e telas dedicadas para a projeção e para o retorno (monitor virado para o orador), todas sincronizadas em tempo real.

## Funcionalidades

- **Painel do operador**: escolha do preset, ajuste dos tempos, e uma pré-visualização igual ao que é mostrado ao público.
- **Tela de projeção** e **tela de retorno**: janelas dedicadas, sem moldura, a preto fora dos períodos de contagem.
- **Três presets**:
  - **Sábado (10:45 → 10:50)** — horário fixo semanal do culto, recalculado automaticamente para o próximo sábado. A Hora de Início já vem preenchida com a hora atual, mas continua editável.
  - **Horário Personalizado** — o operador escolhe livremente a hora de início e de fim, com duas opções avançadas: quanto tempo antes do fim mostrar a hora do relógio para o público, e quanto tempo antes disso mostrar apenas a hora local.
  - **Temporizador 5min (Teste)** — contagem simples de 5 minutos, sem hora marcada, para testar rapidamente.
- Mudança de cor progressiva nos últimos minutos da contagem final (branco → amarelo → laranja → vermelho).
- Deteção de monitores e atribuição independente à tela de projeção e à tela de retorno.
- Atalhos de teclado (Espaço para pausar, ← / → para ajustar ±10s), disponíveis apenas nos presets onde fazem sentido.

## Como correr em desenvolvimento

```bash
npm install
npm start
```

## Como gerar o executável (.exe portátil para Windows)

```bash
npm run build
```

O ficheiro fica em `dist/Temporizador Igreja.exe` — não precisa de instalação, basta copiar e abrir.

## Testes

```bash
node --test tests/temporizador-core.test.js
```

## Estrutura do projeto

```
main.js                          Processo principal do Electron
preload.js                       Ponte segura entre o processo principal e a interface
src/
  temporizador.html              Interface (operador, projeção e retorno)
  temporizador.js                Lógica da interface e comunicação com o Electron
  temporizador-core.js           Lógica de datas/horas (versão Node, usada nos testes)
  temporizador-core-browser.js   A mesma lógica, versão para correr no Electron/browser
  estilo.css                     Estilos
tests/
  temporizador-core.test.js
```

## Requisitos

- Windows
- Node.js e npm (só para desenvolvimento — o `.exe` final é autónomo)

## Licença

ISC
