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
