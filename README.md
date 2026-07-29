# Cell Cycle Rush

Jogo 100% web (HTML + CSS + JavaScript puro, sem bibliotecas externas) sobre a última
célula saudável de um organismo tentando completar a mitose antes que os **Devoradores**
a consumam. Cada fase da mitose tem uma mecânica própria, o jogador pode atacar os
Devoradores, e a história é contada só por pequenas caixas de diálogo antes e depois
de cada fase.

## Como jogar

Basta abrir `index.html` em qualquer navegador moderno. Não precisa de internet nem de
servidor — é só dar duplo clique no arquivo.

- **Movimento:** WASD ou Setas
- **Atacar:** ESPAÇO, F ou clique no jogo (pulso de energia curto alcance, custa energia)
- **Avançar diálogo:** ENTER, ESPAÇO ou clique

## As 5 fases

1. **Interfase** — colete ATP, DNA e Nutrientes enquanto foge (ou combate) os Devoradores.
2. **Prófase** — leve cada cromossomo condensado até o centro da célula.
3. **Metáfase** — leve cada cromossomo até a **faixa correta** da placa equatorial (a
   posição errada devolve o item, não conta).
4. **Anáfase** — separe as cromátides-irmãs para polos opostos antes que o **cronômetro
   da fase** zere (estourar o tempo causa dano e reinicia o relógio).
5. **Telófase** — proteja os **dois núcleos** (cada um com um "escudo" próprio) de um
   mini-chefe e de ondas de Devoradores até a divisão se completar.

## Combate

O jogador pode disparar um pulso de energia contra Devoradores próximos. Os inimigos têm
comportamentos e resistência diferentes:

- **Perseguidor** — padrão, equilibrado.
- **Lento e resistente** — muita vida, dano alto de contato, pouca mobilidade.
- **Rápido e frágil** — morre em um golpe, mas é veloz e persistente.
- **Atirador** — mantém distância e dispara projéteis.
- **Mini-chefe** (só na Telófase) — vida alta, dispara e ameaça os núcleos.

Nenhum inimigo usa sprites: tudo é forma geométrica desenhada em Canvas (com destaque de
impacto, explosão ao morrer e "wobble" de animação).

## Estrutura do projeto

```
cell-cycle-rush/
├── index.html          # estrutura da página (HUD, canvas, diálogo, telas)
├── css/
│   └── style.css        # tema visual escuro, inspirado em Undertale (HUD em caixas)
└── js/
    ├── audio.js          # sons curtos via Web Audio API (coleta, ataque, explosão...)
    ├── entities.js        # Player, Devorador, Projectile, Particle, Item, Zone
    ├── dialogue.js         # caixas de diálogo sequenciais
    ├── phases.js            # PhaseBase (combate, colisões, render) + as 5 fases
    ├── content.js             # textos da história (intro/outro por fase, final)
    ├── game.js                 # loop principal, estados, HUD, partículas, câmera
    └── main.js                  # inicialização
```

## Arquitetura

Todas as 5 fases (Interfase, Prófase, Metáfase, Anáfase, Telófase) herdam de
`PhaseBase`, que centraliza:

- spawn e movimento dos Devoradores (5 tipos de comportamento, dificuldade escalável);
- combate: ataque do jogador (`performAttack`) e projéteis inimigos;
- colisões célula ↔ Devorador/projétil (dano, i-frames, knockback);
- drenagem/recompensa de energia;
- cronômetro de fase opcional (`phaseTimeLeft`, usado pela Anáfase e Telófase);
- renderização (célula com brilho, Devoradores, itens, zonas com escudo, projéteis,
  mensagens) via Canvas 2D.

Cada fase concreta define seu próprio objetivo e mecânica específica (itens, zonas,
faixas corretas, defesa dos núcleos), o que mantém o código enxuto e fácil de estender —
para adicionar uma sexta fase basta criar uma nova classe que estenda `PhaseBase`.

Efeitos visuais (partículas, explosões, fundo vivo, câmera shake, brilho da célula) são
gerenciados pelo `Game`, e reutilizados por qualquer fase através de `this.game.spawnParticles(...)`,
`this.game.spawnExplosion(...)` e `this.game.triggerShake(...)`.

Nenhuma imagem externa é usada: tudo é desenhado com Canvas (formas orgânicas para a
célula, formas espinhosas/losangos para os Devoradores, partículas para explosões e
impactos).
