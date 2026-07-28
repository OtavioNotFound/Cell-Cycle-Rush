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

    this.phaseClasses = [InterfasePhase, ProfasePhase, MetafasePhase, AnafasePhase, TelofasePhase];
    this.player = null;
    this.phase = null;
    this.phaseIndex = 0;

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
        if(this.state === 'title'){ this.startIntro(); }
        else if(this.state === 'dialogue'){ this.dialogue.advance(); }
        else if(this.state === 'unlock'){ e.preventDefault(); this.dismissUnlock(); }
        else if(this.state === 'playing' && k === ' '){ e.preventDefault(); this.triggerAttack(); }
      }
      if(k === 'f' && this.state === 'playing'){ this.triggerAttack(); }
      if(k === 'shift' && this.state === 'playing'){ this.triggerDash(); }
      if(k === 'e' && this.state === 'playing'){ this.triggerShot(); }
      if(k === 'r' && this.state === 'playing'){ this.triggerPulse(); }
      if(k === 'q' && this.state === 'playing'){ this.triggerOverload(); }
    });
    window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });

    this.dom.newGameBtn.addEventListener('click', e => { e.stopPropagation(); this.startIntro(false); });
    this.dom.ngPlusBtn.addEventListener('click', e => { e.stopPropagation(); this.startIntro(true); });
    this.dom.dialogueBox.addEventListener('click', () => { if(this.state === 'dialogue') this.dialogue.advance(); });
    this.dom.unlockScreen.addEventListener('click', () => { if(this.state === 'unlock') this.dismissUnlock(); });
    this.dom.retryBtn.addEventListener('click', () => this.reset());
    this.dom.playAgainBtn.addEventListener('click', () => this.backToTitle());

    this.canvas.addEventListener('click', () => { if(this.state === 'playing') this.triggerAttack(); });
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
    const p = this.player;
    if(!p) return;
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
    this.dom.titleScreen.classList.add('hidden');
    this.state = 'dialogue';
    this.dialogue.start(INTRO_LINES.concat(PHASE_INTRO_LINES[0]), () => this.beginGame());
  }

  beginGame(){
    this.player = new Player(this.bounds.w / 2, this.bounds.h / 2);
    if(this.newGamePlus){
      // NG+: a célula já "lembra" a adaptação final de uma divisão anterior
      this.player.abilities.overload = true;
    }
    this.elapsed = 0;
    this.ending = false;
    this.particles = [];
    this.startPhase(0);
    this.state = 'playing';
  }

  /** Mostra/esconde o botão de NG+ conforme o jogador já tenha vencido antes (localStorage). */
  refreshNgPlusAvailability(){
    let beaten = false;
    try{ beaten = localStorage.getItem('ccrBeaten') === '1'; }catch(e){ /* localStorage indisponível */ }
    if(this.dom.ngPlusBtn) this.dom.ngPlusBtn.classList.toggle('hidden', !beaten);
  }

  /** Volta à tela de título (usado após a vitória, para permitir escolher NG+). */
  backToTitle(){
    this.dom.endScreen.classList.add('hidden');
    this.refreshNgPlusAvailability();
    this.dom.titleScreen.classList.remove('hidden');
    this.state = 'title';
  }

  startPhase(i){
    this.phaseIndex = i;
    const PhaseClass = this.phaseClasses[i];
    this.phase = new PhaseClass(this);
    this.player.carrying = null;
    this.particles = [];
    this.dom.phaseLabel.textContent = `Fase ${i + 1}/5 — ${this.phase.name}`;
    this.dom.objectiveText.textContent = this.phase.objective;
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
    const proceed = () => {
      if(i < this.phaseClasses.length - 1){
        this.state = 'dialogue';
        const lines = PHASE_OUTRO_LINES[i].concat(PHASE_INTRO_LINES[i + 1]);
        this.dialogue.start(lines, () => {
          this.startPhase(i + 1);
          this.state = 'playing';
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
      this.showUnlockScreen(unlock, proceed);
    } else {
      proceed();
    }
  }

  /** Mostra a tela "NOVA ADAPTAÇÃO" e pausa o jogo até o jogador confirmar. */
  showUnlockScreen(unlock, onDone){
    this.state = 'unlock';
    this.pendingUnlockDone = onDone;
    this.audio.unlock();
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
    try{ localStorage.setItem('ccrBeaten', '1'); }catch(e){ /* localStorage indisponível */ }
    const lines = PHASE_OUTRO_LINES[this.phaseIndex].concat(VICTORY_LINES);
    this.dialogue.start(lines, () => {
      this.state = 'victory';
      this.dom.endTitle.textContent = 'MITOSE CONCLUÍDA';
      this.dom.endMessage.innerHTML =
        'As células voltaram a se multiplicar.<br>' +
        'Os Devoradores desapareceram.<br>' +
        'O organismo sobreviverá.';
      this.dom.retryBtn.classList.add('hidden');
      this.dom.playAgainBtn.classList.remove('hidden');
      this.dom.endScreen.classList.remove('hidden');
    });
  }

  onDefeat(){
    if(this.ending) return;
    this.ending = true;
    this.state = 'dialogue';
    this.audio.fail();
    this.triggerShake(8, 0.4);
    this.dialogue.start(DEFEAT_LINES, () => {
      this.state = 'defeat';
      this.dom.endTitle.textContent = 'FALHA NA MITOSE';
      this.dom.endMessage.innerHTML =
        'A última célula foi consumida.<br>' +
        'O organismo entrou em colapso.';
      this.dom.playAgainBtn.classList.add('hidden');
      this.dom.retryBtn.classList.remove('hidden');
      this.dom.endScreen.classList.remove('hidden');
    });
  }

  reset(){
    this.dom.endScreen.classList.add('hidden');
    this.beginGame();
  }

  flashDamage(){ this.damageFlash = 1; }

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
    ctx.fillStyle = '#0b0f16';
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
    this.dom.objectiveText.textContent = this.phase.objective;
    if(this.dom.devouradoresCount){
      const alive = this.phase.devouradores ? this.phase.devouradores.length : 0;
      this.dom.devouradoresCount.textContent = alive;
    }
    this.dom.healthFill.parentElement.classList.toggle('bar-low', p.health / p.maxHealth < 0.3);
    this.updateAbilityHUD();
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

    this.renderParticles(ctx);

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
    ctx.fillText('NÚCLEO DEVORADOR', b.w / 2, y - 7);
    ctx.restore();
  }
}
