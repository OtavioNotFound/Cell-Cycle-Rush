/**
 * PhaseBase
 * Contém tudo que é comum às 5 fases: Devoradores, combate (ataque do
 * jogador + projéteis inimigos), colisões, drenagem de energia e
 * renderização. Cada fase concreta define seu próprio objetivo e mecânica.
 */
class PhaseBase {
  constructor(game){
    this.game = game;
    this.devouradores = [];
    this.projectiles = [];
    this.items = [];
    this.zones = [];
    this.message = '';
    this.messageTimer = 0;
    this.completed = false;
    this.phaseTimeLeft = null; // fases com cronômetro próprio definem isso
    this.phaseTimeMax = null;
  }

  get index(){ return 0; }
  get name(){ return ''; }
  get objective(){ return ''; }
  get progress(){ return 0; }

  // ---------------- Devoradores ----------------

  spawnEnemyWave(types, speedMult = 1){
    const b = this.game.bounds;
    const player = this.game.player;
    types.forEach(type => {
      let x, y, tries = 0;
      do {
        x = b.margin + Math.random() * (b.w - b.margin * 2);
        y = b.margin + Math.random() * (b.h - b.margin * 2);
        tries++;
      } while(Math.hypot(x - player.x, y - player.y) < 170 && tries < 20);

      const dev = new Devorador(x, y, type);
      dev.baseSpeed *= speedMult;
      dev.speed = dev.baseSpeed;
      this.devouradores.push(dev);
    });
  }

  spawnScattered(count, factory){
    const b = this.game.bounds;
    for(let i = 0; i < count; i++){
      const x = b.margin + Math.random() * (b.w - b.margin * 2);
      const y = b.margin + Math.random() * (b.h - b.margin * 2);
      this.items.push(factory(x, y, i));
    }
  }

  updateDevouradores(dt){
    const b = this.game.bounds;
    this.devouradores.forEach(d => {
      d.update(dt, this.game.player, b, dev => this.spawnProjectileFrom(dev));
      d.x = Math.max(d.r, Math.min(b.w - d.r, d.x));
      d.y = Math.max(d.r, Math.min(b.h - d.r, d.y));
    });
  }

  spawnProjectileFrom(dev){
    const player = this.game.player;
    const proj = new Projectile(dev.x, dev.y, player.x, player.y, {
      damage: dev.type === 'boss' ? 14 : 9,
      color: dev.type === 'boss' ? '#ffb057' : '#ff6b81',
      speed: dev.type === 'boss' ? 250 : 200,
      r: dev.type === 'boss' ? 6 : 4.5
    });
    this.projectiles.push(proj);
    this.game.audio.shoot();
  }

  updateProjectiles(dt){
    const p = this.game.player;
    const now = performance.now();
    this.projectiles.forEach(proj => proj.update(dt));
    this.projectiles = this.projectiles.filter(proj => {
      if(proj.dead) return false;
      const dist = Math.hypot(p.x - proj.x, p.y - proj.y);
      if(dist < p.r + proj.r){
        if(p.takeDamage(proj.damage, now)){
          this.game.audio.hit();
          this.game.flashDamage();
          this.game.spawnParticles(proj.x, proj.y, proj.color, 8, { life: 0.3, speed: 90 });
          if(p.health <= 0) this.game.onDefeat();
        }
        return false;
      }
      const b = this.game.bounds;
      if(proj.x < -20 || proj.x > b.w + 20 || proj.y < -20 || proj.y > b.h + 20) return false;
      return true;
    });
  }

  // ---------------- Combate do jogador ----------------

  performAttack(px, py, range, damage){
    let hitSomething = false;
    for(const d of this.devouradores){
      const dist = Math.hypot(px - d.x, py - d.y);
      if(dist <= range + d.r){
        hitSomething = true;
        const died = d.takeDamage(damage);
        d.applyKnockback(px, py, 190); // impacto: o inimigo é empurrado para trás
        this.game.spawnParticles(d.x, d.y, '#ffffff', 7, { life: 0.25, speed: 110, r: 2 });
        if(died){
          this.onDevouradorDefeated(d);
        } else {
          this.game.audio.impact();
        }
      }
    }
    this.devouradores = this.devouradores.filter(d => {
      if(d.isDead){
        const color = d.type === 'boss' ? '#ffb057' : (d.type === 'tank' ? '#b23347' : (d.type === 'hunter' ? '#ff3b4e' : '#e6465e'));
        this.game.spawnExplosion(d.x, d.y, color);
        return false;
      }
      return true;
    });
    if(hitSomething){
      this.game.triggerHitStop(65);   // breve congelamento dá peso ao golpe
      this.game.triggerShake(5, 0.14);
    } else {
      this.game.audio.attackMiss();
    }
  }

  onDevouradorDefeated(d){
    this.game.audio.success();
    this.rewardEnergy(d.type === 'boss' ? 0 : 6);
    this.showMessage(d.type === 'boss' ? 'O Devorador foi contido!' : 'Devorador eliminado!');
  }

  // ---------------- Colisões / itens ----------------

  handleCollisions(){
    const p = this.game.player;
    const now = performance.now();
    for(const d of this.devouradores){
      const dist = Math.hypot(p.x - d.x, p.y - d.y);
      if(dist < p.r + d.r){
        if(p.takeDamage(d.contactDamage, now)){
          this.game.audio.hit();
          this.game.flashDamage();
          this.game.triggerShake(4, 0.15);
          this.game.spawnParticles(p.x, p.y, '#ff4d5e', 10, { life: 0.35, speed: 100 });
          const ang = Math.atan2(p.y - d.y, p.x - d.x);
          p.x += Math.cos(ang) * 24;
          p.y += Math.sin(ang) * 24;
          if(p.carrying){
            p.carrying.state = 'idle';
            p.carrying.x = p.x;
            p.carrying.y = p.y + 22;
            p.carrying = null;
            this.showMessage('Item derrubado!');
          }
          if(p.health <= 0){
            this.game.onDefeat();
          }
        }
      }
    }
  }

  tryPickup(){
    const p = this.game.player;
    if(p.carrying) return;
    for(const it of this.items){
      if(it.state === 'idle' && Math.hypot(p.x - it.x, p.y - it.y) < p.r + it.r){
        it.state = 'carried';
        p.carrying = it;
        this.game.audio.collect();
        this.game.spawnParticles(it.x, it.y, it.color, 6, { life: 0.3, speed: 70 });
        return;
      }
    }
  }

  showMessage(text){
    this.message = text;
    this.messageTimer = 1.6;
  }

  updateMessage(dt){
    if(this.messageTimer > 0){
      this.messageTimer -= dt;
      if(this.messageTimer <= 0) this.message = '';
    }
  }

  updatePhaseTimer(dt){
    if(this.phaseTimeLeft == null) return;
    this.phaseTimeLeft = Math.max(0, this.phaseTimeLeft - dt);
    if(this.phaseTimeLeft <= 0) this.onPhaseTimeout();
  }

  onPhaseTimeout(){ /* sobrescrito pelas fases que precisam */ }

  clampPlayer(){
    const p = this.game.player, b = this.game.bounds;
    p.x = Math.max(p.r, Math.min(b.w - p.r, p.x));
    p.y = Math.max(p.r, Math.min(b.h - p.r, p.y));
  }

  drainEnergy(dt){
    const p = this.game.player;
    p.energy = Math.max(0, p.energy - 2.2 * dt);
    p.speed = p.energy <= 0 ? p.baseSpeed * 0.6 : p.baseSpeed;
  }

  rewardEnergy(amount){
    const p = this.game.player;
    p.energy = Math.min(p.maxEnergy, p.energy + amount);
  }

  // ---------------- Renderização ----------------

  render(ctx){
    this.renderZones(ctx);
    this.renderItems(ctx);
    this.renderDevouradores(ctx);
    this.renderProjectiles(ctx);
    this.renderPlayer(ctx);
    this.renderMessage(ctx);
    this.renderPhaseTimer(ctx);
  }

  renderZones(ctx){
    this.zones.forEach(z => {
      ctx.save();
      ctx.globalAlpha = 0.3 + 0.12 * Math.sin(performance.now() / 400);
      ctx.strokeStyle = z.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if(z.shape === 'rect'){
        ctx.strokeRect(z.x - z.w / 2, z.y - z.h / 2, z.w, z.h);
      } else {
        ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      ctx.fillStyle = '#8ea3c2';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      const labelY = z.shape === 'rect' ? z.y - z.h / 2 - 8 : z.y - z.r - 10;
      const info = z.shield != null ? `${z.label}` : `${z.label} (${z.filled}/${z.capacity})`;
      ctx.fillText(info, z.x, Math.max(14, labelY));

      if(z.shield != null){
        const barW = z.r * 1.7, barH = 7;
        const bx = z.x - barW / 2, by = z.y + z.r + 10;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx - 2, by - 2, barW + 4, barH + 4);
        const pct = Math.max(0, z.shield / z.maxShield);
        ctx.fillStyle = pct > 0.35 ? '#4ade80' : '#ff4d5e';
        ctx.fillRect(bx, by, barW * pct, barH);
      }
    });
  }

  renderItems(ctx){
    const p = this.game.player;
    this.items.forEach(it => {
      if(it.state === 'delivered') return;
      let x = it.x, y = it.y;
      if(it.state === 'carried'){
        x = p.x;
        y = p.y - 26;
      }
      ctx.save();
      ctx.shadowColor = it.color;
      ctx.shadowBlur = it.state === 'carried' ? 10 : 4;
      ctx.fillStyle = it.color;
      ctx.beginPath();
      ctx.arc(x, y, it.r, 0, Math.PI * 2);
      ctx.fill();
      if(it.state === 'carried'){
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  renderDevouradores(ctx){
    this.devouradores.forEach(d => {
      ctx.save();
      ctx.translate(d.x, d.y);

      const baseColor = d.type === 'hunter' ? '#ff3b4e'
        : d.type === 'tank' ? '#b23347'
        : d.type === 'shooter' ? '#c23bd6'
        : d.type === 'boss' ? '#ffb057'
        : '#e6465e';
      ctx.fillStyle = d.hitFlash > 0 ? `rgba(255,255,255,${0.5 + d.hitFlash * 0.5})` : baseColor;

      if(d.type === 'shooter'){
        // losango pulsante
        const rr = d.r + Math.sin(d.wobble) * 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -rr); ctx.lineTo(rr, 0); ctx.lineTo(0, rr); ctx.lineTo(-rr, 0);
        ctx.closePath();
        ctx.fill();
      } else {
        const spikes = d.type === 'boss' ? 14 : (d.type === 'tank' ? 10 : 8);
        ctx.beginPath();
        for(let i = 0; i < spikes; i++){
          const ang = (i / spikes) * Math.PI * 2;
          const rr = d.r + Math.sin(d.wobble + i) * (d.type === 'tank' ? 1.2 : 2.4);
          const x = Math.cos(ang) * rr, y = Math.sin(ang) * rr;
          if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      }

      if(d.type === 'tank'){
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if(d.type === 'boss'){
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();
        // pequena barra de vida individual acima do chefe é tratada pelo Game (renderBossBar)
      }

      // inimigo resistente: mostra vida acima dele para sinalizar que aguenta mais golpes
      if(d.type === 'tank'){
        const w = 30, h = 4, by = -d.r - 11;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(-w / 2 - 1, by - 1, w + 2, h + 2);
        const pct = Math.max(0, d.hp / d.maxHp);
        ctx.fillStyle = pct > 0.35 ? '#4ade80' : '#ff4d5e';
        ctx.fillRect(-w / 2, by, w * pct, h);
      }
      ctx.restore();
    });
  }

  renderProjectiles(ctx){
    this.projectiles.forEach(pr => {
      ctx.save();
      ctx.shadowColor = pr.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = pr.color;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  renderPlayer(ctx){
    const p = this.game.player;
    ctx.save();
    ctx.translate(p.x, p.y);

    // brilho pulsante da célula
    const glowR = p.r * (2.4 + Math.sin(performance.now() / 600) * 0.3);
    const glowColor = p.hurtFlash > 0 ? `rgba(255,77,94,${0.35 * p.hurtFlash})` : 'rgba(143,227,199,0.22)';
    const grad = ctx.createRadialGradient(0, 0, p.r * 0.4, 0, 0, glowR);
    grad.addColorStop(0, glowColor);
    grad.addColorStop(1, 'rgba(143,227,199,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();

    // anel do pulso de ataque
    if(p.attackFlash > 0){
      ctx.save();
      ctx.globalAlpha = p.attackFlash * 0.7;
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 78 * (1 - p.attackFlash) + p.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if(p.isInvulnerable && Math.floor(performance.now() / 100) % 2 === 0){
      ctx.globalAlpha = 0.4;
    }

    // compressão/expansão: a célula estica na direção do movimento e
    // se achata levemente no eixo perpendicular, como uma gota de gel.
    const speed = Math.hypot(p.vx, p.vy);
    const moveAngle = speed > 4 ? Math.atan2(p.vy, p.vx) : (p._lastAngle || 0);
    p._lastAngle = moveAngle;
    const stretchAmt = Math.min(0.16, speed / 900);
    ctx.rotate(moveAngle);
    ctx.scale(1 + stretchAmt, 1 - stretchAmt);
    ctx.rotate(-moveAngle);

    ctx.fillStyle = p.hurtFlash > 0 ? '#ffb3ba' : '#8fe3c7';
    ctx.beginPath();
    const points = 16;
    for(let i = 0; i < points; i++){
      const ang = (i / points) * Math.PI * 2;
      const rr = p.r + Math.sin(performance.now() / 500 + i * 1.3) * 1.6;
      const x = Math.cos(ang) * rr, y = Math.sin(ang) * rr;
      if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c9fff0';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#4c8cff';
    ctx.beginPath();
    ctx.arc(0, 0, p.r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  renderMessage(ctx){
    if(!this.message) return;
    // mensagem entra e sai suavemente (o messageTimer nasce em 1.6s)
    const t = this.messageTimer;
    let alpha = 1;
    if(t > 1.3) alpha = (1.6 - t) / 0.3;
    else if(t < 0.3) alpha = t / 0.3;
    alpha = Math.max(0, Math.min(1, alpha));
    const rise = (1 - alpha) * 6;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.fillText(this.message, this.game.bounds.w / 2, 40 - rise);
    ctx.restore();
  }

  renderPhaseTimer(ctx){
    if(this.phaseTimeLeft == null) return;
    const b = this.game.bounds;
    const urgent = this.phaseTimeLeft < 10;
    ctx.save();
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = urgent ? '#ff4d5e' : '#ffd166';
    if(urgent && Math.floor(performance.now() / 250) % 2 === 0) ctx.globalAlpha = 0.5;
    const m = Math.floor(this.phaseTimeLeft / 60);
    const s = Math.floor(this.phaseTimeLeft % 60).toString().padStart(2, '0');
    ctx.fillText(`⏱ ${m}:${s}`, b.w - b.margin, 26);
    ctx.restore();
  }
}

/* ==================== FASE 1: INTERFASE ==================== */
class InterfasePhase extends PhaseBase {
  get index(){ return 0; }
  get name(){ return 'Interfase'; }
  get objective(){ return 'Colete ATP, DNA e Nutrientes enquanto foge dos Devoradores.'; }

  constructor(game){
    super(game);
    this.need = { ATP: 3, DNA: 3, Nutrientes: 3 };
    this.got = { ATP: 0, DNA: 0, Nutrientes: 0 };
    this.spawnEnemyWave(['chaser', 'hunter']);

    const defs = [
      { type: 'ATP', color: '#4c8cff', r: 8 },
      { type: 'DNA', color: '#4ade80', r: 8 },
      { type: 'Nutrientes', color: '#ffd166', r: 7 }
    ];
    defs.forEach(def => {
      this.spawnScattered(3, (x, y) => new Item(x, y, { type: def.type, color: def.color, r: def.r }));
    });
  }

  update(dt){
    this.updateDevouradores(dt);
    this.updateProjectiles(dt);
    this.handleCollisions();
    this.drainEnergy(dt);
    this.updateMessage(dt);

    const p = this.game.player;
    for(const it of this.items){
      if(it.state !== 'idle') continue;
      if(Math.hypot(p.x - it.x, p.y - it.y) < p.r + it.r){
        it.state = 'delivered';
        this.got[it.type]++;
        this.rewardEnergy(6);
        this.game.audio.collect();
        this.game.spawnParticles(it.x, it.y, it.color, 8, { life: 0.35, speed: 90 });
      }
    }

    this.clampPlayer();
    if(this.got.ATP >= this.need.ATP && this.got.DNA >= this.need.DNA && this.got.Nutrientes >= this.need.Nutrientes){
      this.completed = true;
    }
  }

  get progress(){
    const total = this.need.ATP + this.need.DNA + this.need.Nutrientes;
    const cur = this.got.ATP + this.got.DNA + this.got.Nutrientes;
    return cur / total;
  }
}

/* ==================== FASE 2: PRÓFASE ==================== */
class ProfasePhase extends PhaseBase {
  get index(){ return 1; }
  get name(){ return 'Prófase'; }
  get objective(){ return 'Leve cada cromossomo condensado até o centro da célula.'; }

  constructor(game){
    super(game);
    this.total = 4;
    this.spawnEnemyWave(['chaser', 'chaser', 'hunter', 'shooter']);
    this.spawnScattered(this.total, (x, y) => new Item(x, y, { type: 'chromosome', color: '#9b7bff', r: 9 }));

    const b = this.game.bounds;
    this.zones.push(new Zone(b.w / 2, b.h / 2, 60, {
      label: 'Condensação', color: '#9b7bff', capacity: this.total, shape: 'circle'
    }));
  }

  update(dt){
    this.updateDevouradores(dt);
    this.updateProjectiles(dt);
    this.handleCollisions();
    this.drainEnergy(dt);
    this.updateMessage(dt);
    this.protectChromosomes();

    const p = this.game.player;
    this.tryPickup();
    if(p.carrying){
      const z = this.zones[0];
      if(Math.hypot(p.x - z.x, p.y - z.y) < z.r){
        p.carrying.state = 'delivered';
        z.filled++;
        this.rewardEnergy(8);
        this.game.audio.success();
        this.game.spawnParticles(z.x, z.y, z.color, 10, { life: 0.4, speed: 90 });
        p.carrying = null;
      }
    }

    this.clampPlayer();
    if(this.zones[0].filled >= this.total) this.completed = true;
  }

  // Ritmo próprio da Prófase: cromossomos ainda soltos são um alvo dos Devoradores.
  // Se um deles chegar perto, o cromossomo é espalhado — o jogador precisa
  // proteger, não só coletar. Isso a diferencia da Interfase.
  protectChromosomes(){
    const now = performance.now();
    const b = this.game.bounds;
    for(const it of this.items){
      if(it.state !== 'idle') continue;
      for(const d of this.devouradores){
        if(Math.hypot(it.x - d.x, it.y - d.y) < d.r + it.r + 4){
          if(!it.threatCooldown || now > it.threatCooldown){
            it.threatCooldown = now + 900;
            const ang = Math.atan2(it.y - d.y, it.x - d.x);
            it.x = Math.max(b.margin, Math.min(b.w - b.margin, it.x + Math.cos(ang) * 70));
            it.y = Math.max(b.margin, Math.min(b.h - b.margin, it.y + Math.sin(ang) * 70));
            this.game.spawnParticles(it.x, it.y, it.color, 5, { life: 0.3, speed: 60 });
            this.showMessage('Um Devorador quase destruiu um cromossomo!');
          }
          break;
        }
      }
    }
  }

  get progress(){ return this.zones[0].filled / this.total; }
}

/* ==================== FASE 3: METÁFASE ==================== */
class MetafasePhase extends PhaseBase {
  get index(){ return 2; }
  get name(){ return 'Metáfase'; }
  get objective(){ return 'Leve cada cromossomo até a FAIXA correta da placa equatorial.'; }

  constructor(game){
    super(game);
    this.total = 5;
    this.spawnEnemyWave(['chaser', 'hunter', 'hunter', 'shooter', 'tank']);

    const b = this.game.bounds;
    this.plateW = 46;
    this.plateH = b.h - b.margin * 2;
    this.zones.push(new Zone(b.w / 2, b.h / 2, 0, {
      label: 'Placa Metafásica', color: '#9b7bff', capacity: this.total,
      shape: 'rect', w: this.plateW, h: this.plateH
    }));

    // cada cromossomo tem uma faixa (slot) correta na placa
    const slots = [...Array(this.total).keys()];
    this.spawnScattered(this.total, (x, y, i) => new Item(x, y, {
      type: 'chromosome', color: '#9b7bff', r: 9, slot: slots[i]
    }));
  }

  bandBounds(slot){
    const z = this.zones[0];
    const bandH = this.plateH / this.total;
    const top = z.y - this.plateH / 2 + slot * bandH;
    return { top, bottom: top + bandH, mid: top + bandH / 2 };
  }

  update(dt){
    this.updateDevouradores(dt);
    this.updateProjectiles(dt);
    this.handleCollisions();
    this.drainEnergy(dt);
    this.updateMessage(dt);

    const p = this.game.player;
    this.tryPickup();
    if(p.carrying){
      const z = this.zones[0];
      const insidePlateX = Math.abs(p.x - z.x) < z.w / 2;
      const insidePlateY = Math.abs(p.y - z.y) < this.plateH / 2;
      if(insidePlateX && insidePlateY){
        const bandH = this.plateH / this.total;
        const relY = p.y - (z.y - this.plateH / 2);
        const targetSlot = Math.max(0, Math.min(this.total - 1, Math.floor(relY / bandH)));
        if(targetSlot === p.carrying.slot){
          p.carrying.state = 'delivered';
          z.filled++;
          this.rewardEnergy(8);
          this.game.audio.success();
          this.game.spawnParticles(p.x, p.y, z.color, 10, { life: 0.4, speed: 90 });
          p.carrying = null;
        } else {
          this.showMessage('Faixa errada! Encontre a posição certa.');
          this.game.audio.fail();
          p.carrying.state = 'idle';
          p.carrying.x = p.x - 30;
          p.carrying.y = p.y;
          p.carrying = null;
        }
      }
    }

    this.clampPlayer();
    if(this.zones[0].filled >= this.total) this.completed = true;
  }

  render(ctx){
    super.render(ctx);
    // marca as faixas da placa para orientar o jogador
    const z = this.zones[0];
    ctx.save();
    ctx.strokeStyle = 'rgba(155,123,255,0.25)';
    ctx.lineWidth = 1;
    for(let i = 1; i < this.total; i++){
      const y = z.y - this.plateH / 2 + i * (this.plateH / this.total);
      ctx.beginPath();
      ctx.moveTo(z.x - z.w / 2, y);
      ctx.lineTo(z.x + z.w / 2, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  get progress(){ return this.zones[0].filled / this.total; }
}

/* ==================== FASE 4: ANÁFASE ==================== */
class AnafasePhase extends PhaseBase {
  get index(){ return 3; }
  get name(){ return 'Anáfase'; }
  get objective(){ return 'Separe as cromátides-irmãs para polos opostos antes do tempo acabar.'; }

  constructor(game){
    super(game);
    this.pairs = 4;
    this.completedPairs = 0;
    this.pairDeliveries = {};
    this.spawnEnemyWave(['chaser', 'hunter', 'shooter', 'tank', 'hunter']);
    this.phaseTimeLeft = 48;
    this.phaseTimeMax = 48;

    const b = this.game.bounds;
    this.zones.push(new Zone(70, b.h / 2, 55, {
      label: 'Polo Esquerdo', color: '#4ade80', capacity: this.pairs, shape: 'circle', side: 'left'
    }));
    this.zones.push(new Zone(b.w - 70, b.h / 2, 55, {
      label: 'Polo Direito', color: '#4c8cff', capacity: this.pairs, shape: 'circle', side: 'right'
    }));

    for(let i = 0; i < this.pairs; i++){
      this.pairDeliveries[i] = [];
      const cx = b.w / 2 + (Math.random() * 40 - 20);
      const cy = b.margin + 40 + i * ((b.h - b.margin * 2 - 40) / this.pairs);
      this.items.push(new Item(cx - 8, cy, { type: 'chromatid', pairId: i, r: 8, color: '#c9a5ff' }));
      this.items.push(new Item(cx + 8, cy, { type: 'chromatid', pairId: i, r: 8, color: '#8a5bd6' }));
    }
  }

  onPhaseTimeout(){
    if(this.completed) return;
    const p = this.game.player;
    this.showMessage('Tempo esgotado! A célula sofreu dano.');
    this.game.audio.fail();
    this.game.flashDamage();
    this.game.triggerShake(6, 0.3);
    p.takeDamage(16, performance.now());
    if(p.health <= 0){ this.game.onDefeat(); return; }
    this.phaseTimeLeft = this.phaseTimeMax;
  }

  update(dt){
    this.updateDevouradores(dt);
    this.updateProjectiles(dt);
    this.handleCollisions();
    this.drainEnergy(dt);
    this.updateMessage(dt);
    if(!this.completed) this.updatePhaseTimer(dt);

    const p = this.game.player;
    this.tryPickup();

    if(p.carrying){
      for(const z of this.zones){
        if(Math.hypot(p.x - z.x, p.y - z.y) < z.r){
          const it = p.carrying;
          this.pairDeliveries[it.pairId].push(z.side);
          it.state = 'delivered';
          z.filled++;
          p.carrying = null;

          const deliveries = this.pairDeliveries[it.pairId];
          if(deliveries.length === 2){
            if(deliveries[0] === deliveries[1]){
              this.showMessage('Erro de separação! Cromátides no mesmo polo.');
              p.takeDamage(12, performance.now());
              this.game.audio.fail();
              this.game.flashDamage();
              if(p.health <= 0) this.game.onDefeat();
            } else {
              this.completedPairs++;
              this.rewardEnergy(10);
              this.game.audio.success();
              this.game.spawnParticles(z.x, z.y, z.color, 10, { life: 0.4, speed: 90 });
            }
          } else {
            this.game.audio.success();
          }
          break;
        }
      }
    }

    this.clampPlayer();
    if(this.completedPairs >= this.pairs){
      this.completed = true;
      this.phaseTimeLeft = null;
    }
  }

  get progress(){ return this.completedPairs / this.pairs; }
}

/* ==================== FASE 5: TELÓFASE ==================== */
class TelofasePhase extends PhaseBase {
  get index(){ return 4; }
  get name(){ return 'Telófase'; }
  get objective(){ return 'Proteja os dois novos núcleos até a divisão se completar.'; }

  constructor(game){
    super(game);
    this.defenseDuration = 30;
    this.phaseTimeLeft = this.defenseDuration;
    this.phaseTimeMax = this.defenseDuration;
    this.spawnTimer = 6;
    this.nucleusShieldMax = 100;
    this.drainRate = 9; // dano/seg quando um Devorador fica perto do núcleo

    const b = this.game.bounds;
    this.zones.push(new Zone(90, b.h / 2, 55, {
      label: 'Núcleo Esquerdo', color: '#4ade80', shape: 'circle', shield: this.nucleusShieldMax
    }));
    this.zones.push(new Zone(b.w - 90, b.h / 2, 55, {
      label: 'Núcleo Direito', color: '#4c8cff', shape: 'circle', shield: this.nucleusShieldMax
    }));

    this.spawnEnemyWave(['chaser', 'hunter', 'shooter']);
    this.spawnEnemyWave(['boss'], 1);
  }

  onPhaseTimeout(){
    if(this.zones.every(z => z.shield > 0)){
      this.completed = true;
    }
  }

  update(dt){
    this.updateDevouradores(dt);
    this.updateProjectiles(dt);
    this.handleCollisions();
    this.drainEnergy(dt);
    this.updateMessage(dt);

    // Devoradores próximos de um núcleo drenam o escudo dele
    for(const d of this.devouradores){
      for(const z of this.zones){
        const dist = Math.hypot(d.x - z.x, d.y - z.y);
        if(dist < z.r + d.r){
          z.shield = Math.max(0, z.shield - this.drainRate * dt);
          if(z.shield <= 0 && !this.failed){
            this.failed = true;
            this.showMessage('Um núcleo foi consumido!');
            this.game.audio.fail();
            this.game.triggerShake(10, 0.5);
            this.game.onDefeat();
          }
        }
      }
    }

    // ondas periódicas de reforço para manter a pressão
    this.spawnTimer -= dt;
    if(this.spawnTimer <= 0 && this.devouradores.length < 8){
      this.spawnTimer = 6.5;
      this.spawnEnemyWave([Math.random() < 0.5 ? 'chaser' : 'hunter'], 1.1);
    }

    if(!this.completed && !this.failed) this.updatePhaseTimer(dt);

    this.clampPlayer();
  }

  get progress(){
    if(this.phaseTimeMax == null) return 1;
    return 1 - (this.phaseTimeLeft / this.phaseTimeMax);
  }
}
