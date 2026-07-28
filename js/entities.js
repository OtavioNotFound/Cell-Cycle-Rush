/**
 * Player - a célula controlada pelo jogador.
 */
class Player {
  constructor(x, y){
    this.x = x;
    this.y = y;
    this.r = 14;
    this.baseSpeed = 150;
    this.speed = this.baseSpeed;
    this.health = 100;
    this.maxHealth = 100;
    this.energy = 100;
    this.maxEnergy = 100;
    this.invulnUntil = 0;
    this.carrying = null;
    this.attackCooldownUntil = 0;
    this.attackFlash = 0; // 0..1, usado para animar o pulso de ataque
    this.hurtFlash = 0;   // 0..1, usado para o contorno vermelho ao levar dano
    this.vx = 0; this.vy = 0; // velocidade atual (dá peso ao movimento)
  }

  get isInvulnerable(){
    return performance.now() < this.invulnUntil;
  }

  get canAttack(){
    return performance.now() >= this.attackCooldownUntil;
  }

  takeDamage(amount, now){
    if(now < this.invulnUntil) return false;
    this.health = Math.max(0, this.health - amount);
    this.invulnUntil = now + 800;
    this.hurtFlash = 1;
    return true;
  }
}

/**
 * Devorador - inimigo com comportamento próprio.
 * types:
 *  - 'chaser'  : perseguidor padrão, stats equilibrados
 *  - 'tank'    : lento porém resistente, muita vida, dano alto de contato
 *  - 'hunter'  : rápido, pouca vida (morre em 1 golpe), dano baixo
 *  - 'shooter' : mantém distância e dispara projéteis periódicos
 *  - 'boss'    : mini-chefe da Telófase, vida alta, dispara e persegue os núcleos
 */
class Devorador {
  constructor(x, y, type = 'chaser'){
    this.x = x;
    this.y = y;
    this.type = type;
    this.wobble = Math.random() * Math.PI * 2;
    this.patrolTarget = null;
    this.shootTimer = 1.6 + Math.random();
    this.telegraph = 0; // 0..1 — sobe pouco antes do disparo, usado como aviso visual
    this.hitFlash = 0;
    this.knockX = 0; this.knockY = 0; // impulso de recuo ao levar dano
    this.circleDir = Math.random() < 0.5 ? 1 : -1; // sentido em que este tipo "cerca" o jogador

    // atiradores mantêm mais distância e são um pouco mais lentos: o desafio deve
    // vir de se posicionar bem, não de fugir de uma chuva de projéteis encostado neles.
    const stats = {
      chaser:  { r: 12, speed: 58,  hp: 40,  dmg: 10, keepDist: 0 },
      tank:    { r: 18, speed: 24,  hp: 110, dmg: 16, keepDist: 0 },
      hunter:  { r: 8,  speed: 105, hp: 18,  dmg: 7,  keepDist: 0 },
      shooter: { r: 13, speed: 36,  hp: 32,  dmg: 8,  keepDist: 220 },
      boss:    { r: 30, speed: 34,  hp: 260, dmg: 20, keepDist: 160 }
    };
    const s = stats[type] || stats.chaser;
    this.r = s.r;
    this.baseSpeed = s.speed;
    this.speed = s.speed;
    this.maxHp = s.hp;
    this.hp = s.hp;
    this.contactDamage = s.dmg;
    this.keepDist = s.keepDist;
  }

  get isDead(){ return this.hp <= 0; }

  takeDamage(amount){
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 1;
    return this.hp <= 0;
  }

  /** Empurra o Devorador para longe de (fromX, fromY) — dá impacto ao golpe do jogador. */
  applyKnockback(fromX, fromY, force){
    const dx = this.x - fromX, dy = this.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    this.knockX = (dx / d) * force;
    this.knockY = (dy / d) * force;
  }

  update(dt, player, bounds, onShoot){
    this.wobble += dt * 3;
    if(this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt * 4);

    // recuo de knockback, some rapidamente
    if(Math.abs(this.knockX) > 0.5 || Math.abs(this.knockY) > 0.5){
      this.x += this.knockX * dt;
      this.y += this.knockY * dt;
      const decay = Math.max(0, 1 - 9 * dt);
      this.knockX *= decay;
      this.knockY *= decay;
    }

    if(this.type === 'shooter' || this.type === 'boss'){
      this.shootTimer -= dt;
      const telegraphWindow = 0.4;
      this.telegraph = this.shootTimer <= telegraphWindow
        ? 1 - Math.max(0, this.shootTimer) / telegraphWindow
        : 0;
      const dx = player.x - this.x, dy = player.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      if(dist > this.keepDist + 20){
        this.moveToward(player, dt);
      } else if(dist < this.keepDist - 20){
        this.moveAway(player, dt);
      } else {
        // zona confortável: em vez de parar, cerca o jogador tangencialmente
        const tx = -dy / dist, ty = dx / dist;
        this.x += tx * this.circleDir * this.speed * 0.85 * dt;
        this.y += ty * this.circleDir * this.speed * 0.85 * dt;
      }
      if(this.shootTimer <= 0){
        // recarga mais longa: menos projéteis na tela, cada um mais fácil de ler
        this.shootTimer = this.type === 'boss' ? (1.7 + Math.random() * 0.7) : (2.5 + Math.random() * 1.1);
        this.telegraph = 0;
        if(onShoot) onShoot(this);
      }
    } else {
      this.moveToward(player, dt);
    }
  }

  moveToward(target, dt){
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    this.x += (dx / dist) * this.speed * dt;
    this.y += (dy / dist) * this.speed * dt;
  }

  moveAway(target, dt){
    const dx = this.x - target.x;
    const dy = this.y - target.y;
    const dist = Math.hypot(dx, dy) || 1;
    this.x += (dx / dist) * this.speed * 0.7 * dt;
    this.y += (dy / dist) * this.speed * 0.7 * dt;
  }
}

/**
 * Projectile - disparado por Devoradores do tipo 'shooter' e 'boss'.
 */
class Projectile {
  constructor(x, y, targetX, targetY, opts = {}){
    this.x = x;
    this.y = y;
    const dx = targetX - x, dy = targetY - y;
    const dist = Math.hypot(dx, dy) || 1;
    this.speed = opts.speed ?? 210;
    this.vx = (dx / dist) * this.speed;
    this.vy = (dy / dist) * this.speed;
    this.r = opts.r ?? 5;
    this.damage = opts.damage ?? 9;
    this.color = opts.color ?? '#ff6b81';
    this.dead = false;
    this.life = 4;
  }

  update(dt){
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if(this.life <= 0) this.dead = true;
  }
}

/**
 * Particle - efeito visual genérico (impacto, explosão, coleta, ambiente).
 */
class Particle {
  constructor(x, y, opts = {}){
    this.x = x;
    this.y = y;
    const ang = opts.angle ?? Math.random() * Math.PI * 2;
    const spd = opts.speed ?? (40 + Math.random() * 80);
    this.vx = Math.cos(ang) * spd;
    this.vy = Math.sin(ang) * spd;
    this.r = opts.r ?? (1.5 + Math.random() * 2.5);
    this.color = opts.color ?? '#ffffff';
    this.life = opts.life ?? (0.4 + Math.random() * 0.4);
    this.maxLife = this.life;
    this.drag = opts.drag ?? 2.2;
    this.gravity = opts.gravity ?? 0;
    this.glow = opts.glow ?? false;
  }

  update(dt){
    this.life -= dt;
    this.vx -= this.vx * this.drag * dt;
    this.vy -= this.vy * this.drag * dt;
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  get isDead(){ return this.life <= 0; }
  get alpha(){ return Math.max(0, this.life / this.maxLife); }
}

/**
 * Item - recurso, cromossomo, cromátide ou fragmento de membrana.
 * state: 'idle' | 'carried' | 'delivered'
 */
class Item {
  constructor(x, y, opts = {}){
    this.x = x;
    this.y = y;
    this.r = opts.r ?? 9;
    this.color = opts.color ?? '#7fd9c4';
    this.label = opts.label ?? '';
    this.type = opts.type ?? 'generic';
    this.pairId = opts.pairId ?? null;
    this.slot = opts.slot ?? null;
    this.state = 'idle';
  }
}

/**
 * Zone - área de entrega (condensação, placa metafásica, polos, núcleos).
 * shape: 'circle' | 'rect'
 */
class Zone {
  constructor(x, y, r, opts = {}){
    this.x = x;
    this.y = y;
    this.r = r;
    this.w = opts.w ?? r * 2;
    this.h = opts.h ?? r * 2;
    this.shape = opts.shape ?? 'circle';
    this.label = opts.label ?? '';
    this.color = opts.color ?? '#6c8cff';
    this.capacity = opts.capacity ?? 1;
    this.filled = 0;
    this.side = opts.side ?? null;
    this.slot = opts.slot ?? null;
    // "escudo" usado na Telófase: quanto o núcleo aguenta antes de ser perdido
    this.shield = opts.shield ?? null;
    this.maxShield = this.shield;
  }

  get isFull(){ return this.filled >= this.capacity; }
}
