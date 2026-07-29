/**
 * SaveData
 * Persistência simples via localStorage. Guarda se o jogador já venceu a
 * campanha ao menos uma vez (o que libera o botão de NG+) e quais Adaptações
 * permanentes ele já provou ter conquistado, para que um New Game+ comece
 * com TODAS elas já desbloqueadas — não apenas com a última, como antes.
 */
const SAVE_KEY = 'ccrSaveV2';
const LEGACY_BEATEN_KEY = 'ccrBeaten'; // versão antiga do save, só guardava um booleano

const SaveData = {
  _defaults(){
    return {
      beaten: false,
      unlockedAbilities: { dash: false, shot: false, pulse: false, overload: false },
      achievements: {},
      totalKills: 0,
      endings: {},
      achievementsByMode: { normal: {}, soulslike: {} },
      totalKillsByMode: { normal: 0, soulslike: 0 },
      endingsByMode: { normal: {}, soulslike: {} },
      permanentProgress: {
        essence: 0,
        totalUpgrades: 0,
        levels: { health: 0, damage: 0, speed: 0, energy: 0 }
      }
    };
  },

  load(){
    const data = this._defaults();
    try{
      const raw = localStorage.getItem(SAVE_KEY);
      if(raw){
        const parsed = JSON.parse(raw);
        if(parsed && typeof parsed === 'object'){
          data.beaten = !!parsed.beaten;
          Object.assign(data.unlockedAbilities, parsed.unlockedAbilities || {});
          Object.assign(data.achievements, parsed.achievements || {});
          data.totalKills = Number(parsed.totalKills) || 0;
          Object.assign(data.endings, parsed.endings || {});
          Object.assign(data.achievementsByMode.normal, parsed.achievementsByMode?.normal || parsed.achievements || {});
          Object.assign(data.achievementsByMode.soulslike, parsed.achievementsByMode?.soulslike || {});
          data.totalKillsByMode.normal = Number(parsed.totalKillsByMode?.normal ?? parsed.totalKills) || 0;
          data.totalKillsByMode.soulslike = Number(parsed.totalKillsByMode?.soulslike) || 0;
          Object.assign(data.endingsByMode.normal, parsed.endingsByMode?.normal || parsed.endings || {});
          Object.assign(data.endingsByMode.soulslike, parsed.endingsByMode?.soulslike || {});
          if(parsed.permanentProgress && typeof parsed.permanentProgress === 'object'){
            data.permanentProgress.essence = Number(parsed.permanentProgress.essence) || 0;
            data.permanentProgress.totalUpgrades = Number(parsed.permanentProgress.totalUpgrades) || 0;
            Object.keys(data.permanentProgress.levels).forEach(key => {
              data.permanentProgress.levels[key] = Number(parsed.permanentProgress.levels?.[key]) || 0;
            });
          }
        }
      } else if(localStorage.getItem(LEGACY_BEATEN_KEY) === '1'){
        // migra o save antigo: só sabíamos que o jogador tinha vencido uma vez
        data.beaten = true;
      }
    }catch(e){ /* localStorage indisponível — segue com os valores padrão */ }
    return data;
  },

  save(data){
    try{ localStorage.setItem(SAVE_KEY, JSON.stringify(data)); }catch(e){ /* indisponível */ }
  },

  /**
   * Chamado ao vencer a campanha: marca como derrotada e acumula as
   * Adaptações conquistadas nesta corrida ao conjunto já salvo (nunca
   * remove uma adaptação já provada em uma campanha anterior).
   */
  markBeaten(abilities){
    const data = this.load();
    data.beaten = true;
    Object.keys(data.unlockedAbilities).forEach(key => {
      if(abilities && abilities[key]) data.unlockedAbilities[key] = true;
    });
    this.save(data);
    return data;
  }
};
