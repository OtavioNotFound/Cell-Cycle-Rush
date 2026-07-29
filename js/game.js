/**
 * Game
 * Orquestra estados (título, diálogo, jogando, vitória, derrota),
 * input, loop de renderização, HUD, partículas, fundo vivo e câmera.
 */
class Game {
  constructor(){
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.bounds = { w: 900, h: 560, margin: 36 };

    this.audio = new AudioManager();
    this.dialogue = new DialogueManager();
    this.achievements = new AchievementManager(this);

    this.phaseClasses = [InterfasePhase, ProfasePhase, MetafasePhase, AnafasePhase, TelofasePhase];
    this.player = null;
    this.phase = null;
    this.phaseIndex = 0;
    this.difficulty = 'normal';
    this.pendingNGPlus = false;

    this.state = 'title'; // title | dialogue | playing | victory | defeat
    this.ending = false;
    this.elapsed = 0;
    this.lastTime = 0;
    this.damageFlash = 0;
    this.keys = {};

    // ---- efeitos visuais globais ----
    this.particles = [];
    this.shakeMag = 0;
    this.shakeTimeLeft = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.time = 0;
    this.blobs = this.makeBackgroundBlobs();

    // câmera com leve antecipação de movimento (sem ser um scroll de plataforma)
    this.camLeadX = 0;
    this.camLeadY = 0;
    // zoom sutil ao iniciar cada fase + fade a partir do preto
    this.phaseZoomT = 1;
    this.phaseFadeIn = 0;
    // congelamento breve (hit-stop) ao acertar um golpe, para dar peso ao impacto
    this.hitStopUntil = 0;
    // rastro discreto da célula do jogador
    this.trailTimer = 0;
    // combo de abates: recompensa jogar agressivo (cura + regen de energia mais rápida)
    this.combo = 0;
    this.comboTimer = 0;

    this.dom = {
      titleScreen: document.getElementById('titleScreen'),
      newGameBtn: document.getElementById('newGameBtn'),
      ngPlusBtn: document.getElementById('ngPlusBtn'),
      achievementsBtn: document.getElementById('achievementsBtn'),
      achievementsScreen: document.getElementById('achievementsScreen'),
      closeAchievementsBtn: document.getElementById('closeAchievementsBtn'),
      difficultyScreen: document.getElementById('difficultyScreen'),
      normalModeBtn: document.getElementById('normalModeBtn'),
      soulsModeBtn: document.getElementById('soulsModeBtn'),
      difficultyBackBtn: document.getElementById('difficultyBackBtn'),
      seedInput: document.getElementById('seedInput'),
      codexBtn: document.getElementById('codexBtn'),
      labBtn: document.getElementById('labBtn'),
      settingsBtn: document.getElementById('settingsBtn'),
      codexScreen: document.getElementById('codexScreen'),
      codexCloseBtn: document.getElementById('codexCloseBtn'),
      codexList: document.getElementById('codexList'),
      labScreen: document.getElementById('labScreen'),
      labCloseBtn: document.getElementById('labCloseBtn'),
      labPrevBtn: document.getElementById('labPrevBtn'),
      labNextBtn: document.getElementById('labNextBtn'),
      labPhaseName: document.getElementById('labPhaseName'),
      labPhaseText: document.getElementById('labPhaseText'),
      labCell: document.getElementById('labCell'),
      labNucleus: document.getElementById('labNucleus'),
      settingsScreen: document.getElementById('settingsScreen'),
      settingsCloseBtn: document.getElementById('settingsCloseBtn'),
      reducedMotionToggle: document.getElementById('reducedMotionToggle'),
      largeTextToggle: document.getElementById('largeTextToggle'),
      colorblindToggle: document.getElementById('colorblindToggle'),
      volumeSlider: document.getElementById('volumeSlider'),
      endScreen: document.getElementById('endScreen'),
      endTitle: document.getElementById('endTitle'),
      endMessage: document.getElementById('endMessage'),
      retryBtn: document.getElementById('retryBtn'),
      playAgainBtn: document.getElementById('playAgainBtn'),
      dialogueBox: document.getElementById('dialogueBox'),
      phaseLabel: document.getElementById('phaseLabel'),
      objectiveText: document.getElementById('objectiveText'),
      healthFill: document.getElementById('healthFill'),
      energyFill: document.getElementById('energyFill'),
      progressFill: document.getElementById('progressFill'),
      timerText: document.getElementById('timerText'),
      devouradoresCount: document.getElementById('devouradoresCount'),
      essenceCount: document.getElementById('essenceCount'),
      pauseScreen: document.getElementById('pauseScreen'),
      pauseEssence: document.getElementById('pauseEssence'),
      upgradeList: document.getElementById('upgradeList'),
      enemyScaleText: document.getElementById('enemyScaleText'),
      resumeBtn: document.getElementById('resumeBtn'),
      pauseTitleBtn: document.getElementById('pauseTitleBtn'),
      pauseProgressRule: document.getElementById('pauseProgressRule'),
      eventScreen: document.getElementById('eventScreen'),
      eventTag: document.getElementById('eventTag'),
      eventTitle: document.getElementById('eventTitle'),
      eventDescription: document.getElementById('eventDescription'),
      eventChoices: document.getElementById('eventChoices'),
      mobileControls: document.getElementById('mobileControls'),
      phaseBanner: document.getElementById('phaseBanner'),
      phaseBannerText: document.getElementById('phaseBannerText'),
      unlockScreen: document.getElementById('unlockScreen'),
      unlockName: document.getElementById('unlockName'),
      unlockFlavor: document.getElementById('unlockFlavor'),
      unlockControl: document.getElementById('unlockControl'),
      abilityRow: document.getElementById('abilityRow'),
      abilityBar: document.getElementById('abilityBar')
    };
    this.pendingUnlockDone = null;
    this.newGamePlus = false;
    this.refreshNgPlusAvailability();

    this.bindInput();
    requestAnimationFrame(this.loop.bind(this));
  }

  // ---------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------
  bindInput(){
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      if(k === 'enter' || k === ' '){
        if(this.state === 'title'){ this.openDifficulty(false); }
        else if(this.state === 'introCinematic'){ this.finishIntroCinematic(); }
        else if(this.state === 'dialogue'){ this.dialogue.advance(); }
        else if(this.state === 'unlock'){ e.preventDefault(); this.dismissUnlock(); }
        else if(this.state === 'playing' && k === ' '){ e.preventDefault(); this.triggerAttack(); }
      }
      if(k === 'escape'){
        if(e.repeat) return;
        if(this.state === 'achievements') this.closeAchievements();
        else if(this.state === 'difficulty') this.closeDifficulty();
        else if(this.state === 'info'){
          const openInfoScreen = [this.dom.codexScreen,this.dom.labScreen,this.dom.settingsScreen]
            .find(screen => !screen.classList.contains('hidden'));
          if(openInfoScreen) this.closeInfo(openInfoScreen);
        }
        else if(this.state === 'playing') this.openPause();
        else if(this.state === 'paused') this.closePause();
      }
      if(k === 'f' && this.state === 'playing'){ this.triggerAttack(); }
      if(k === 'shift' && this.state === 'playing'){ this.triggerDash(); }
      if(k === 'e' && this.state === 'playing'){ this.triggerShot(); }
      if(k === 'r' && this.state === 'playing'){ this.triggerPulse(); }
      if(k === 'q' && this.state === 'playing'){ this.triggerOverload(); }
    });
    window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });

    this.dom.newGameBtn.addEventListener('click', e => { e.stopPropagation(); this.openDifficulty(false); });
    this.dom.ngPlusBtn.addEventListener('click', e => { e.stopPropagation(); this.openDifficulty(true); });
    this.dom.normalModeBtn.addEventListener('click', () => this.chooseDifficulty('normal'));
    this.dom.soulsModeBtn.addEventListener('click', () => this.chooseDifficulty('soulslike'));
    this.dom.difficultyBackBtn.addEventListener('click', () => this.closeDifficulty());
    this.dom.codexBtn.addEventListener('click', e => { e.stopPropagation(); this.openCodex(); });
    this.dom.labBtn.addEventListener('click', e => { e.stopPropagation(); this.openLab(); });
    this.dom.settingsBtn.addEventListener('click', e => { e.stopPropagation(); this.openSettings(); });
    this.dom.codexCloseBtn.addEventListener('click', () => this.closeInfo(this.dom.codexScreen));
    this.dom.labCloseBtn.addEventListener('click', () => this.closeInfo(this.dom.labScreen));
    this.dom.settingsCloseBtn.addEventListener('click', () => this.closeInfo(this.dom.settingsScreen));
    this.dom.labPrevBtn.addEventListener('click', () => { this.labIndex = Math.max(0, this.labIndex - 1); this.renderLab(); });
    this.dom.labNextBtn.addEventListener('click', () => { this.labIndex = Math.min(4, this.labIndex + 1); this.renderLab(); });
    [this.dom.reducedMotionToggle,this.dom.largeTextToggle,this.dom.colorblindToggle,this.dom.volumeSlider]
      .forEach(el => el.addEventListener('input', () => this.applyAccessibility()));
    this.dom.achievementsBtn.addEventListener('click', e => { e.stopPropagation(); this.openAchievements(); });
    this.dom.closeAchievementsBtn.addEventListener('click', e => { e.stopPropagation(); this.closeAchievements(); });
    this.dom.dialogueBox.addEventListener('click', () => { if(this.state === 'dialogue') this.dialogue.advance(); });
    this.dom.unlockScreen.addEventListener('click', () => { if(this.state === 'unlock') this.dismissUnlock(); });
    this.dom.retryBtn.addEventListener('click', () => this.reset());
    this.dom.playAgainBtn.addEventListener('click', () => this.backToTitle());
    this.dom.resumeBtn.addEventListener('click', () => this.closePause());
    this.dom.pauseTitleBtn.addEventListener('click', () => {
      this.dom.pauseScreen.classList.add('hidden');
      this.backToTitle();
    });

    this.canvas.addEventListener('click', () => { if(this.state === 'playing') this.triggerAttack(); });
    this.bindMobileControls();
    this.loadAccessibility();
  }

  bindMobileControls(){
    if(!this.dom.mobileControls) return;
    this.dom.mobileControls.querySelectorAll('[data-move-key]').forEach(button => {
      const key = button.dataset.moveKey;
      const press = e => {
        e.preventDefault();
        if(this.state !== 'playing') return;
        button.setPointerCapture?.(e.pointerId);
        this.keys[key] = true;
        button.classList.add('pressed');
      };
      const release = e => {
        e.preventDefault();
        this.keys[key] = false;
        button.classList.remove('pressed');
      };
      button.addEventListener('pointerdown', press);
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
    });
    const actions = {
      attack:() => this.triggerAttack(),
      dash:() => this.triggerDash(),
      shot:() => this.triggerShot(),
      pulse:() => this.triggerPulse(),
      overload:() => this.triggerOverload(),
      pause:() => this.openPause()
    };
    this.dom.mobileControls.querySelectorAll('[data-mobile-action]').forEach(button => {
      button.addEventListener('pointerdown', e => {
        e.preventDefault();
        if(this.state !== 'playing') return;
        button.classList.add('pressed');
        actions[button.dataset.mobileAction]?.();
      });
      const release = e => { e.preventDefault(); button.classList.remove('pressed'); };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
    });
  }

  triggerAttack(){
    const p = this.player;
    if(!p || !p.canAttack) return;
    const overload = p.isOverloaded;
    p.attackCooldownUntil = performance.now() + (overload ? 230 : 420); // Sobrecarga: golpes mais rápidos
    p.attackFlash = 1;
    const cost = Math.min(p.energy, 12);
    p.energy = Math.max(0, p.energy - 12);
    let damage = cost >= 12 ? 30 : 16; // ataque mais fraco sem energia suficiente
    damage = Math.round(damage * p.damageMultiplier);
    if(overload) damage = Math.round(damage * 1.3);
    this.audio.attack();
    if(this.phase && this.phase.performAttack){
      this.phase.performAttack(p.x, p.y, 78, damage);
    }
  }

  /** Boss 1 — Dash Celular: avança rápido na direção do movimento (ou do último
   *  rumo, se parado), com breve invulnerabilidade. Atravessa grupos pequenos
   *  de inimigos sem sofrer dano. */
  triggerDash(){
    const p = this.player;
    if(!p || !p.canDash) return;
    const now = performance.now();
    let dx = 0, dy = 0;
    if(this.keys['w'] || this.keys['arrowup']) dy -= 1;
    if(this.keys['s'] || this.keys['arrowdown']) dy += 1;
    if(this.keys['a'] || this.keys['arrowleft']) dx -= 1;
    if(this.keys['d'] || this.keys['arrowright']) dx += 1;
    if(dx === 0 && dy === 0){
      dx = Math.cos(p._lastAngle || 0);
      dy = Math.sin(p._lastAngle || 0);
    }
    const len = Math.hypot(dx, dy) || 1;
    p.dashDirX = dx / len;
    p.dashDirY = dy / len;
    p.dashActiveUntil = now + p.dashDurationMs;
    p.dashCooldownUntil = now + p.dashCooldownMs;
    p.invulnUntil = Math.max(p.invulnUntil, now + p.dashDurationMs + 60);
    this.audio.dash();
    this.spawnParticles(p.x, p.y, '#bfe9ff', 10, { life: 0.3, speed: 40, glow: true });
    this.triggerShake(3, 0.1);
  }

  /** Boss 2 — Disparo de Energia: projétil que mira o inimigo mais próximo (ou o
   *  rumo atual, se não houver alvo), atravessa 1 inimigo e não substitui o
   *  ataque corpo a corpo. */
  triggerShot(){
    const p = this.player;
    if(!p || !p.canShot) return;
    const now = performance.now();
    p.shotCooldownUntil = now + p.shotCooldownMs;
    const target = this.findNearestDevorador();
    let tx, ty;
    if(target){ tx = target.x; ty = target.y; }
    else {
      const ang = p._lastAngle || 0;
      tx = p.x + Math.cos(ang) * 200;
      ty = p.y + Math.sin(ang) * 200;
    }
    this.audio.shootPlayer();
    this.spawnParticles(p.x, p.y, '#8fe3ff', 5, { life: 0.2, speed: 60 });
    if(this.phase && this.phase.spawnPlayerProjectile){
      this.phase.spawnPlayerProjectile(p.x, p.y, tx, ty);
    }
  }

  findNearestDevorador(){
    if(!this.phase || !this.phase.devouradores || !this.phase.devouradores.length) return null;
    const p = this.player;
    let best = null, bestDist = Infinity;
    for(const d of this.phase.devouradores){
      const dist = Math.hypot(p.x - d.x, p.y - d.y);
      if(dist < bestDist){ bestDist = dist; best = d; }
    }
    return best;
  }

  /** Boss 3 — Pulso Celular: onda que empurra inimigos próximos para abrir espaço.
   *  Dano baixo, não é pensado para matar. */
  triggerPulse(){
    const p = this.player;
    if(!p || !p.canPulse) return;
    const now = performance.now();
    p.pulseCooldownUntil = now + p.pulseCooldownMs;
    p.pulseFlash = 1;
    this.audio.pulse();
    this.triggerShake(5, 0.18);
    this.spawnParticles(p.x, p.y, '#8fd9ff', 16, { life: 0.4, speed: 150, glow: true });
    if(this.phase && this.phase.applyPulse){
      this.phase.applyPulse(120, 240, 6);
    }
  }

  /** Boss Final — Sobrecarga Mitótica: alguns segundos de velocidade e ataque
   *  mais rápidos. A habilidade mais poderosa do jogo; cooldown alto. */
  triggerOverload(){
    const p = this.player;
    if(!p || !p.canOverload) return;
    const now = performance.now();
    p.overloadActiveUntil = now + p.overloadDurationMs;
    p.overloadCooldownUntil = now + p.overloadCooldownMs;
    this.audio.overload();
    this.triggerShake(6, 0.25);
    this.spawnParticles(p.x, p.y, '#ffd166', 20, { life: 0.5, speed: 120, glow: true });
  }

  /** Congela o jogo por alguns ms (hit-stop) para dar peso a um golpe que acertou. */
  triggerHitStop(ms){
    this.hitStopUntil = Math.max(this.hitStopUntil, performance.now() + ms);
  }

  /**
   * Recompensa um abate: mantém o combo vivo, devolve energia e, a cada 3
   * abates em sequência, cura um pouco. É o que faz jogar agressivo compensar.
   */
  registerKill(d){
    this.combo++;
    this.comboTimer = 2.4;
    this.achievements.addKill();
    if(this.stats) this.stats.kills = (this.stats.kills || 0) + 1;
    if(this.phaseRun){
      this.phaseRun.killStreak++;
      if(this.phaseRun.killStreak >= 20) this.achievements.unlock('streak_20');
    }
    const p = this.player;
    if(!p) return;
    const baseGain = d.type === 'boss' ? 25 : (d.type === 'tank' ? 4 : (d.type === 'shooter' ? 3 : 2));
    const gained = Math.round(baseGain * (this.essenceMultiplier || 1));
    this.runProgress.essence += gained;
    this.savePermanentProgress();
    this.showEssenceGain = { amount:gained, until:performance.now() + 900 };
    if(d.type !== 'boss'){
      p.energy = Math.min(p.maxEnergy, p.energy + 10);
    }
    if(this.combo % 3 === 0 && p.health > 0){
      p.health = Math.min(p.maxHealth, p.health + 4);
      this.spawnParticles(p.x, p.y, '#4ade80', 6, { life: 0.3, speed: 70 });
    }
  }

  // ---------------------------------------------------------------------
  // Fluxo de estados
  // ---------------------------------------------------------------------
  startIntro(isNGPlus = false){
    this.newGamePlus = isNGPlus;
    // Estatísticas da campanha atual: sobrevivem a reinícios (Tentar novamente),
    // já que um reinício não deixa de fazer parte do "desempenho geral" que
    // decide o final. São zeradas de novo aqui, no começo de uma corrida nova.
    this.stats = this.freshStats();
    // Uma campanha nova nunca reaproveita visualmente a fase/célula da partida
    // anterior. Isso também garante que a introdução seja igual em outro save.
    this.phase = null;
    this.player = null;
    this.particles = [];
    this.combo = 0;
    this.idleAchievementTime = 0;
    this.camLeadX = 0;
    this.camLeadY = 0;
    if(this.dom.abilityBar) this.dom.abilityBar.innerHTML = '';
    if(this.dom.abilityRow) this.dom.abilityRow.style.display = 'none';
    this.dom.endScreen.classList.add('hidden');
    this.dom.titleScreen.classList.add('hidden');
    this.state = 'introCinematic';
    this.introT = 0;
    this.introDuration = 7.5;
    this.introNGPlus = isNGPlus;
  }

  openDifficulty(isNGPlus){
    this.pendingNGPlus = !!isNGPlus;
    this.state = 'difficulty';
    this.dom.titleScreen.classList.add('hidden');
    this.dom.difficultyScreen.classList.remove('hidden');
  }

  closeDifficulty(){
    this.dom.difficultyScreen.classList.add('hidden');
    this.dom.titleScreen.classList.remove('hidden');
    this.state = 'title';
  }

  openCodex(){
    const entries = [
      ['Interfase','A célula cresce, duplica o DNA e reúne ATP e nutrientes antes de iniciar a divisão.'],
      ['Prófase','A cromatina se condensa em cromossomos e o envelope nuclear começa a desaparecer.'],
      ['Metáfase','Os cromossomos se alinham na placa equatorial, ligados às fibras do fuso.'],
      ['Anáfase','As cromátides-irmãs se separam e seguem para polos opostos da célula.'],
      ['Telófase','Novos envelopes nucleares se formam e a citocinese divide o citoplasma.'],
      ['Mitocôndria','Organela responsável por grande parte da produção de ATP utilizada pela célula.'],
      ['Devoradores','Representações fictícias de ameaças que interrompem o ciclo celular.'],
      ['Fuso mitótico','Conjunto de microtúbulos que organiza e separa os cromossomos durante a mitose.']
    ];
    this.dom.codexList.innerHTML = entries.map(([name,text]) => `<article class="codex-entry"><h3>${name}</h3><p>${text}</p></article>`).join('');
    this.state = 'info';
    this.dom.titleScreen.classList.add('hidden');
    this.dom.codexScreen.classList.remove('hidden');
  }

  openLab(){
    this.labIndex = 0;
    this.renderLab();
    this.state = 'info';
    this.dom.titleScreen.classList.add('hidden');
    this.dom.labScreen.classList.remove('hidden');
  }

  renderLab(){
    const phases = [
      ['INTERFASE','O DNA é duplicado e a célula acumula recursos para a divisão.'],
      ['PRÓFASE','Os cromossomos tornam-se visíveis enquanto o núcleo começa a se desfazer.'],
      ['METÁFASE','Os cromossomos alinham-se no centro da célula.'],
      ['ANÁFASE','As cromátides são puxadas para polos opostos.'],
      ['TELÓFASE','Dois núcleos se formam e a célula termina sua divisão.']
    ];
    const [name,text] = phases[this.labIndex];
    this.dom.labPhaseName.textContent = name;
    this.dom.labPhaseText.textContent = text;
    const styles = [
      ['scale(1)','50%','76px'],
      ['scale(.9)','18%','58px'],
      ['scale(1.05)','6px','100px'],
      ['scale(1.12)','50%','45px'],
      ['scale(.96)','50%','58px']
    ][this.labIndex];
    this.dom.labCell.style.transform = styles[0];
    this.dom.labNucleus.style.borderRadius = styles[1];
    this.dom.labNucleus.style.width = styles[2];
    this.dom.labNucleus.style.height = styles[2];
    this.dom.labNucleus.style.boxShadow = this.labIndex === 4 ? '-48px 0 0 #4ade80, 48px 0 0 #4c8cff' : '0 0 25px rgba(76,140,255,.7)';
    this.dom.labPrevBtn.disabled = this.labIndex === 0;
    this.dom.labNextBtn.disabled = this.labIndex === 4;
  }

  openSettings(){
    this.state = 'info';
    this.dom.titleScreen.classList.add('hidden');
    this.dom.settingsScreen.classList.remove('hidden');
  }

  closeInfo(screen){
    screen.classList.add('hidden');
    this.dom.titleScreen.classList.remove('hidden');
    this.state = 'title';
  }

  loadAccessibility(){
    let options = {};
    try{ options = JSON.parse(localStorage.getItem('ccrAccessibility') || '{}'); }catch(e){}
    this.dom.reducedMotionToggle.checked = !!options.reducedMotion;
    this.dom.largeTextToggle.checked = !!options.largeText;
    this.dom.colorblindToggle.checked = !!options.colorblind;
    this.dom.volumeSlider.value = options.volume ?? 100;
    this.applyAccessibility();
  }

  applyAccessibility(){
    const options = {
      reducedMotion:this.dom.reducedMotionToggle.checked,
      largeText:this.dom.largeTextToggle.checked,
      colorblind:this.dom.colorblindToggle.checked,
      volume:Number(this.dom.volumeSlider.value)
    };
    document.body.classList.toggle('reduced-motion', options.reducedMotion);
    document.body.classList.toggle('large-text', options.largeText);
    document.body.classList.toggle('high-contrast', options.colorblind);
    this.audio.volume = options.volume / 100;
    try{ localStorage.setItem('ccrAccessibility', JSON.stringify(options)); }catch(e){}
  }

  chooseDifficulty(mode){
    this.difficulty = mode === 'soulslike' ? 'soulslike' : 'normal';
    this.campaignSeed = (this.dom.seedInput.value.trim() || Math.random().toString(36).slice(2,10)).toUpperCase();
    this.seedState = this.hashSeed(this.campaignSeed);
    this.achievements.setMode(this.difficulty);
    this.dom.difficultyScreen.classList.add('hidden');
    this.startIntro(this.pendingNGPlus);
  }

  hashSeed(text){
    let h = 2166136261;
    for(let i = 0; i < text.length; i++){
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  random(){
    this.seedState = (Math.imul(this.seedState || 1, 1664525) + 1013904223) >>> 0;
    return this.seedState / 4294967296;
  }

  finishIntroCinematic(){
    if(this.state !== 'introCinematic') return;
    this.state = 'dialogue';
    this.dialogue.start(INTRO_LINES.concat(PHASE_INTRO_LINES[0]), () => this.beginGame());
  }

  openAchievements(){
    this.achievementReturnState = this.state;
    this.state = 'achievements';
    this.achievements.renderMenu();
    const filters = document.getElementById('achievementFilters');
    if(filters && !filters.children.length){
      ['Todas','Progresso','Combate','Habilidade','Finais','Desafio','Secretas'].forEach((name, i) => {
        const btn = document.createElement('button');
        btn.className = 'achievement-filter' + (i === 0 ? ' active' : '');
        btn.textContent = name;
        btn.addEventListener('click', () => {
          filters.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.achievements.renderMenu(name);
        });
        filters.appendChild(btn);
      });
    }
    this.dom.achievementsScreen.classList.remove('hidden');
  }

  closeAchievements(){
    this.dom.achievementsScreen.classList.add('hidden');
    this.state = this.achievementReturnState || 'title';
  }

  freshStats(){
    return { deaths: 0, errors: 0, kills: 0, collectibles: 0, collectiblesTotal: this.phaseClasses.length };
  }

  beginGame(){
    // Reiniciar uma tentativa com a mesma semente deve reconstruir a mesma
    // sequência de posições, inimigos e drops.
    this.seedState = this.hashSeed(this.campaignSeed || 'MEIOSE-RELOAD');
    this.initRunProgress();
    this.runMutations = [];
    this.essenceMultiplier = 1;
    this.soulsThreat = 0;
    this.player = new Player(this.bounds.w / 2, this.bounds.h / 2);
    if(this.difficulty === 'soulslike') this.player.invulnDurationMs = 725;
    this.applyPermanentUpgrades();
    this.player.onDamage = (amount, health) => this.notePlayerDamage(amount, health);
    if(this.newGamePlus){
      // NG+: a célula "lembra" TODAS as adaptações já provadas em campanhas
      // anteriores (não só a última), lidas do save persistente.
      const save = SaveData.load();
      Object.keys(this.player.abilities).forEach(key => {
        if(save.unlockedAbilities[key]) this.player.abilities[key] = true;
      });
      this.checkAbilityAchievements();
    }
    // colecionáveis são por tentativa (o mundo reinicia); mortes/erros não são.
    this.stats = this.stats || this.freshStats();
    this.stats.collectibles = 0;
    this.elapsed = 0;
    this.ending = false;
    this.particles = [];
    this.startPhase(0);
    this.state = 'playing';
  }

  /** Mostra/esconde o botão de NG+ conforme o jogador já tenha vencido antes. */
  refreshNgPlusAvailability(){
    const beaten = SaveData.load().beaten;
    if(this.dom.ngPlusBtn) this.dom.ngPlusBtn.classList.toggle('hidden', !beaten);
  }

  /** Volta à tela de título (usado após a vitória, para permitir escolher NG+). */
  backToTitle(){
    this.dom.endScreen.classList.add('hidden');
    this.refreshNgPlusAvailability();
    this.dom.titleScreen.classList.remove('hidden');
    this.state = 'title';
  }

  initRunProgress(){
    if(this.difficulty === 'soulslike'){
      this.runProgress = {
        essence: 0,
        totalUpgrades: 0,
        levels: { health:0, damage:0, speed:0, energy:0 }
      };
      return;
    }
    const saved = SaveData.load().permanentProgress;
    this.runProgress = {
      essence: saved.essence,
      totalUpgrades: saved.totalUpgrades,
      levels: Object.assign({ health:0, damage:0, speed:0, energy:0 }, saved.levels)
    };
  }

  clearRunProgress(){
    // Mantido por compatibilidade com chamadas antigas. A progressão agora é
    // permanente e, portanto, nunca é apagada por morte ou troca de tela.
    this.initRunProgress();
  }

  savePermanentProgress(){
    if(this.difficulty === 'soulslike') return;
    const data = SaveData.load();
    data.permanentProgress = {
      essence: this.runProgress.essence,
      totalUpgrades: this.runProgress.totalUpgrades,
      levels: Object.assign({}, this.runProgress.levels)
    };
    SaveData.save(data);
  }

  applyPermanentUpgrades(){
    const p = this.player;
    const levels = this.runProgress.levels;
    p.maxHealth += levels.health * 15;
    p.health = p.maxHealth;
    p.damageMultiplier = Math.pow(1.12, levels.damage);
    p.baseSpeed *= Math.pow(1.05, levels.speed);
    p.speed = p.baseSpeed;
    p.maxEnergy += levels.energy * 15;
    p.energy = p.maxEnergy;
  }

  getEnemyScale(){
    const upgrades = this.runProgress ? this.runProgress.totalUpgrades : 0;
    const tier = Math.floor(upgrades / 2) + (this.soulsThreat || 0);
    const souls = this.difficulty === 'soulslike';
    return {
      tier,
      hp: (souls ? 1.25 : 1) * (1 + tier * 0.13),
      damage: (souls ? 1.18 : 1) * (1 + tier * 0.08),
      speed: (souls ? 1.07 : 1) * (1 + tier * 0.04)
    };
  }

  getUpgradeCost(key){
    const level = this.runProgress.levels[key] || 0;
    return 8 + level * 6;
  }

  openPause(){
    if(this.state !== 'playing') return;
    this.state = 'paused';
    this.keys = {};
    if(this.dom.mobileControls){
      this.dom.mobileControls.querySelectorAll('.pressed').forEach(button => button.classList.remove('pressed'));
    }
    this.dom.pauseProgressRule.textContent = this.difficulty === 'soulslike'
      ? 'SOULSLIKE: ao morrer, toda a Essência e todas as evoluções desta tentativa serão perdidas.'
      : 'NORMAL: a Essência e estas evoluções são permanentes e continuam no NG+.';
    this.dom.pauseProgressRule.classList.toggle('pause-permanent', this.difficulty === 'normal');
    this.renderUpgradeMenu();
    this.dom.pauseScreen.classList.remove('hidden');
  }

  closePause(){
    if(this.state !== 'paused') return;
    this.dom.pauseScreen.classList.add('hidden');
    this.state = 'playing';
    this.lastTime = performance.now();
  }

  renderUpgradeMenu(){
    const defs = {
      health: { name:'Membrana Reforçada', description:'+15 de vida máxima' },
      damage: { name:'Citoplasma Agressivo', description:'+12% de dano' },
      speed: { name:'Flagelo Adaptativo', description:'+5% de velocidade' },
      energy: { name:'Reserva de ATP', description:'+15 de energia máxima' }
    };
    this.dom.pauseEssence.textContent = this.runProgress.essence;
    this.dom.upgradeList.innerHTML = '';
    Object.entries(defs).forEach(([key, def]) => {
      const level = this.runProgress.levels[key];
      const cost = this.getUpgradeCost(key);
      const button = document.createElement('button');
      button.className = 'upgrade-card';
      button.disabled = this.runProgress.essence < cost;
      button.innerHTML = `<span class="upgrade-name">${def.name}</span><span class="upgrade-level">NÍVEL ${level}</span>
        <span class="upgrade-description">${def.description}</span><span class="upgrade-cost">${cost} ESSÊNCIA</span>`;
      button.addEventListener('click', () => this.buyUpgrade(key));
      this.dom.upgradeList.appendChild(button);
    });
    const scale = this.getEnemyScale();
    const untilNext = 2 - (this.runProgress.totalUpgrades % 2);
    this.dom.enemyScaleText.textContent = scale.tier
      ? `Adaptação inimiga ${scale.tier}: +${Math.round((scale.hp - 1) * 100)}% vida, +${Math.round((scale.damage - 1) * 100)}% dano. Próximo aumento em ${untilNext} evolução(ões).`
      : `Os inimigos se adaptarão depois de ${untilNext} evolução(ões).`;
  }

  buyUpgrade(key){
    const cost = this.getUpgradeCost(key);
    if(this.runProgress.essence < cost || !this.player) return;
    const previousScale = this.getEnemyScale();
    this.runProgress.essence -= cost;
    this.runProgress.levels[key]++;
    this.runProgress.totalUpgrades++;
    const p = this.player;
    if(key === 'health'){
      p.maxHealth += 15;
      p.health = Math.min(p.maxHealth, p.health + 15);
    }else if(key === 'damage'){
      p.damageMultiplier *= 1.12;
    }else if(key === 'speed'){
      p.baseSpeed *= 1.05;
      p.speed = p.baseSpeed;
    }else if(key === 'energy'){
      p.maxEnergy += 15;
      p.energy = Math.min(p.maxEnergy, p.energy + 15);
    }
    const nextScale = this.getEnemyScale();
    if(nextScale.tier > previousScale.tier && this.phase){
      // O degrau de adaptação também alcança os inimigos que já estão na tela.
      for(const d of this.phase.devouradores){
        const hpRatio = nextScale.hp / previousScale.hp;
        const damageRatio = nextScale.damage / previousScale.damage;
        const speedRatio = nextScale.speed / previousScale.speed;
        d.maxHp = Math.round(d.maxHp * hpRatio);
        d.hp = Math.round(d.hp * hpRatio);
        d.contactDamage = Math.round(d.contactDamage * damageRatio);
        d.baseSpeed *= speedRatio;
        d.speed *= speedRatio;
      }
      this.audio.rampEvent();
    }
    this.savePermanentProgress();
    this.audio.unlock();
    this.renderUpgradeMenu();
  }

  startPhase(i){
    this.interludeBackdrop = false;
    this.phaseIndex = i;
    const PhaseClass = this.phaseClasses[i];
    this.phase = new PhaseClass(this);
    this.phaseRun = {
      startElapsed: this.elapsed, damageTaken: 0, killStreak: 0,
      reachedOneHp: false, errorsAtStart: this.stats.errors,
      interactions: new Set(),
      interactiveTypes: new Set(this.phase.items.filter(it => it.type !== 'vida').map(it => it.type))
    };
    this.player.carrying = null;
    this.particles = [];
    const modeLabel = this.difficulty === 'soulslike' ? 'SOULSLIKE' : 'NORMAL';
    this.dom.phaseLabel.textContent = `${modeLabel} • Fase ${i + 1}/5 — ${this.phase.name}`;
    this.dom.objectiveText.textContent = this.getCurrentObjective();
    this.showPhaseBanner(this.phase.name);
    this.phaseZoomT = 0;
    this.phaseFadeIn = 1;
  }

  /** Mostra o indicador grande de fase (estilo Undertale: simples, some sozinho). */
  showPhaseBanner(text){
    const el = this.dom.phaseBanner;
    if(!el) return;
    this.dom.phaseBannerText.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth; // força reflow para reiniciar a animação
    el.classList.add('show');
  }

  onPhaseComplete(){
    this.keys = {};
    this.audio.phaseComplete();
    // completar uma fase inteira recupera parte da vida: o jogador nunca deve
    // sentir que uma partida está perdida só porque errou no começo.
    const p = this.player;
    if(p && p.health > 0 && p.health < p.maxHealth){
      const healAmount = Math.max(15, p.maxHealth * 0.25);
      p.health = Math.min(p.maxHealth, p.health + healAmount);
      this.audio.heal();
      this.spawnParticles(p.x, p.y, '#4ade80', 14, { life: 0.5, speed: 90, glow: true });
    }
    const i = this.phaseIndex;
    const phaseIds = ['phase_interfase','phase_profase','phase_metafase','phase_anafase','phase_telofase'];
    this.achievements.unlock(phaseIds[i]);
    const run = this.phaseRun;
    if(run){
      if(run.damageTaken === 0) this.achievements.unlock('no_damage');
      if(this.elapsed - run.startElapsed < 120) this.achievements.unlock('speedrun');
      if(run.reachedOneHp) this.achievements.unlock('one_hp');
      if(i === 2 && this.stats.errors === run.errorsAtStart) this.achievements.unlock('perfect_metafase');
      if(run.interactiveTypes.size && [...run.interactiveTypes].every(t => run.interactions.has(t))) this.achievements.unlock('curious');
    }
    const proceed = () => {
      if(i < this.phaseClasses.length - 1){
        this.showInterPhaseEvent(i, () => {
          this.playPhaseTransition(i, i + 1, () => {
            this.state = 'dialogue';
            const lines = PHASE_OUTRO_LINES[i].concat(PHASE_INTRO_LINES[i + 1]);
            this.dialogue.start(lines, () => {
              this.startPhase(i + 1);
              this.state = 'playing';
            });
          });
        });
      } else {
        this.onVictory();
      }
    };

    // Ao final desta fase, o jogador "venceu o boss" daquele estágio da mitose
    // e ganha permanentemente uma nova adaptação — a menos que já a tenha
    // (concedida durante a própria luta, como a Sobrecarga na Telófase, ou herdada do NG+).
    const unlock = ABILITY_UNLOCKS[i];
    if(unlock && p && !p.abilities[unlock.key]){
      p.abilities[unlock.key] = true;
      this.checkAbilityAchievements();
      this.showUnlockScreen(unlock, proceed);
    } else {
      proceed();
    }
  }

  showInterPhaseEvent(phaseIndex, onDone){
    const events = [
      {
        title:'RESERVA DE ATP',
        description:'Uma organela intacta ainda guarda energia suficiente para uma adaptação.',
        choices:[
          { name:'Absorver a reserva', text:'+18 Essência.', apply:() => { this.runProgress.essence += 18; this.savePermanentProgress(); } },
          { name:'Reparar a membrana', text:'Recupere 35% da vida máxima.', apply:() => { this.player.health = Math.min(this.player.maxHealth, this.player.health + this.player.maxHealth * .35); } }
        ]
      },
      {
        title:'MUTAÇÃO INSTÁVEL',
        description:'O DNA oferece dois caminhos. Toda adaptação cobra um preço.',
        choices:[
          { name:'Célula de Vidro', text:'+30% de dano, mas -20 de vida máxima.', apply:() => this.applyRunMutation('glass') },
          { name:'Membrana Densa', text:'Receba 15% menos dano, mas mova-se 8% mais devagar.', apply:() => this.applyRunMutation('armor') }
        ]
      },
      {
        title:'ECOS DOS DEVORADORES',
        description:'Fragmentos inimigos podem ser assimilados ou destruídos.',
        choices:[
          { name:'Assimilar', text:'+50% de Essência por abate. No Soulslike, os inimigos também evoluem.', apply:() => { this.essenceMultiplier *= 1.5; if(this.difficulty === 'soulslike') this.soulsThreat++; } },
          { name:'Purificar', text:'Recupere toda a energia e 20 pontos de vida.', apply:() => { this.player.energy=this.player.maxEnergy; this.player.health=Math.min(this.player.maxHealth,this.player.health+20); } }
        ]
      },
      {
        title:'DIVISÃO NO LIMITE',
        description:'Antes da etapa final, a célula escolhe entre segurança e poder.',
        choices:[
          { name:'Pulso Predatório', text:'+20% de dano e +10% de velocidade. Inimigos ficam mais resistentes no Soulslike.', apply:() => { this.player.damageMultiplier*=1.2; this.player.baseSpeed*=1.1; if(this.difficulty === 'soulslike') this.soulsThreat++; } },
          { name:'Reserva Vital', text:'+25 de vida e energia máximas nesta campanha.', apply:() => { this.player.maxHealth+=25; this.player.health+=25; this.player.maxEnergy+=25; this.player.energy+=25; } }
        ]
      }
    ];
    const event = events[phaseIndex % events.length];
    this.state = 'event';
    this.dom.eventTag.textContent = this.difficulty === 'soulslike' ? 'EVENTO SOULSLIKE' : 'EVENTO CELULAR';
    this.dom.eventTitle.textContent = event.title;
    this.dom.eventDescription.textContent = event.description;
    this.dom.eventChoices.innerHTML = '';
    let resolved = false;
    event.choices.forEach(choice => {
      const button = document.createElement('button');
      button.className = 'event-choice';
      button.innerHTML = `<strong>${choice.name}</strong><span>${choice.text}</span>`;
      button.addEventListener('click', () => {
        if(resolved) return;
        resolved = true;
        this.dom.eventChoices.querySelectorAll('button').forEach(option => option.disabled = true);
        choice.apply();
        this.dom.eventScreen.classList.add('hidden');
        onDone();
      }, { once:true });
      this.dom.eventChoices.appendChild(button);
    });
    this.dom.eventScreen.classList.remove('hidden');
  }

  applyRunMutation(id){
    if(this.runMutations.includes(id)) return;
    this.runMutations.push(id);
    if(id === 'glass'){
      this.player.damageMultiplier *= 1.3;
      this.player.maxHealth = Math.max(30, this.player.maxHealth - 20);
      this.player.health = Math.min(this.player.health, this.player.maxHealth);
    }else if(id === 'armor'){
      this.player.incomingDamageMultiplier *= .85;
      this.player.baseSpeed *= .92;
    }
  }

  /** Mostra a tela "NOVA ADAPTAÇÃO" e pausa o jogo até o jogador confirmar. */
  showUnlockScreen(unlock, onDone){
    this.state = 'unlock';
    this.pendingUnlockDone = onDone;
    this.audio.unlock();
    this.checkAbilityAchievements();
    this.dom.unlockName.textContent = unlock.name;
    this.dom.unlockFlavor.textContent = unlock.flavor;
    this.dom.unlockControl.textContent = unlock.controlHint;
    this.dom.unlockScreen.classList.remove('hidden');
  }

  dismissUnlock(){
    if(this.state !== 'unlock') return;
    this.dom.unlockScreen.classList.add('hidden');
    const cb = this.pendingUnlockDone;
    this.pendingUnlockDone = null;
    if(cb) cb();
  }

  onVictory(){
    if(this.ending) return;
    this.ending = true;
    this.state = 'dialogue';
    const endingDef = decideEnding(this.stats);
    this.achievements.recordEnding(endingDef.id);
    SaveData.markBeaten(this.player.abilities);
    // PHASE_OUTRO_LINES[4] é sempre [] (a vitória é tratada aqui, não no outro genérico)
    const lines = PHASE_OUTRO_LINES[this.phaseIndex].concat(endingDef.lines);
    this.dialogue.start(lines, () => {
      const finish = () => this.showEndScreen(endingDef, true);
      if(endingDef.cinematic){
        this.playEndingCinematic(endingDef.cinematic, finish);
      } else {
        finish();
      }
    });
  }

  onDefeat(){
    if(this.ending) return;
    this.ending = true;
    if(this.difficulty === 'soulslike') this.initRunProgress();
    this.state = 'dialogue';
    this.audio.fail();
    this.triggerShake(8, 0.4);

    // "Perder a última fase" é a condição do Final Muito Ruim (Extinção):
    // morrer antes disso é só um game over comum, com direito a retry.
    const isExtinction = this.phaseIndex === this.phaseClasses.length - 1;
    if(!isExtinction && this.stats) this.stats.deaths++;
    const endingDef = isExtinction ? EXTINCTION_ENDING : null;
    if(isExtinction){
      this.achievements.unlock('final_boss_death');
      this.achievements.recordEnding('veryBad');
    }
    const lines = endingDef ? endingDef.lines : DEFEAT_LINES;

    this.dialogue.start(lines, () => {
      const finish = () => {
        if(endingDef){
          this.showEndScreen(endingDef, false);
        } else {
          this.state = 'defeat';
          this.dom.endTitle.className = 'title end-title';
          this.dom.endTitle.textContent = 'FALHA NA MITOSE';
          this.dom.endMessage.innerHTML =
            'A última célula foi consumida.<br>' +
            'O organismo entrou em colapso.';
          this.dom.playAgainBtn.classList.add('hidden');
          this.dom.retryBtn.classList.remove('hidden');
          this.dom.endScreen.classList.remove('hidden');
        }
      };
      if(endingDef && endingDef.cinematic){
        this.playEndingCinematic(endingDef.cinematic, finish);
      } else {
        finish();
      }
    });
  }

  /** Preenche e mostra a tela final com o final decidido (vitória ou Extinção). */
  showEndScreen(endingDef, isVictory){
    // Segunda garantia de registro: a conquista é confirmada no momento em
    // que o jogador realmente chega à tela do final.
    if(endingDef && this.achievements) this.achievements.recordEnding(endingDef.id);
    this.state = isVictory ? 'victory' : 'defeat';
    this.dom.endTitle.className = 'title end-title end-title-' + endingDef.id;
    this.dom.endTitle.textContent = endingDef.title;
    const grade = this.calculateRunGrade(isVictory);
    this.dom.endMessage.innerHTML = endingDef.message +
      `<div class="run-grade"><strong>${grade}</strong> TEMPO ${this.formatTime(this.elapsed)} • ABATES ${this.stats?.kills || 0} • ERROS ${this.stats?.errors || 0} • FRAGMENTOS ${this.stats?.collectibles || 0}/5<br>SEMENTE ${this.campaignSeed || '—'} • ${this.difficulty === 'soulslike' ? 'SOULSLIKE' : 'NORMAL'}</div>`;
    this.dom.retryBtn.classList.toggle('hidden', isVictory);
    this.dom.playAgainBtn.classList.toggle('hidden', !isVictory);
    this.dom.endScreen.classList.remove('hidden');
  }

  calculateRunGrade(isVictory){
    if(!isVictory) return 'D';
    const stats = this.stats || this.freshStats();
    let score = 100;
    score -= stats.deaths * 15;
    score -= stats.errors * 4;
    score -= Math.max(0, 5 - stats.collectibles) * 3;
    score -= Math.max(0, this.elapsed - 420) / 20;
    if(score >= 96) return 'S+';
    if(score >= 88) return 'S';
    if(score >= 76) return 'A';
    if(score >= 62) return 'B';
    return 'C';
  }

  /**
   * Toca a cinemática final (reaproveitando fundo/câmera/partículas já
   * existentes) antes de mostrar a tela com o texto do final. Pausa o jogo:
   * durante o estado 'endingCinematic' a fase não é atualizada nem desenhada.
   */
  playEndingCinematic(kind, onDone){
    this.state = 'endingCinematic';
    this.endingKind = kind;
    this.endingT = 0;
    this.endingDuration = kind === 'evolution' ? 5.4 : (kind === 'rebirth' ? 4.4 : 3.2);
    this.endingDone = onDone;
  }

  /**
   * Pequena vinheta narrativa entre fases. Ela usa a mesma linguagem visual
   * da introdução: fundo escuro, formas celulares simples e texto curto.
   */
  playPhaseTransition(fromIndex, toIndex, onDone){
    this.state = 'phaseTransition';
    this.interludeBackdrop = true;
    this.phaseTransitionT = 0;
    this.phaseTransitionDuration = 2.6;
    this.phaseTransitionFrom = fromIndex;
    this.phaseTransitionTo = toIndex;
    this.phaseTransitionDone = onDone;
  }

  reset(){
    this.dom.endScreen.classList.add('hidden');
    this.beginGame();
  }

  flashDamage(){ this.damageFlash = 1; }

  notePlayerDamage(amount, health){
    if(!this.phaseRun) return;
    this.phaseRun.damageTaken += amount;
    this.phaseRun.killStreak = 0;
    if(health === 1) this.phaseRun.reachedOneHp = true;
  }

  recordInteraction(type){
    if(this.phaseRun && type) this.phaseRun.interactions.add(type);
  }

  checkAbilityAchievements(){
    if(!this.player) return;
    const count = Object.values(this.player.abilities).filter(Boolean).length;
    if(count >= 1) this.achievements.unlock('ability_first');
    if(count === Object.keys(this.player.abilities).length) this.achievements.unlock('ability_all');
  }

  // ---------------------------------------------------------------------
  // Efeitos visuais: partículas, câmera shake, fundo vivo
  // ---------------------------------------------------------------------
  spawnParticles(x, y, color, count, opts = {}){
    for(let i = 0; i < count; i++){
      this.particles.push(new Particle(x, y, Object.assign({ color }, opts)));
    }
  }

  spawnExplosion(x, y, color){
    this.spawnParticles(x, y, color, 22, { speed: 130, life: 0.55, r: 3, drag: 1.6 });
    this.spawnParticles(x, y, '#ffffff', 8, { speed: 90, life: 0.3, r: 2, drag: 2 });
    this.triggerShake(6, 0.22);
  }

  triggerShake(mag, duration){
    if(document.body.classList.contains('reduced-motion')) return;
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeTimeLeft = Math.max(this.shakeTimeLeft, duration);
  }

  updateParticles(dt){
    for(const pt of this.particles) pt.update(dt);
    this.particles = this.particles.filter(pt => !pt.isDead);
  }

  renderParticles(ctx){
    for(const pt of this.particles){
      ctx.save();
      ctx.globalAlpha = pt.alpha;
      ctx.fillStyle = pt.color;
      if(pt.glow){
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 8;
      }
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  makeBackgroundBlobs(){
    const blobs = [];
    for(let i = 0; i < 6; i++){
      blobs.push({
        x: Math.random() * this.bounds.w,
        y: Math.random() * this.bounds.h,
        r: 60 + Math.random() * 90,
        speed: 6 + Math.random() * 10,
        angle: Math.random() * Math.PI * 2,
        hue: [ '#1a2740', '#152238', '#1e1633', '#132a2a' ][i % 4],
        phase: Math.random() * Math.PI * 2
      });
    }
    return blobs;
  }

  renderBackground(ctx){
    const b = this.bounds;
    const phaseBackgrounds = ['#07151a', '#100d1b', '#09101d', '#0d1118', '#071411'];
    ctx.fillStyle = this.phase ? phaseBackgrounds[this.phaseIndex] : '#0b0f16';
    ctx.fillRect(0, 0, b.w, b.h);

    // organelas lentas ao fundo
    this.blobs.forEach(bl => {
      bl.x += Math.cos(bl.angle) * bl.speed * 0.016;
      bl.y += Math.sin(bl.angle) * bl.speed * 0.016;
      if(bl.x < -bl.r) bl.x = b.w + bl.r;
      if(bl.x > b.w + bl.r) bl.x = -bl.r;
      if(bl.y < -bl.r) bl.y = b.h + bl.r;
      if(bl.y > b.h + bl.r) bl.y = -bl.r;
      const pulse = 1 + Math.sin(this.time * 0.6 + bl.phase) * 0.08;
      const grad = ctx.createRadialGradient(bl.x, bl.y, 0, bl.x, bl.y, bl.r * pulse);
      grad.addColorStop(0, bl.hue);
      grad.addColorStop(1, 'rgba(11,15,22,0)');
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bl.x, bl.y, bl.r * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    if(this.phase) this.renderPhaseScenario(ctx, this.phaseIndex);

    // grade sutil
    ctx.strokeStyle = 'rgba(108,140,255,0.05)';
    ctx.lineWidth = 1;
    for(let x = 0; x < b.w; x += 40){
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, b.h); ctx.stroke();
    }
    for(let y = 0; y < b.h; y += 40){
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(b.w, y); ctx.stroke();
    }

    // vinheta pulsante
    const vg = ctx.createRadialGradient(b.w / 2, b.h / 2, b.h * 0.3, b.w / 2, b.h / 2, b.h * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${0.35 + Math.sin(this.time * 0.5) * 0.03})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, b.w, b.h);
  }

  /** Cenários biológicos próprios de cada etapa da mitose. */
  renderPhaseScenario(ctx, index){
    const b = this.bounds, cx = b.w / 2, cy = b.h / 2;
    const time = this.time;
    ctx.save();

    if(index === 0){
      // Interfase: citoplasma rico em organelas e mitocôndrias produzindo ATP.
      for(let i = 0; i < 10; i++){
        const x = 75 + (i * 137) % (b.w - 130);
        const y = 62 + (i * 83) % (b.h - 110);
        const wobble = Math.sin(time * .7 + i) * 5;
        ctx.save();
        ctx.translate(x + wobble, y);
        ctx.rotate(Math.sin(time * .35 + i) * .25);
        ctx.globalAlpha = .18;
        ctx.strokeStyle = i % 2 ? '#4ade80' : '#54d6ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, 27, 12, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let j = -16; j <= 16; j += 8){
          const yy = Math.sin(j * .35 + time) * 5;
          if(j === -16) ctx.moveTo(j, yy); else ctx.lineTo(j, yy);
        }
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = .12;
      ctx.strokeStyle = '#8fe3c7';
      ctx.setLineDash([8,10]);
      ctx.beginPath(); ctx.arc(cx,cy,205 + Math.sin(time)*5,0,Math.PI*2); ctx.stroke();
    }else if(index === 1){
      // Prófase: envelope nuclear se desfaz e a cromatina se condensa.
      ctx.globalAlpha = .16;
      ctx.strokeStyle = '#9b7bff';
      ctx.lineWidth = 4;
      ctx.setLineDash([18, 9 + Math.sin(time * 1.5) * 4]);
      ctx.beginPath(); ctx.arc(cx,cy,185,0,Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
      for(let i = 0; i < 9; i++){
        const ang = i * 2.399 + time * .04;
        const radius = 45 + (i % 3) * 45;
        const x = cx + Math.cos(ang) * radius;
        const y = cy + Math.sin(ang) * radius;
        ctx.save(); ctx.translate(x,y); ctx.rotate(ang + time * .08);
        ctx.fillStyle = i % 2 ? 'rgba(155,123,255,.2)' : 'rgba(84,214,255,.15)';
        ctx.fillRect(-4,-19,8,38); ctx.rotate(Math.PI/2); ctx.fillRect(-4,-19,8,38);
        ctx.restore();
      }
    }else if(index === 2){
      // Metáfase: fibras do fuso convergem para a placa equatorial.
      ctx.globalAlpha = .13;
      ctx.strokeStyle = '#54d6ff';
      ctx.lineWidth = 1.5;
      for(let i = 0; i < 13; i++){
        const y = 35 + i * 41;
        ctx.beginPath(); ctx.moveTo(35,cy); ctx.quadraticCurveTo(cx-140,y,cx,y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(b.w-35,cy); ctx.quadraticCurveTo(cx+140,y,cx,y); ctx.stroke();
      }
      ctx.globalAlpha = .22;
      ctx.fillStyle = '#9b7bff';
      ctx.fillRect(cx-3,28,6,b.h-56);
      ctx.globalAlpha = .18;
      for(const side of [-1,1]){
        ctx.beginPath();
        ctx.arc(side < 0 ? 38 : b.w-38,cy,18 + Math.sin(time*2)*2,0,Math.PI*2);
        ctx.fill();
      }
    }else if(index === 3){
      // Anáfase: dois polos puxam as cromátides para lados opostos.
      const left = 65, right = b.w - 65;
      ctx.globalAlpha = .15;
      for(let i = 0; i < 11; i++){
        const y = 45 + i * 47;
        ctx.strokeStyle = i % 2 ? '#4ade80' : '#4c8cff';
        ctx.beginPath(); ctx.moveTo(left,cy); ctx.lineTo(cx-35,y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(right,cy); ctx.lineTo(cx+35,y); ctx.stroke();
      }
      [left,right].forEach((x,i) => {
        ctx.globalAlpha = .26;
        ctx.strokeStyle = i ? '#4c8cff' : '#4ade80';
        for(let ray=0; ray<12; ray++){
          const a = ray / 12 * Math.PI * 2 + time * .12;
          ctx.beginPath(); ctx.moveTo(x,cy); ctx.lineTo(x+Math.cos(a)*32,cy+Math.sin(a)*32); ctx.stroke();
        }
      });
    }else{
      // Telófase: dois núcleos estáveis e um sulco de clivagem fechando a célula.
      ctx.globalAlpha = .14;
      const nucleusDistance = 255;
      [-1,1].forEach((side,i) => {
        const x = cx + side * nucleusDistance;
        const color = i ? '#4c8cff' : '#4ade80';
        const glow = ctx.createRadialGradient(x,cy,10,x,cy,105);
        glow.addColorStop(0, color + '66');
        glow.addColorStop(1, color + '00');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(x,cy,105,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x,cy,72 + Math.sin(time*1.3+i)*3,0,Math.PI*2); ctx.stroke();
      });
      ctx.globalAlpha = .18;
      ctx.strokeStyle = '#8fe3c7';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx,0);
      ctx.bezierCurveTo(cx-42,cy-90,cx-42,cy+90,cx,b.h);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------
  // Movimento
  // ---------------------------------------------------------------------
  handleMovement(dt){
    const p = this.player;
    // Sobrecarga Mitótica: velocidade base aumentada enquanto ativa
    p.speed = p.isOverloaded ? p.baseSpeed * 1.35 : p.baseSpeed;

    let dx = 0, dy = 0;
    if(this.keys['w'] || this.keys['arrowup']) dy -= 1;
    if(this.keys['s'] || this.keys['arrowdown']) dy += 1;
    if(this.keys['a'] || this.keys['arrowleft']) dx -= 1;
    if(this.keys['d'] || this.keys['arrowright']) dx += 1;
    const hasInput = dx !== 0 || dy !== 0;
    let tx = 0, ty = 0;
    if(hasInput){
      const len = Math.hypot(dx, dy) || 1; // normaliza para diagonal perfeita (mesma velocidade em qualquer direção)
      tx = (dx / len) * p.speed;
      ty = (dy / len) * p.speed;
    }

    // Dash Celular: por uma janela curta, ignora o input e dispara na direção travada
    if(p.isDashing){
      tx = p.dashDirX * p.dashSpeedBoost;
      ty = p.dashDirY * p.dashSpeedBoost;
    }

    // Interpolação exponencial: acelera rápido, mas freia com uma pitada de inércia.
    // Isso dá sensação de peso sem tornar a célula lenta para responder.
    const accelRate = p.isDashing ? 30 : (hasInput ? 13 : 8.5);
    const t = 1 - Math.exp(-accelRate * dt);
    p.vx += (tx - p.vx) * t;
    p.vy += (ty - p.vy) * t;

    // trava valores residuais minúsculos para a célula realmente parar
    if(!hasInput && Math.hypot(p.vx, p.vy) < 2){ p.vx = 0; p.vy = 0; }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // rastro discreto atrás da célula enquanto ela se move de verdade
    const speed = Math.hypot(p.vx, p.vy);
    if(speed > 24){
      this.trailTimer -= dt;
      if(this.trailTimer <= 0){
        this.trailTimer = 0.05;
        this.spawnParticles(p.x, p.y, '#8fe3c7', 1, { speed: 0, life: 0.32, r: p.r * 0.55, drag: 3.4, glow: false });
      }
    }

    // câmera com leve antecipação: acompanha a direção do movimento de forma suave
    const leadFactor = 0.055;
    const camT = 1 - Math.exp(-4 * dt);
    this.camLeadX += (p.vx * leadFactor - this.camLeadX) * camT;
    this.camLeadY += (p.vy * leadFactor - this.camLeadY) * camT;
  }

  // ---------------------------------------------------------------------
  // Loop principal
  // ---------------------------------------------------------------------
  loop(ts){
    if(!this.lastTime) this.lastTime = ts;
    const rawDt = Math.min(0.05, (ts - this.lastTime) / 1000);
    this.lastTime = ts;
    // hit-stop: um congelamento breve (50~80ms) ao acertar um golpe dá peso ao impacto
    const frozen = performance.now() < this.hitStopUntil;
    const dt = frozen ? 0 : rawDt;
    this.time += dt;
    if(this.dom.mobileControls) this.dom.mobileControls.classList.toggle('active', this.state === 'playing');

    if(this.phaseZoomT < 1){
      this.phaseZoomT = Math.min(1, this.phaseZoomT + rawDt / 0.5);
    }
    if(this.phaseFadeIn > 0){
      this.phaseFadeIn = Math.max(0, this.phaseFadeIn - rawDt * 2.4);
    }

    if(this.state === 'playing'){
      this.elapsed += dt;
      this.handleMovement(dt);
      this.phase.update(dt);
      this.phase.updatePlayerProjectiles(dt);
      if(this.phase.completed) this.onPhaseComplete();
      if(this.combo > 0){
        this.comboTimer -= dt;
        if(this.comboTimer <= 0) this.combo = 0;
      }
      this.updateHUD();
    }

    if(this.state === 'introCinematic'){
      this.introT += rawDt;
      if(this.introT >= this.introDuration) this.finishIntroCinematic();
    }

    if(this.state === 'phaseTransition'){
      this.phaseTransitionT += rawDt;
      if(this.phaseTransitionT >= this.phaseTransitionDuration){
        const cb = this.phaseTransitionDone;
        this.phaseTransitionDone = null;
        if(cb) cb();
      }
    }

    if(this.state === 'endingCinematic'){
      this.endingT += dt;
      if(this.endingT >= this.endingDuration){
        const cb = this.endingDone;
        this.endingDone = null;
        if(cb) cb();
      }
    }

    if(this.state === 'playing' && this.player){
      const moving = Math.hypot(this.player.vx, this.player.vy) > 3;
      const movementKey = ['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].some(k => this.keys[k]);
      this.idleAchievementTime = (!moving && !movementKey) ? (this.idleAchievementTime || 0) + rawDt : 0;
      if(this.idleAchievementTime >= 30) this.achievements.unlock('idle_30');
    }

    if(this.player){
      if(this.player.attackFlash > 0) this.player.attackFlash = Math.max(0, this.player.attackFlash - dt * 3.2);
      if(this.player.hurtFlash > 0) this.player.hurtFlash = Math.max(0, this.player.hurtFlash - dt * 2.4);
      if(this.player.pulseFlash > 0) this.player.pulseFlash = Math.max(0, this.player.pulseFlash - dt * 2.2);
    }

    if(this.damageFlash > 0) this.damageFlash = Math.max(0, this.damageFlash - dt * 2);

    if(this.shakeTimeLeft > 0){
      this.shakeTimeLeft = Math.max(0, this.shakeTimeLeft - dt);
      const m = this.shakeMag * (this.shakeTimeLeft > 0 ? 1 : 0);
      this.shakeX = (Math.random() * 2 - 1) * m;
      this.shakeY = (Math.random() * 2 - 1) * m;
      if(this.shakeTimeLeft <= 0) this.shakeMag = 0;
    } else {
      this.shakeX = 0; this.shakeY = 0;
    }

    this.updateParticles(dt);
    this.render();
    requestAnimationFrame(this.loop.bind(this));
  }

  updateHUD(){
    const p = this.player;
    this.dom.healthFill.style.width = (p.health / p.maxHealth * 100) + '%';
    this.dom.energyFill.style.width = (p.energy / p.maxEnergy * 100) + '%';
    this.dom.progressFill.style.width = (this.phase.progress * 100) + '%';
    this.dom.timerText.textContent = this.formatTime(this.elapsed);
    this.dom.objectiveText.textContent = this.getCurrentObjective();
    if(this.dom.devouradoresCount){
      const alive = this.phase.devouradores ? this.phase.devouradores.length : 0;
      this.dom.devouradoresCount.textContent = alive;
    }
    if(this.dom.essenceCount) this.dom.essenceCount.textContent = this.runProgress ? this.runProgress.essence : 0;
    this.dom.healthFill.parentElement.classList.toggle('bar-low', p.health / p.maxHealth < 0.3);
    this.updateAbilityHUD();
  }

  getCurrentObjective(){
    if(!this.phase) return '—';
    const guardian = this.phase.devouradores?.find(d => d.type === 'boss');
    if(this.difficulty === 'soulslike' && guardian && this.phaseIndex < 4){
      return `${this.phase.objective} Derrote ${guardian.bossName || 'o Guardião'}.`;
    }
    return this.phase.objective;
  }

  /** Mostra/atualiza os ícones das adaptações já desbloqueadas e seu estado de cooldown. */
  updateAbilityHUD(){
    const p = this.player;
    if(!p || !this.dom.abilityBar) return;
    const order = ['dash', 'shot', 'pulse', 'overload'];
    const unlockedAny = order.some(k => p.abilities[k]);
    if(this.dom.abilityRow) this.dom.abilityRow.style.display = unlockedAny ? 'flex' : 'none';
    order.forEach(key => {
      if(!p.abilities[key]) return;
      let el = this.dom.abilityBar.querySelector(`[data-ability="${key}"]`);
      if(!el){
        el = document.createElement('div');
        el.className = 'ability-slot';
        el.dataset.ability = key;
        el.innerHTML = `<span class="ability-key">${ABILITY_META[key].keyLabel}</span><span class="ability-label">${ABILITY_META[key].label}</span>`;
        this.dom.abilityBar.appendChild(el);
      }
      const getterName = 'can' + key.charAt(0).toUpperCase() + key.slice(1);
      el.classList.toggle('ready', !!p[getterName]);
    });
    if(this.dom.mobileControls){
      const mobileMap = { dash:'dash', shot:'shot', pulse:'pulse', overload:'overload' };
      Object.entries(mobileMap).forEach(([action,key]) => {
        const button = this.dom.mobileControls.querySelector(`[data-mobile-action="${action}"]`);
        if(button) button.disabled = !p.abilities[key];
      });
    }
  }

  formatTime(s){
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  // ---------------------------------------------------------------------
  // Renderização
  // ---------------------------------------------------------------------
  render(){
    const ctx = this.ctx, b = this.bounds;
    ctx.clearRect(0, 0, b.w, b.h);

    ctx.save();

    // pequeno zoom ao iniciar uma fase, suavizando com ease-out
    const easedZoom = 1 - Math.pow(1 - this.phaseZoomT, 3);
    const zoom = 1 + (1 - easedZoom) * 0.07;
    ctx.translate(b.w / 2, b.h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-b.w / 2, -b.h / 2);

    ctx.translate(this.shakeX - this.camLeadX, this.shakeY - this.camLeadY);

    this.renderBackground(ctx);

    if(this.phase && (this.state === 'playing' || this.state === 'dialogue' || this.state === 'unlock')){
      this.phase.render(ctx);
      this.renderBossBar(ctx);
      this.renderPlayerProjectiles(ctx);
    }

    if(this.state === 'endingCinematic'){
      this.renderEndingCinematic(ctx);
    }
    if(this.state === 'introCinematic'){
      this.renderIntroCinematic(ctx);
    }
    if(this.state === 'phaseTransition'){
      this.renderPhaseTransition(ctx);
    }
    if(this.state === 'dialogue' && this.interludeBackdrop){
      this.renderPhaseTransition(ctx);
    }

    this.renderParticles(ctx);

    if(this.showEssenceGain && performance.now() < this.showEssenceGain.until){
      const life = (this.showEssenceGain.until - performance.now()) / 900;
      ctx.save();
      ctx.globalAlpha = Math.min(1, life * 2);
      ctx.textAlign = 'right';
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#ffd166';
      ctx.shadowColor = '#ffd166';
      ctx.shadowBlur = 8;
      ctx.fillText(`+${this.showEssenceGain.amount} ESSÊNCIA`, b.w - 28, 58 - (1 - life) * 12);
      ctx.restore();
    }

    if(this.damageFlash > 0){
      ctx.fillStyle = `rgba(255,60,80,${0.25 * this.damageFlash})`;
      ctx.fillRect(0, 0, b.w, b.h);
    }

    if(this.phaseFadeIn > 0){
      ctx.fillStyle = `rgba(6,8,12,${this.phaseFadeIn})`;
      ctx.fillRect(0, 0, b.w, b.h);
    }

    ctx.restore();
  }

  /** Desenha os projéteis do Disparo de Energia (Boss 2) — separado dos projéteis inimigos. */
  renderPlayerProjectiles(ctx){
    if(!this.phase || !this.phase.playerProjectiles) return;
    this.phase.playerProjectiles.forEach(pr => {
      ctx.save();
      ctx.shadowColor = pr.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = pr.color;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  renderIntroCinematic(ctx){
    const b = this.bounds, t = Math.min(1, this.introT / this.introDuration);
    ctx.save();
    ctx.fillStyle = '#020304';
    ctx.fillRect(0, 0, b.w, b.h);
    const scenes = [
      { at:0, text:'HÁ MUITO TEMPO, ESTE ORGANISMO ERA SAUDÁVEL.' },
      { at:.24, text:'ENTÃO, ALGO COMEÇOU A DEVORAR SUAS CÉLULAS.' },
      { at:.5, text:'UMA A UMA, ELAS DESAPARECERAM.' },
      { at:.74, text:'ATÉ RESTAR APENAS VOCÊ.' }
    ];
    const scene = [...scenes].reverse().find(s => t >= s.at) || scenes[0];
    const local = (t - scene.at) / .24;
    const alpha = Math.min(1, local * 5, (1 - local) * 5);
    const count = scene.at < .24 ? 18 : scene.at < .5 ? 10 : scene.at < .74 ? 3 : 1;
    for(let i = 0; i < count; i++){
      const a = i * 2.399 + this.time * .05;
      const r = 24 + Math.sqrt(i) * 43;
      const x = b.w/2 + Math.cos(a) * r;
      const y = b.h/2 - 45 + Math.sin(a) * r * .55;
      ctx.strokeStyle = i === count - 1 && count === 1 ? '#8fe3c7' : 'rgba(143,227,199,.5)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x,y,10 + Math.sin(this.time*2+i)*1.3,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle = 'rgba(76,140,255,.55)';
      ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(scene.text, b.w/2, b.h - 75);
    ctx.globalAlpha = .6;
    ctx.font = '11px monospace';
    ctx.fillText('ENTER para avançar', b.w/2, b.h - 38);
    ctx.restore();
  }

  renderPhaseTransition(ctx){
    const b = this.bounds;
    const cx = b.w / 2, cy = b.h / 2;
    const t = Math.min(1, this.phaseTransitionT / this.phaseTransitionDuration);
    const names = ['INTERFASE','PRÓFASE','METÁFASE','ANÁFASE','TELÓFASE'];
    const ease = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    ctx.save();
    ctx.fillStyle = '#020304';
    ctx.fillRect(0, 0, b.w, b.h);

    ctx.translate(cx, cy - 25);
    const pulse = 1 + Math.sin(this.time * 2.4) * .035;
    ctx.strokeStyle = '#8fe3c7';
    ctx.fillStyle = '#4c8cff';
    ctx.lineWidth = 3;

    if(this.phaseTransitionTo === 1){
      // Prófase: fios de DNA soltos se condensam em cromossomos.
      for(let i = 0; i < 4; i++){
        const y = (i - 1.5) * 22;
        const spread = (1 - ease) * 110;
        ctx.beginPath();
        ctx.moveTo(-spread, y - 8);
        ctx.bezierCurveTo(-25, y - 22, 25, y + 22, spread, y + 8);
        ctx.stroke();
        ctx.save();
        ctx.translate((i - 1.5) * 28 * ease, y);
        ctx.rotate(i * .6);
        ctx.fillRect(-3, -13 * ease, 6, 26 * ease);
        ctx.rotate(Math.PI / 2);
        ctx.fillRect(-3, -13 * ease, 6, 26 * ease);
        ctx.restore();
      }
    }else if(this.phaseTransitionTo === 2){
      // Metáfase: cromossomos chegam de todos os lados e formam uma linha.
      ctx.strokeStyle = 'rgba(155,123,255,.55)';
      ctx.beginPath(); ctx.moveTo(0,-90); ctx.lineTo(0,90); ctx.stroke();
      for(let i = 0; i < 5; i++){
        const startX = (i % 2 ? -1 : 1) * (150 + i * 18);
        const x = startX * (1 - ease);
        const y = (i - 2) * 30;
        ctx.save(); ctx.translate(x,y); ctx.rotate(Math.PI/4);
        ctx.fillStyle = ['#9b7bff','#54d6ff','#ffb84d','#ff6bcb','#6bffb0'][i];
        ctx.fillRect(-4,-15,8,30); ctx.rotate(Math.PI/2); ctx.fillRect(-4,-15,8,30);
        ctx.restore();
      }
    }else if(this.phaseTransitionTo === 3){
      // Anáfase: pares alinhados se separam para polos opostos.
      for(let i = 0; i < 4; i++){
        const y = (i - 1.5) * 28;
        const distance = 18 + ease * 125;
        ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.arc(-distance,y,7,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#4c8cff'; ctx.beginPath(); ctx.arc(distance,y,7,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(238,242,246,.18)';
        ctx.beginPath(); ctx.moveTo(-distance,y); ctx.lineTo(distance,y); ctx.stroke();
      }
    }else{
      // Telófase: duas novas membranas nucleares se fecham.
      const distance = 78 * ease;
      [-1,1].forEach((side, index) => {
        ctx.save(); ctx.translate(side * distance,0); ctx.scale(pulse,pulse);
        ctx.strokeStyle = index ? '#4c8cff' : '#4ade80';
        ctx.globalAlpha = .35 + ease * .65;
        ctx.beginPath(); ctx.arc(0,0,34,Math.PI*(1-ease),Math.PI*(1+ease)); ctx.stroke();
        ctx.fillStyle = index ? '#4c8cff' : '#4ade80';
        ctx.beginPath(); ctx.arc(0,0,9,0,Math.PI*2); ctx.fill();
        ctx.restore();
      });
    }
    ctx.restore();

    const alpha = Math.min(1, t * 5, (1 - t) * 5);
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.textAlign = 'center';
    ctx.font = '11px monospace';
    ctx.fillStyle = '#8ea3c2';
    ctx.fillText(`${names[this.phaseTransitionFrom]} CONCLUÍDA`, cx, cy + 75);
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(`A CÉLULA AVANÇA PARA A ${names[this.phaseTransitionTo]}`, cx, cy + 108);
    ctx.restore();
  }

  /**
   * Cinemática final. Reaproveita fundo, câmera e partículas já existentes
   * em vez de criar telas novas:
   * - 'rebirth'/'evolution': a célula se divide (1→2→4→8) enquanto a câmera
   *   se afasta, revelando uma silhueta humana geométrica (mesma linguagem
   *   de "tudo é forma desenhada em Canvas" do resto do jogo). 'evolution'
   *   ainda solta partículas douradas, sugerindo eras passando aceleradas.
   * - 'mutation': uma massa instável se multiplica sem controle.
   */
  renderEndingCinematic(ctx){
    const b = this.bounds, cx = b.w / 2, cy = b.h / 2;
    const t = Math.min(1, this.endingT / this.endingDuration);

    if(this.endingKind === 'rebirth' || this.endingKind === 'evolution'){
      const splitT = Math.min(1, t / 0.4);
      const stage = splitT < 0.3 ? 0 : splitT < 0.6 ? 1 : splitT < 0.85 ? 2 : 3; // 1,2,4,8 células
      const count = Math.pow(2, stage);
      const zoomOutT = Math.max(0, (t - 0.4) / 0.6);
      const eased = 1 - Math.pow(1 - zoomOutT, 3);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1 - eased * 0.72, 1 - eased * 0.72);
      ctx.translate(-cx, -cy);

      const spread = 10 + stage * 9;
      for(let i = 0; i < count; i++){
        const ang = (Math.PI * 2 * i) / count + this.time * 0.15;
        const dist = count === 1 ? 0 : spread;
        const x = cx + Math.cos(ang) * dist;
        const y = cy + Math.sin(ang) * dist;
        ctx.save();
        ctx.shadowColor = '#8fd9ff';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#8fd9ff';
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      if(eased > 0){
        // silhueta humana bem simples, no mesmo estilo geométrico do resto do jogo
        const headR = 40, torsoW = 110, torsoH = 200;
        ctx.save();
        ctx.globalAlpha = eased;
        ctx.strokeStyle = 'rgba(238,242,246,0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy - torsoH / 2 - headR, headR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - torsoW / 2, cy - torsoH / 2);
        ctx.quadraticCurveTo(cx - torsoW / 2 - 20, cy + torsoH / 4, cx - torsoW / 3, cy + torsoH / 2);
        ctx.lineTo(cx + torsoW / 3, cy + torsoH / 2);
        ctx.quadraticCurveTo(cx + torsoW / 2 + 20, cy + torsoH / 4, cx + torsoW / 2, cy - torsoH / 2);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        if(this.endingKind === 'evolution' && Math.random() < 0.4){
          this.spawnParticles(
            cx + (Math.random() - 0.5) * torsoW,
            cy + (Math.random() - 0.5) * torsoH,
            '#ffd166', 2, { life: 0.6, speed: 40, glow: true }
          );
        }
      }
    } else if(this.endingKind === 'mutation'){
      const blobs = 2 + Math.floor(t * 6);
      for(let i = 0; i < blobs; i++){
        const ang = (Math.PI * 2 * i) / blobs + this.time * (0.5 + i * 0.1);
        const dist = 30 + (i % 3) * 22 + Math.sin(this.time * 3 + i) * 6;
        const x = cx + Math.cos(ang) * dist;
        const y = cy + Math.sin(ang) * dist;
        ctx.save();
        ctx.shadowColor = '#b23347';
        ctx.shadowBlur = 14;
        ctx.fillStyle = i % 2 === 0 ? '#b23347' : '#7c1f8a';
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(x, y, 10 + Math.sin(this.time * 4 + i) * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if(Math.random() < 0.15) this.triggerShake(3, 0.15);
    }
  }

  renderBossBar(ctx){
    const boss = this.phase.devouradores && this.phase.devouradores.find(d => d.type === 'boss');
    if(!boss) return;
    const b = this.bounds;
    const w = 340, h = 14, x = b.w / 2 - w / 2, y = 16;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
    const pct = Math.max(0, boss.hp / boss.maxHp);
    ctx.fillStyle = '#ff4d5e';
    ctx.fillRect(x, y, w * pct, h);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(boss.bossName || 'NÚCLEO DEVORADOR', b.w / 2, y - 7);
    ctx.restore();
  }
}
