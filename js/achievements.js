const ACHIEVEMENT_DEFS = [
  { id:'phase_interfase', icon:'◉', category:'Progresso', name:'Primeira Divisão', description:'Complete a Interfase.' },
  { id:'phase_profase', icon:'◆', category:'Progresso', name:'Organização Celular', description:'Complete a Prófase.' },
  { id:'phase_metafase', icon:'║', category:'Progresso', name:'Tudo em Ordem', description:'Complete a Metáfase.' },
  { id:'phase_anafase', icon:'↔', category:'Progresso', name:'Separação Perfeita', description:'Complete a Anáfase.' },
  { id:'phase_telofase', icon:'◎', category:'Progresso', name:'Nova Vida', description:'Complete a Telófase.' },
  { id:'kills_100', icon:'✦', category:'Combate', name:'Caçador de Devoradores', description:'Derrote 100 inimigos.', target:100 },
  { id:'kills_500', icon:'✹', category:'Combate', name:'Exterminador', description:'Derrote 500 inimigos.', target:500 },
  { id:'kills_1000', icon:'★', category:'Combate', name:'Predador Microscópico', description:'Derrote 1000 inimigos.', target:1000 },
  { id:'ability_first', icon:'∆', category:'Habilidade', name:'Evolução', description:'Desbloqueie sua primeira habilidade.' },
  { id:'ability_all', icon:'✧', category:'Habilidade', name:'Adaptação Completa', description:'Desbloqueie todas as habilidades.' },
  { id:'ending_good', icon:'☀', category:'Finais', name:'Esperança', description:'Desbloqueie o Final Bom.' },
  { id:'ending_bad', icon:'⌁', category:'Finais', name:'Mutação', description:'Desbloqueie o Final Ruim.' },
  { id:'ending_veryBad', icon:'×', category:'Finais', name:'Extinção', description:'Desbloqueie o Final Muito Ruim.' },
  { id:'ending_secret', icon:'✺', category:'Finais', name:'Evolução Suprema', description:'Desbloqueie o Final Secreto.' },
  { id:'no_damage', icon:'♢', category:'Desafio', name:'Imparável', description:'Complete uma fase sem sofrer dano.' },
  { id:'speedrun', icon:'»', category:'Desafio', name:'Velocista', description:'Complete uma fase em menos de 2 minutos.' },
  { id:'perfect_metafase', icon:'⌖', category:'Desafio', name:'Precisão Celular', description:'Complete a Metáfase sem posicionar nenhum cromossomo incorretamente.' },
  { id:'one_hp', icon:'♥', category:'Desafio', name:'Sobrevivente', description:'Fique com apenas 1 ponto de vida e sobreviva até o fim da fase.' },
  { id:'streak_20', icon:'♨', category:'Desafio', name:'Em Chamas', description:'Derrote 20 inimigos sem sofrer dano.' },
  { id:'idle_30', icon:'◌', category:'Secretas', name:'O Observador', description:'Permaneça parado por 30 segundos.', secret:true },
  { id:'curious', icon:'?', category:'Secretas', name:'Curioso', description:'Interaja com todos os elementos interativos de uma fase.', secret:true },
  { id:'final_boss_death', icon:'☠', category:'Secretas', name:'Quase Lá', description:'Morra durante o boss final.', secret:true },
  { id:'all_endings', icon:'∞', category:'Secretas', name:'Destino', description:'Desbloqueie todos os finais.', secret:true },
  { id:'all_achievements', icon:'M', category:'Secretas', name:'Mestre da Mitose', description:'Desbloqueie TODAS as conquistas do jogo.', secret:true }
];

class AchievementManager {
  constructor(game){
    this.game = game;
    this.data = SaveData.load();
    this.data.achievements ||= {};
    this.data.totalKills ||= 0;
    this.data.endings ||= {};
    this.data.achievementsByMode ||= { normal:{}, soulslike:{} };
    this.data.totalKillsByMode ||= { normal:0, soulslike:0 };
    this.data.endingsByMode ||= { normal:{}, soulslike:{} };
    this.activeMode = 'normal';
    this.viewMode = 'normal';
    this.toastQueue = [];
    this.repairEndingAchievements();
    this.renderMenu();
  }

  setMode(mode){
    this.activeMode = mode === 'soulslike' ? 'soulslike' : 'normal';
    this.viewMode = this.activeMode;
    this.repairEndingAchievements();
    this.renderMenu();
  }

  get achievements(){ return this.data.achievementsByMode[this.activeMode]; }
  get endings(){ return this.data.endingsByMode[this.activeMode]; }
  get totalKills(){ return this.data.totalKillsByMode[this.activeMode] || 0; }

  /**
   * Repara saves de versões anteriores nos quais o final foi registrado, mas
   * a conquista correspondente não chegou a ser gravada.
   */
  repairEndingAchievements(){
    const map = {
      good:'ending_good',
      bad:'ending_bad',
      veryBad:'ending_veryBad',
      secret:'ending_secret',
      true:'ending_secret'
    };
    let changed = false;
    Object.entries(map).forEach(([endingId, achievementId]) => {
      if(this.endings[endingId] && !this.achievements[achievementId]){
        this.achievements[achievementId] = new Date().toISOString();
        changed = true;
      }
    });
    if(changed) SaveData.save(this.data);
  }

  unlock(id){
    if(this.achievements[id]) return false;
    const def = ACHIEVEMENT_DEFS.find(a => a.id === id);
    if(!def) return false;
    const latest = SaveData.load();
    latest.achievementsByMode = this.data.achievementsByMode;
    latest.totalKillsByMode = this.data.totalKillsByMode;
    latest.endingsByMode = this.data.endingsByMode;
    this.data = latest;
    this.achievements[id] = new Date().toISOString();
    SaveData.save(this.data);
    this.game.audio.achievement();
    this.showToast(def);
    this.renderMenu();
    if(id !== 'all_achievements'){
      const remaining = ACHIEVEMENT_DEFS.filter(a => a.id !== 'all_achievements' && !this.achievements[a.id]);
      if(!remaining.length){
        const completedMode = this.activeMode;
        setTimeout(() => {
          const previousMode = this.activeMode;
          this.activeMode = completedMode;
          this.unlock('all_achievements');
          this.activeMode = previousMode;
          this.renderMenu();
        }, 900);
      }
    }
    return true;
  }

  addKill(){
    const latest = SaveData.load();
    latest.achievementsByMode = this.data.achievementsByMode;
    latest.totalKillsByMode = this.data.totalKillsByMode;
    latest.endingsByMode = this.data.endingsByMode;
    this.data = latest;
    this.data.totalKillsByMode[this.activeMode] = this.totalKills + 1;
    SaveData.save(this.data);
    [100, 500, 1000].forEach(n => {
      if(this.totalKills >= n) this.unlock(`kills_${n}`);
    });
  }

  recordEnding(id){
    const latest = SaveData.load();
    latest.achievementsByMode = this.data.achievementsByMode;
    latest.totalKillsByMode = this.data.totalKillsByMode;
    latest.endingsByMode = this.data.endingsByMode;
    this.data = latest;
    this.endings[id] = true;
    SaveData.save(this.data);
    const map = { good:'ending_good', bad:'ending_bad', veryBad:'ending_veryBad', secret:'ending_secret', true:'ending_secret' };
    if(map[id]) this.unlock(map[id]);
    const required = ['good','bad','veryBad','secret'];
    if(required.every(k => this.endings[k]) || (this.endings.true && required.filter(k => k !== 'secret').every(k => this.endings[k]))){
      this.unlock('all_endings');
    }
  }

  showToast(def){
    const host = document.getElementById('achievementToasts');
    if(!host) return;
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `<span class="achievement-toast-icon">${def.icon}</span><span><small>CONQUISTA DESBLOQUEADA</small><strong>${def.name}</strong></span>`;
    host.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, 3600);
  }

  renderMenu(filter = 'Todas', mode = this.viewMode){
    const list = document.getElementById('achievementList');
    const summary = document.getElementById('achievementSummary');
    if(!list) return;
    this.viewMode = mode;
    const modeAchievements = this.data.achievementsByMode[mode];
    // Ignora IDs removidos de versões antigas (como a antiga conquista do
    // Final Neutro), evitando percentuais acima de 100%.
    const unlocked = ACHIEVEMENT_DEFS.filter(def => !!modeAchievements[def.id]).length;
    if(summary){
      summary.innerHTML = `<span>${unlocked}/${ACHIEVEMENT_DEFS.length} desbloqueadas • ${Math.round(unlocked / ACHIEVEMENT_DEFS.length * 100)}%</span>
        <span class="achievement-mode-switch"><button data-mode="normal" class="${mode === 'normal' ? 'active' : ''}">NORMAL</button><button data-mode="soulslike" class="${mode === 'soulslike' ? 'active' : ''}">SOULSLIKE</button></span>`;
      summary.querySelectorAll('[data-mode]').forEach(btn => btn.addEventListener('click', () => this.renderMenu(filter, btn.dataset.mode)));
    }
    list.innerHTML = '';
    ACHIEVEMENT_DEFS.filter(a => filter === 'Todas' || a.category === filter).forEach(def => {
      const date = modeAchievements[def.id];
      const hidden = def.secret && !date;
      const card = document.createElement('article');
      card.className = `achievement-card ${date ? 'unlocked' : 'locked'}`;
      card.innerHTML = `
        <div class="achievement-icon">${date ? def.icon : '🔒'}</div>
        <div class="achievement-copy">
          <span class="achievement-category">${def.category}</span>
          <h3>${hidden ? '???' : def.name}</h3>
          <p>${hidden ? 'Conquista secreta — continue explorando.' : def.description}</p>
          ${date ? `<time>Desbloqueada em ${new Date(date).toLocaleDateString('pt-BR')}</time>` : '<time>Bloqueada</time>'}
        </div>`;
      list.appendChild(card);
    });
  }
}
