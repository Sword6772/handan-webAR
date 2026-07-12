// ===== 成语拼字游戏引擎（竞赛增强版：计时+积分+段位） =====

class IdiomGameEngine {
  constructor() {
    this.currentIdiom = null;
    this.allChars = [];
    this.selectedIndices = [];
    this.correctCount = 0;
    this.wrongAttempts = 0;
    this.isActive = false;
    this.totalIdioms = IDIOMS.length;
    this.completedIds = new Set(getCompletedIdioms());

    // 计时相关
    this.startTime = 0;
    this.elapsedTime = 0;
    this.timerInterval = null;
    this.totalCorrectChars = 0; // 本局选中的正确字数

    // 回调
    this.onCharSelected = null;
    this.onGameComplete = null;
    this.onStateChange = null;
    this.onTimerUpdate = null;  // (elapsedSeconds)
  }

  pickIdiom() {
    const remaining = IDIOMS.filter(i => !this.completedIds.has(i.id));
    if (remaining.length === 0) {
      this.completedIds.clear();
      return IDIOMS[Math.floor(Math.random() * IDIOMS.length)];
    }
    return remaining[Math.floor(Math.random() * remaining.length)];
  }

  start() {
    this.currentIdiom = this.pickIdiom();
    this.correctCount = 0;
    this.wrongAttempts = 0;
    this.selectedIndices = [];
    this.totalCorrectChars = 0;
    this.elapsedTime = 0;
    this.isActive = true;
    this.startTime = Date.now();

    // 开始计时
    this.timerInterval = setInterval(() => {
      if (!this.isActive) { clearInterval(this.timerInterval); return; }
      this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
      if (this.onTimerUpdate) this.onTimerUpdate(this.elapsedTime);
    }, 1000);

    // 混合字符
    const correct = this.currentIdiom.chars.map((ch, i) => ({
      char: ch, isCorrect: true, correctIndex: i, id: `correct_${i}`
    }));
    const distractors = this.currentIdiom.distractors.map((ch, i) => ({
      char: ch, isCorrect: false, correctIndex: -1, id: `distractor_${i}`
    }));

    this.allChars = [...correct, ...distractors];
    for (let i = this.allChars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.allChars[i], this.allChars[j]] = [this.allChars[j], this.allChars[i]];
    }

    if (this.onStateChange) this.onStateChange('started');
    return {
      idiomName: this.currentIdiom.name,
      totalChars: this.currentIdiom.chars.length,
      allChars: this.allChars
    };
  }

  selectChar(index) {
    if (!this.isActive) return null;
    if (this.selectedIndices.includes(index)) return null;

    const selected = this.allChars[index];
    const expectedChar = this.currentIdiom.chars[this.correctCount];

    let result;

    if (selected.isCorrect && selected.char === expectedChar) {
      this.selectedIndices.push(index);
      this.correctCount++;
      this.totalCorrectChars++;
      result = {
        type: 'correct',
        char: selected.char,
        slotIndex: this.correctCount - 1,
        isComplete: this.correctCount === this.currentIdiom.chars.length
      };

      if (result.isComplete) {
        this.isActive = false;
        clearInterval(this.timerInterval);
        this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);

        // 记录完成
        this.completedIds.add(this.currentIdiom.id);
        addCompletedIdiom(this.currentIdiom.name);
        incrementUnlocked();
        document.getElementById('stat-unlocked').textContent = getUnlockedCount();

        // 计算得分
        const scoreResult = this.calculateScore();
        result.scoreResult = scoreResult;

        // 检查徽章
        result.newBadges = this.checkBadges(scoreResult);

        if (this.onGameComplete) this.onGameComplete(this.currentIdiom, scoreResult, result.newBadges);
      }
    } else if (selected.isCorrect && selected.char !== expectedChar) {
      result = { type: 'wrong_order', char: selected.char };
      this.wrongAttempts++;
      addErrorRecord(this.currentIdiom.name, selected.char);
    } else {
      result = { type: 'wrong_char', char: selected.char };
      this.wrongAttempts++;
      addErrorRecord(this.currentIdiom.name, selected.char);
    }

    if (this.onCharSelected) this.onCharSelected(result);
    return result;
  }

  // 计算得分
  calculateScore() {
    let baseScore = this.totalCorrectChars * 10; // 每对一字10分
    let speedBonus = 0;
    const t = this.elapsedTime;

    if (t <= 15) speedBonus = 60;
    else if (t <= 30) speedBonus = 40;
    else if (t <= 60) speedBonus = 20;

    const perfectBonus = this.wrongAttempts === 0 ? 30 : 0;
    const difficultyBonus = (this.currentIdiom.difficulty || 1) * 10;

    const total = baseScore + speedBonus + perfectBonus + difficultyBonus;

    // 保存积分
    const scoreData = addScore(total);
    addCoins(total); // 1分=1邯郸币

    return {
      baseScore, speedBonus, perfectBonus, difficultyBonus, total,
      time: t, wrongAttempts: this.wrongAttempts,
      rankUp: scoreData.rankUp,
      oldRank: scoreData.oldRank,
      newRank: scoreData.newRank
    };
  }

  // 检查徽章
  checkBadges(scoreResult) {
    const newBadges = [];

    if (unlockBadge('first_win')) {
      newBadges.push(BADGES.find(b => b.id === 'first_win'));
    }

    const completedCount = getCompletedIdioms().length;
    if (completedCount >= 5 && unlockBadge('five_wins')) {
      newBadges.push(BADGES.find(b => b.id === 'five_wins'));
    }
    if (completedCount >= 10 && unlockBadge('ten_wins')) {
      newBadges.push(BADGES.find(b => b.id === 'ten_wins'));
    }
    if (completedCount >= 12 && unlockBadge('all_idioms')) {
      newBadges.push(BADGES.find(b => b.id === 'all_idioms'));
    }
    if (scoreResult.wrongAttempts === 0 && unlockBadge('perfect')) {
      newBadges.push(BADGES.find(b => b.id === 'perfect'));
    }
    if (scoreResult.time <= 30 && unlockBadge('speed_demon')) {
      newBadges.push(BADGES.find(b => b.id === 'speed_demon'));
    }

    return newBadges;
  }

  reset() {
    this.isActive = false;
    clearInterval(this.timerInterval);
    this.correctCount = 0;
    this.wrongAttempts = 0;
    this.selectedIndices = [];
    this.allChars = [];
    this.elapsedTime = 0;
    if (this.onStateChange) this.onStateChange('reset');
  }

  getProgress() {
    return {
      correctCount: this.correctCount,
      total: this.currentIdiom ? this.currentIdiom.chars.length : 0,
      wrongAttempts: this.wrongAttempts,
      elapsedTime: this.elapsedTime
    };
  }
}
