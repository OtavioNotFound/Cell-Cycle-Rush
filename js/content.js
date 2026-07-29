const INTRO_LINES = [
  'Algo mudou nos confins microscópicos deste organismo.',
  'Vieram sem forma definida, sem padrão, sem motivo aparente.',
  'Ninguém sabe de onde os Devoradores surgiram. Só que consomem.',
  'Célula após célula, o tecido silenciou.',
  'Restou apenas uma célula saudável. Você.',
  'Se você se dividir a tempo, o organismo sobrevive. Se não... mais um silêncio.'
];

// Ditas logo ANTES de cada fase começar (index 0 a 4)
const PHASE_INTRO_LINES = [
  [
    'Antes de tudo, a célula precisa se preparar.',
    'ATP para energia. DNA para se multiplicar. Nutrientes para resistir.',
    'Eles já sentiram sua presença. Não demore.'
  ],
  [
    'O material genético começa a se condensar.',
    'Leve cada cromossomo até o centro — com cuidado.',
    'Os Devoradores não atacam para matar. Atacam para atrasar.'
  ],
  [
    'A placa equatorial se forma no meio da célula.',
    'Cada cromossomo tem um lugar exato. Errar a posição custa tempo.',
    'E tempo, aqui, é a única coisa que eles sabem tirar de você.'
  ],
  [
    'Agora vem o momento que não permite hesitação.',
    'As cromátides-irmãs precisam se separar — cada uma para um polo.',
    'Confunda os lados e o erro se paga em dano. O relógio não espera.'
  ],
  [
    'Dois núcleos estão se formando. Frágeis. Ainda incompletos.',
    'Algo maior se aproxima — sente o cheiro do fim da divisão.',
    'Proteja os dois núcleos. É a última barreira antes da vida continuar.'
  ]
];

// Ditas logo APÓS cada fase ser concluída (index 0 a 4)
const PHASE_OUTRO_LINES = [
  [
    'Recursos reunidos. A célula pulsa com mais força agora.',
    'Mas ao longe, algo reagiu ao seu sucesso.'
  ],
  [
    'O DNA está condensado. Cromossomos definidos, prontos.',
    'Os Devoradores recuam por um instante — reagrupando-se.'
  ],
  [
    'Alinhados. Perfeitos. A célula está pronta para se partir ao meio.',
    'Você sente que eles sabem o que vem a seguir. E não gostam.'
  ],
  [
    'As cromátides alcançaram seus polos. Separação bem-sucedida.',
    'Um silêncio pesado toma conta do citoplasma. Algo se aproxima.'
  ],
  [] // vitória: tratado separadamente em VICTORY_LINES
];

const VICTORY_LINES = [
  'A membrana se fecha em torno dos dois núcleos.',
  'Por um instante, os Devoradores simplesmente... desaparecem.',
  'Como se nunca tivessem existido além do medo que causaram.',
  'A divisão está completa.'
];

/**
 * Adaptações permanentes desbloqueadas ao concluir uma fase (representando a
 * "vitória sobre o boss" daquele estágio da mitose). Mapeado por índice de fase
 * (0 a 4). Fases sem entrada aqui não concedem nenhuma habilidade nova.
 */
const ABILITY_UNLOCKS = {
  0: {
    key: 'dash',
    name: 'Dash Celular',
    flavor: '"Agora sua célula consegue escapar rapidamente do perigo."',
    controlHint: 'Pressione SHIFT para avançar num impulso rápido, com breve invulnerabilidade.'
  },
  1: {
    key: 'shot',
    name: 'Disparo de Energia',
    flavor: '"Sua célula aprendeu a liberar um pulso de energia à distância."',
    controlHint: 'Pressione E para disparar um projétil que atravessa um inimigo.'
  },
  2: {
    key: 'pulse',
    name: 'Pulso Celular',
    flavor: '"Uma onda de membrana agora pode empurrar tudo ao seu redor."',
    controlHint: 'Pressione R para expandir uma onda que afasta os Devoradores próximos.'
  },
  4: {
    key: 'overload',
    name: 'Sobrecarga Mitótica',
    flavor: '"No limite da divisão, sua célula libera toda a energia acumulada."',
    controlHint: 'Pressione Q para acelerar seus movimentos e ataques por alguns segundos.'
  }
};

/** Metadados de exibição das habilidades na barra do HUD. */
const ABILITY_META = {
  dash:     { label: 'DASH',   keyLabel: 'SHIFT' },
  shot:     { label: 'TIRO',   keyLabel: 'E' },
  pulse:    { label: 'PULSO',  keyLabel: 'R' },
  overload: { label: 'SOBRECARGA', keyLabel: 'Q' }
};

const DEFEAT_LINES = [
  'A célula tenta resistir, mas não há mais energia.',
  'Os Devoradores fecham o cerco em silêncio.',
  'Não houve grito. Só o fim de um processo interrompido.'
];

/* ==================== FINAIS ==================== */

/**
 * Múltiplos finais, decididos pelo desempenho do jogador durante toda a
 * campanha (ver Game.stats: mortes/reinícios usados, erros cometidos e
 * colecionáveis encontrados). Cada final reaproveita a mesma cena-base de
 * vitória (VICTORY_LINES) e acrescenta suas próprias linhas, no mesmo
 * estilo de diálogo do resto do jogo — nada de telas novas ou fora do tom.
 */
const ENDINGS = {
  secret: {
    id: 'secret',
    title: 'FINAL SECRETO — EVOLUÇÃO',
    cinematic: 'evolution',
    lines: VICTORY_LINES.concat([
      'Mas uma célula que sobrevive a isso não volta a ser como antes.',
      'Ela guarda cada cicatriz da batalha... e aprende com elas.',
      'Uma resistência nova nasce, silenciosa, em sua membrana.',
      'O tempo acelera. Gerações inteiras passam em poucos segundos.',
      'Milhões de anos de divisões moldam uma linhagem inteira.',
      'A vida não venceu por ser a mais forte.',
      'Ela venceu porque conseguiu evoluir.'
    ]),
    message: '"A vida não vence por ser a mais forte.<br>Ela vence porque consegue evoluir."'
  },
  true: {
    id: 'true',
    title: 'FINAL VERDADEIRO — RENASCIMENTO',
    cinematic: 'rebirth',
    lines: VICTORY_LINES.concat([
      'Depois dela, surgem duas.',
      'Depois, quatro. Depois, oito.',
      'O tecido ao redor começa a se reconstruir, célula após célula.',
      'E então, de repente, a escala muda.',
      'Tudo o que você viveu acontecia dentro de um único ser humano.'
    ]),
    message: '"Toda vida depende de bilhões de divisões invisíveis."'
  },
  good: {
    id: 'good',
    title: 'FINAL BOM — ESPERANÇA',
    cinematic: null,
    lines: VICTORY_LINES.concat([
      'A célula concluiu sua divisão, ainda que com cicatrizes.',
      'Parte do tecido ao redor foi salva a tempo.',
      'Os Devoradores recuam para as sombras... e entram em dormência.'
    ]),
    message: '"A batalha terminou... por enquanto."'
  },
  bad: {
    id: 'bad',
    title: 'FINAL RUIM — MUTAÇÃO',
    cinematic: 'mutation',
    lines: VICTORY_LINES.concat([
      'Uma das divisões não saiu como deveria.',
      'Uma célula defeituosa se formou — e já começa a se multiplicar sem controle.',
      'Os Devoradores desapareceram...',
      'Mas uma ameaça pior acabou de nascer.'
    ]),
    message: '"Nem toda vitória salva uma vida."'
  }
};

/** Final especial de derrota — só ocorre ao perder especificamente na última fase (Telófase). */
const EXTINCTION_ENDING = {
  id: 'veryBad',
  title: 'FINAL MUITO RUIM — EXTINÇÃO',
  cinematic: null,
  lines: [
    'A divisão falha por completo.',
    'Um a um, os núcleos se apagam.',
    'As células param de responder.',
    'Os Devoradores consomem o que resta do organismo.',
    'Silêncio.'
  ],
  message: '"Sem novas células... a vida chegou ao fim."'
};

/**
 * Limiares usados para escolher o final (ajustáveis). "errors" soma erros de
 * Metáfase (cor errada na entrega) e Anáfase (par no polo errado ou tempo de
 * fase esgotado); "deaths" conta quantos reinícios o jogador precisou usar
 * na campanha atual.
 */
const ENDING_THRESHOLDS = {
  trueMaxErrors: 2,
  goodMaxDeaths: 1,
  goodMaxErrors: 5
};

/** Decide qual final mostrar ao concluir a campanha, a partir de Game.stats. */
function decideEnding(stats){
  const perfect = stats.deaths === 0 && stats.errors === 0;
  const allCollectibles = stats.collectibles >= stats.collectiblesTotal;
  if(perfect || allCollectibles) return ENDINGS.secret;
  if(stats.deaths === 0 && stats.errors <= ENDING_THRESHOLDS.trueMaxErrors) return ENDINGS.true;
  if(stats.deaths <= ENDING_THRESHOLDS.goodMaxDeaths && stats.errors <= ENDING_THRESHOLDS.goodMaxErrors) return ENDINGS.good;
  return ENDINGS.bad;
}
