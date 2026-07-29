/**
 * DialogueManager
 * Exibe pequenas caixas de texto sequenciais (sem cutscenes).
 */
class DialogueManager {
  constructor(){
    this.lines = [];
    this.idx = 0;
    this.onDone = null;
    this.box = document.getElementById('dialogueBox');
    this.textEl = document.getElementById('dialogueText');
  }

  start(lines, onDone){
    this.lines = lines;
    this.idx = 0;
    this.onDone = onDone;
    this.box.classList.remove('hidden');
    this.render();
  }

  render(){
    this.textEl.textContent = this.lines[this.idx];
  }

  advance(){
    if(this.lines.length === 0) return;
    this.idx++;
    if(this.idx >= this.lines.length){
      this.box.classList.add('hidden');
      const cb = this.onDone;
      this.lines = [];
      this.onDone = null;
      if(cb) cb();
    } else {
      this.render();
    }
  }

  get isActive(){
    return !this.box.classList.contains('hidden');
  }
}
