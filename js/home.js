// ===== 首页逻辑（竞赛增强版） =====

function initHome() {
  refreshHomeStats();
  renderDailyIdiom();

  document.getElementById('btn-ar-entry').addEventListener('click', () => {
    switchTab(2);
  });
}

function refreshHomeStats() {
  const stats = getPlatformStats();
  document.getElementById('hs-total').textContent = stats.totalGames;
  document.getElementById('hs-score').textContent = stats.totalScore;
  document.getElementById('hs-badges').textContent = stats.totalBadges;
}

function renderDailyIdiom() {
  const container = document.getElementById('home-daily');
  if (!container) return;

  // 基于日期选择每日成语
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const idiom = IDIOMS[dayOfYear % IDIOMS.length];

  container.innerHTML = `
    <div class="daily-label">📅 每日成语</div>
    <div class="daily-idiom">${idiom.name}</div>
    <div class="daily-meaning">${idiom.meaning}</div>
  `;
}

// 页面切换时刷新首页数据
const homeObserver = new MutationObserver(() => {
  if (document.getElementById('page-home').classList.contains('active')) {
    refreshHomeStats();
  }
});
homeObserver.observe(document.getElementById('page-home'), { attributes: true, attributeFilter: ['class'] });

initHome();
