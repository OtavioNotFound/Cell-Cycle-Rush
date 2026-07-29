# Meiose Reload

**Meiose Reload** é um jogo de ação e sobrevivência sobre ciclo celular, desenvolvido
para um trabalho de Biologia. O jogador controla a última célula saudável de um
organismo e precisa completar as cinco etapas da mitose antes que os **Devoradores**
interrompam a divisão celular.

O projeto funciona totalmente no navegador e foi construído apenas com **HTML, CSS e
JavaScript puro**, sem bibliotecas externas, servidor ou conexão com a internet.

## Como executar

Abra o arquivo `index.html` em um navegador moderno.

Também é possível copiar a pasta para um celular e abrir o arquivo em um navegador que
permita executar páginas HTML locais.

## Controles

### Computador

- **Movimento:** WASD ou Setas
- **Ataque básico:** Espaço, F ou clique no Canvas
- **Dash Celular:** Shift
- **Disparo de Energia:** E
- **Pulso Celular:** R
- **Sobrecarga Mitótica:** Q
- **Pausa e evoluções:** Esc
- **Avançar diálogos:** Enter, Espaço ou clique

As habilidades especiais são liberadas gradualmente durante a campanha.

### Celular

Em telas pequenas, o jogo mostra automaticamente:

- joystick analógico com controle de direção e intensidade;
- botão de ataque;
- botões para Dash, Tiro, Pulso e Sobrecarga;
- botão de pausa;
- interface adaptada para orientação vertical e horizontal.

É possível movimentar e atacar simultaneamente.

O Canvas mantém a proporção original em celulares horizontais e verticais, modo
fullscreen e diferentes resoluções de computador, sem esticar a imagem.

## Dificuldades

Antes de iniciar uma campanha ou NG+, o jogador escolhe uma dificuldade.

### Normal

- Balanceamento principal do jogo.
- Essência e melhorias de atributos são permanentes.
- A progressão continua entre partidas e no NG+.
- Os inimigos se adaptam gradualmente ao total de melhorias compradas.

### Soulslike Roguelike

- Inimigos mais resistentes, rápidos e perigosos.
- Mais pressão de inimigos simultâneos.
- Projéteis inimigos mais rápidos.
- Menor frequência de cura.
- Essência, mutações e evoluções da tentativa são perdidas ao morrer.
- A morte reinicia a campanha na Interfase.
- Existem quatro guardiões exclusivos:
  - Parasita Metabólico;
  - Emaranhador;
  - Desalinhador;
  - Ruptor do Fuso.

Os guardiões precisam ser derrotados para concluir suas respectivas fases.

## As cinco fases

1. **Interfase** — colete ATP, DNA e Nutrientes para preparar a célula.
2. **Prófase** — transporte os cromossomos condensados até o centro.
3. **Metáfase** — posicione cada cromossomo na faixa correspondente da placa equatorial.
4. **Anáfase** — leve cada cromátide ao polo da mesma cor antes do cronômetro acabar.
5. **Telófase** — proteja os dois novos núcleos e derrote o Núcleo Devorador.

Cada fase possui:

- cenário biológico próprio;
- objetivo e mecânica exclusivos;
- diálogos narrativos;
- animação de transição;
- Fragmento Ancestral opcional;
- ondas de inimigos com dificuldade progressiva.

Derrotar o boss final encerra imediatamente a Telófase, sem exigir que o jogador espere
o restante do cronômetro.

## Combate

Os Devoradores possuem comportamentos diferentes:

- **Perseguidor:** inimigo equilibrado que segue o jogador.
- **Tanque:** lento, resistente e com dano alto de contato.
- **Caçador:** rápido, frágil e persistente.
- **Atirador:** mantém distância e dispara projéteis.
- **Boss/Guardião:** possui muita vida, ataques à distância e barra própria.

O combate inclui:

- recuo dos inimigos;
- invulnerabilidade temporária após receber dano;
- partículas e explosões;
- tremor de câmera;
- combo de abates;
- regeneração de energia;
- drops de cura;
- projéteis que atravessam inimigos.

## Essência e evoluções

Inimigos derrotados concedem **Essência**. Ela pode ser gasta no menu de pausa para
melhorar:

- vida máxima;
- dano;
- velocidade;
- energia máxima.

Os custos aumentam a cada nível. A cada certo número de evoluções, os inimigos também
recebem mais vida, dano e velocidade para acompanhar o crescimento do jogador.

No modo Normal, essa progressão é permanente. No Soulslike, ela pertence somente à
tentativa atual.

## Eventos e mutações

Entre as fases, o jogador encontra eventos celulares e escolhe uma recompensa ou
adaptação. Algumas escolhas oferecem vantagens e desvantagens.

Exemplos:

- absorver uma reserva de ATP;
- reparar a membrana;
- Célula de Vidro;
- Membrana Densa;
- assimilar fragmentos dos Devoradores;
- Pulso Predatório;
- Reserva Vital.

No Soulslike, determinadas escolhas também fortalecem os inimigos.

## Sementes de campanha

A tela de dificuldade permite informar uma semente personalizada. A mesma semente
reproduz a sequência de:

- posições dos itens;
- inimigos;
- comportamento inicial;
- ondas;
- drops.

Se nenhuma semente for informada, uma será criada automaticamente. A semente utilizada
aparece no relatório final.

## Finais

O jogo possui cinco finais:

- Final Secreto — Evolução;
- Final Verdadeiro — Renascimento;
- Final Bom — Esperança;
- Final Ruim — Mutação;
- Final Muito Ruim — Extinção.

O final é determinado por mortes, erros, desempenho e Fragmentos Ancestrais coletados.
Não existe Final Neutro.

## Conquistas

Existem **24 conquistas em cada dificuldade**, totalizando dois conjuntos independentes:

- 24 conquistas no Normal;
- 24 conquistas no Soulslike.

As conquistas incluem:

- progresso pelas fases;
- quantidade de inimigos derrotados;
- habilidades;
- finais;
- desafios de precisão e sobrevivência;
- objetivos secretos.

Cada conquista mostra ícone, nome, descrição, status e data de desbloqueio. Ao ser
liberada, aparece uma notificação animada com efeito sonoro. Todo o progresso é salvo
localmente.

## Relatório final

Ao terminar uma campanha, o jogador recebe uma nota entre **C e S+**, calculada usando:

- tempo;
- mortes;
- erros;
- abates;
- Fragmentos Ancestrais.

O relatório também mostra a dificuldade e a semente utilizadas.

## Conteúdo educativo

### Arquivo Celular

Enciclopédia interna com explicações sobre:

- etapas da mitose;
- mitocôndrias;
- fuso mitótico;
- cromossomos;
- elementos fictícios do jogo.

### Modo Laboratório

Modo educativo sem combate que permite avançar e voltar pelas cinco etapas da mitose,
observando uma representação visual e lendo uma explicação resumida de cada etapa.

## Acessibilidade

O menu de acessibilidade oferece:

- redução de animações e tremores;
- texto ampliado;
- modo de alto contraste;
- controle de volume.

As opções são salvas automaticamente no navegador.

## Salvamento

O jogo usa `localStorage` para manter:

- campanha concluída e acesso ao NG+;
- habilidades liberadas;
- Essência e atributos permanentes do modo Normal;
- conquistas separadas por dificuldade;
- abates separados por dificuldade;
- finais descobertos;
- configurações de acessibilidade.

Não são enviados dados para servidores externos.

## Estrutura do projeto

```text
meiose-reload/
├── index.html
├── README.md
├── css/
│   └── style.css
└── js/
    ├── achievements.js
    ├── audio.js
    ├── content.js
    ├── dialogue.js
    ├── entities.js
    ├── game.js
    ├── main.js
    ├── phases.js
    └── save.js
```

### Responsabilidade dos arquivos

- `index.html` — HUD, Canvas, menus, telas e controles móveis.
- `css/style.css` — identidade visual, responsividade, animações e acessibilidade.
- `js/audio.js` — efeitos sonoros gerados com Web Audio API.
- `js/save.js` — carregamento, migração e gravação do save local.
- `js/achievements.js` — definições, progresso e notificações das conquistas.
- `js/entities.js` — jogador, inimigos, projéteis, partículas, itens e zonas.
- `js/dialogue.js` — sequência e exibição dos diálogos.
- `js/phases.js` — combate compartilhado e implementação das cinco fases.
- `js/content.js` — história, adaptações e definições dos finais.
- `js/game.js` — estados, loop principal, interface, câmera e sistemas globais.
- `js/main.js` — inicialização do jogo.

## Arquitetura

Todas as fases herdam de `PhaseBase`, que centraliza:

- criação e atualização dos inimigos;
- escalonamento por dificuldade e evoluções;
- combate corpo a corpo e à distância;
- colisões e dano;
- drops, energia e itens;
- fluxo contínuo de ondas;
- renderização dos elementos compartilhados.

Cada fase concreta implementa seu objetivo, itens, zonas, cronômetro e condição de
conclusão. O objeto `Game` coordena os estados, menus, diálogos, transições, conquistas,
eventos, progressão, cenários, partículas e renderização global.

Todas as imagens do jogo são desenhadas em tempo real com **Canvas 2D**. Não existem
sprites ou recursos gráficos externos.
