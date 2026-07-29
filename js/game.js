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

    this.dom = {
      titleScreen: document.getElementById('titleScreen'),
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
      devouradoresCount: document.getElementById('devouradoresCount')
    };

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
        else if(this.state === 'playing' && k === ' '){ e.preventDefault(); this.triggerAttack(); }
      }
      if(k === 'f' && this.state === 'playing'){ this.triggerAttack(); }
    });
    window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });

    this.dom.titleScreen.addEventListener('click', () => { if(this.state === 'title') this.startIntro(); });
    this.dom.dialogueBox.addEventListener('click', () => { if(this.state === 'dialogue') this.dialogue.advance(); });
    this.dom.retryBtn.addEventListener('click', () => this.reset());
    this.dom.playAgainBtn.addEventListener('click', () => this.reset());

    this.canvas.addEventListener('click', () => { if(this.state === 'playing') this.triggerAttack(); });
  }

  triggerAttack(){
    const p = this.player;
    if(!p || !p.canAttack) return;
    p.attackCooldownUntil = performance.now() + 420;
    p.attackFlash = 1;
    const cost = Math.min(p.energy, 12);
    p.energy = Math.max(0, p.energy - 12);
    const damage = cost >= 12 ? 30 : 16; // ataque mais fraco sem energia suficiente
    this.audio.attack();
    if(this.phase && this.phase.performAttack){
      this.phase.performAttack(p.x, p.y, 78, damage);
    }
    this.triggerShake(3, 0.12);
  }

  // ---------------------------------------------------------------------
  // Fluxo de estados
  // ---------------------------------------------------------------------
  startIntro(){
    this.dom.titleScreen.classList.add('hidden');
    this.state = 'dialogue';
    this.dialogue.start(INTRO_LINES.concat(PHASE_INTRO_LINES[0]), () => this.beginGame());
  }

  beginGame(){
    this.player = new Player(this.bounds.w / 2, this.bounds.h / 2);
    this.elapsed = 0;
    this.ending = false;
    this.particles = [];
    this.startPhase(0);
    this.state = 'playing';
  }

  startPhase(i){
    this.phaseIndex = i;
    const PhaseClass = this.phaseClasses[i];
    this.phase = new PhaseClass(this);
    this.player.carrying = null;
    this.particles = [];
    this.dom.phaseLabel.textContent = `Fase ${i + 1}/5 — ${this.phase.name}`;
    this.dom.objectiveText.textContent = this.phase.objective;
  }

  onPhaseComplete(){
    this.audio.phaseComplete();
    const i = this.phaseIndex;
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
  }

  onVictory(){
    if(this.ending) return;
    this.ending = true;
    this.state = 'dialogue';
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
    let dx = 0, dy = 0;
    if(this.keys['w'] || this.keys['arrowup']) dy -= 1;
    if(this.keys['s'] || this.keys['arrowdown']) dy += 1;
    if(this.keys['a'] || this.keys['arrowleft']) dx -= 1;
    if(this.keys['d'] || this.keys['arrowright']) dx += 1;
    if(dx === 0 && dy === 0) return;
    const len = Math.hypot(dx, dy) || 1;
    p.x += (dx / len) * p.speed * dt;
    p.y += (dy / len) * p.speed * dt;
  }

  // ---------------------------------------------------------------------
  // Loop principal
  // ---------------------------------------------------------------------
  loop(ts){
    if(!this.lastTime) this.lastTime = ts;
    const dt = Math.min(0.05, (ts - this.lastTime) / 1000);
    this.lastTime = ts;
    this.time += dt;

    if(this.state === 'playing'){
      this.elapsed += dt;
      this.handleMovement(dt);
      this.phase.update(dt);
      if(this.phase.completed) this.onPhaseComplete();
      this.updateHUD();
    }

    if(this.player){
      if(this.player.attackFlash > 0) this.player.attackFlash = Math.max(0, this.player.attackFlash - dt * 3.2);
      if(this.player.hurtFlash > 0) this.player.hurtFlash = Math.max(0, this.player.hurtFlash - dt * 2.4);
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
    if(this.dom.devouradoresCount){
      const alive = this.phase.devouradores ? this.phase.devouradores.length : 0;
      this.dom.devouradoresCount.textContent = alive;
    }
    this.dom.healthFill.parentElement.classList.toggle('bar-low', p.health / p.maxHealth < 0.3);
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
    ctx.translate(this.shakeX, this.shakeY);

    this.renderBackground(ctx);

    if(this.phase && (this.state === 'playing' || this.state === 'dialogue')){
      this.phase.render(ctx);
      this.renderBossBar(ctx);
    }

    this.renderParticles(ctx);

    if(this.damageFlash > 0){
      ctx.fillStyle = `rgba(255,60,80,${0.25 * this.damageFlash})`;
      ctx.fillRect(0, 0, b.w, b.h);
    }

    ctx.restore();
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
