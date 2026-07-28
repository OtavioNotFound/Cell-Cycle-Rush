/**
 * AudioManager
 * Sons curtos e leves gerados via Web Audio API (sem arquivos externos).
 */
class AudioManager {
  constructor(){
    this.ctx = null;
  }

  ensureContext(){
    if(!this.ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return null;
      this.ctx = new AC();
    }
    if(this.ctx.state === 'suspended'){
      this.ctx.resume();
    }
    return this.ctx;
  }

  tone(freq, duration, type = 'sine', gainVal = 0.08, delay = 0){
    const ctx = this.ensureContext();
    if(!ctx) return;
    try{
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(gainVal, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    }catch(e){ /* silencioso se o áudio falhar */ }
  }

  collect(){ this.tone(660, 0.12, 'triangle', 0.07); }
  hit(){ this.tone(140, 0.22, 'sawtooth', 0.1); }
  /** Som do golpe do jogador conectando num inimigo: soco grave + estalo agudo curto. */
  impact(){
    this.tone(85, 0.1, 'square', 0.13);
    this.tone(1400, 0.025, 'square', 0.05, 0.006);
  }
  success(){
    this.tone(520, 0.1, 'sine', 0.08);
    this.tone(780, 0.14, 'sine', 0.07, 0.09);
  }
  fail(){ this.tone(180, 0.3, 'square', 0.1); }
  phaseComplete(){
    this.tone(440, 0.12, 'sine', 0.08);
    this.tone(660, 0.12, 'sine', 0.08, 0.12);
    this.tone(880, 0.2, 'sine', 0.08, 0.24);
  }
  attack(){
    this.tone(300, 0.08, 'square', 0.09);
    this.tone(180, 0.1, 'square', 0.06, 0.04);
  }
  attackMiss(){ this.tone(220, 0.06, 'triangle', 0.04); }
  shoot(){ this.tone(420, 0.08, 'sawtooth', 0.05); }
  /** Toque leve para marcar um "mini-evento" de ritmo (mais Devoradores chegando). */
  rampEvent(){
    this.tone(520, 0.09, 'triangle', 0.05);
    this.tone(740, 0.09, 'triangle', 0.045, 0.08);
  }
  /** Clique magnético curto — o item está perto o suficiente da posição certa. */
  snap(){
    this.tone(900, 0.05, 'triangle', 0.05);
    this.tone(1200, 0.05, 'triangle', 0.04, 0.03);
  }
  /** Tom quente de recuperação de vida (orbe, bônus de fase, combo). */
  heal(){
    this.tone(392, 0.12, 'sine', 0.07);
    this.tone(587, 0.16, 'sine', 0.07, 0.08);
  }
}
