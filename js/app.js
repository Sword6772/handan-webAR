// ===== 主应用：Tab切换 & 路由 =====

let currentTab = 0;
const pages = ['page-home','page-culture','page-ar','page-profile'];
const tabItems = document.querySelectorAll('#bottom-tabs .tab-item');

function switchTab(index) {
  if (currentTab === index) return;
  currentTab = index;

  // 切换页面
  document.querySelectorAll('.page').forEach((p,i) => {
    p.classList.toggle('active', i === index);
  });

  // 切换Tab样式和图标
  tabItems.forEach((t,i) => {
    t.classList.toggle('active', i === index);
    // 切换图片图标
    const img = t.querySelector('.tab-icon-img');
    if (img) {
      img.src = (i === index) ? img.dataset.active : img.dataset.default;
    }
  });

  // 离开AR页面时停止相机
  if (index !== 2 && arActive) {
    stopAR();
  }
  // 进入AR页面时初始化
  if (index === 2 && !arActive) {
    initAR();
  }
}

tabItems.forEach(tab => {
  tab.addEventListener('click', () => {
    switchTab(parseInt(tab.dataset.tab));
  });
});

// ===== Toast =====
let toastTimer;
function showToast(msg, duration = 2000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ===== 详情弹窗 =====
const detailModal = document.getElementById('detail-modal');
const detailContent = document.getElementById('detail-content');
const detailOverlay = document.getElementById('detail-overlay');
const detailClose = document.getElementById('detail-close');

function openDetail(html) {
  detailContent.innerHTML = html;
  detailModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDetail() {
  detailModal.classList.remove('open');
  document.body.style.overflow = '';
}

detailOverlay.addEventListener('click', closeDetail);
detailClose.addEventListener('click', closeDetail);

// ===== Avatar缓存 =====
function getAvatar() {
  return localStorage.getItem('handan_avatar') || '';
}
function setAvatar(dataUrl) {
  localStorage.setItem('handan_avatar', dataUrl);
}
function getNickname() {
  return localStorage.getItem('handan_nickname') || '成语爱好者';
}
function setNickname(name) {
  localStorage.setItem('handan_nickname', name);
}
function getUnlockedCount() {
  return parseInt(localStorage.getItem('handan_unlocked') || '0');
}
function incrementUnlocked() {
  const n = getUnlockedCount() + 1;
  localStorage.setItem('handan_unlocked', Math.min(n, 12).toString());
  return Math.min(n, 12);
}

// ===== 积分与段位系统 =====
function getScore() {
  return parseInt(localStorage.getItem('handan_score') || '0');
}
function addScore(points) {
  const oldScore = getScore();
  const oldRank = getRank();
  const newScore = oldScore + points;
  localStorage.setItem('handan_score', newScore.toString());
  const newRank = getRank();
  return { oldScore, newScore, points, oldRank, newRank, rankUp: oldRank.name !== newRank.name };
}
function getRank() {
  const score = getScore();
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].minScore) return RANKS[i];
  }
  return RANKS[0];
}

// ===== 虚拟货币系统 =====
function getCoins() {
  return parseInt(localStorage.getItem('handan_coins') || '0');
}
function addCoins(amount) {
  const c = getCoins() + amount;
  localStorage.setItem('handan_coins', c.toString());
  return c;
}
function spendCoins(amount) {
  const c = getCoins();
  if (c < amount) return false;
  localStorage.setItem('handan_coins', (c - amount).toString());
  return true;
}

// ===== 徽章系统 =====
function getBadges() {
  try { return JSON.parse(localStorage.getItem('handan_badges') || '[]'); } catch(e) { return []; }
}
function unlockBadge(badgeId) {
  const badges = getBadges();
  if (badges.includes(badgeId)) return false;
  badges.push(badgeId);
  localStorage.setItem('handan_badges', JSON.stringify(badges));
  return true;
}

// ===== 错题本系统 =====
function addErrorRecord(idiomName, wrongChar) {
  const records = getErrorRecords();
  const existing = records.find(r => r.idiom === idiomName);
  if (existing) {
    if (!existing.wrongChars.includes(wrongChar)) existing.wrongChars.push(wrongChar);
    existing.count++;
  } else {
    records.push({ idiom: idiomName, wrongChars: [wrongChar], count: 1 });
  }
  localStorage.setItem('handan_errors', JSON.stringify(records));
}
function getErrorRecords() {
  try { return JSON.parse(localStorage.getItem('handan_errors') || '[]'); } catch(e) { return []; }
}

// ===== 成语完成记录 =====
function getCompletedIdioms() {
  try { return JSON.parse(localStorage.getItem('handan_completed') || '[]'); } catch(e) { return []; }
}
function addCompletedIdiom(idiomName) {
  const list = getCompletedIdioms();
  if (!list.includes(idiomName)) {
    list.push(idiomName);
    localStorage.setItem('handan_completed', JSON.stringify(list));
  }
  return list;
}

// ===== 景点打卡系统 =====
function getCheckins() {
  try { return JSON.parse(localStorage.getItem('handan_checkins') || '[]'); } catch(e) { return []; }
}
function checkInAttraction(attrId, attrName) {
  const list = getCheckins();
  if (!list.find(c => c.id === attrId)) {
    list.push({ id: attrId, name: attrName, time: Date.now() });
    localStorage.setItem('handan_checkins', JSON.stringify(list));
    addCoins(30);
    showToast(`📍 打卡成功！+30邯郸币`);
    return true;
  }
  return false;
}

// ===== 景点距离计算 =====
function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c).toFixed(1);
}

// ===== 分享卡片生成 =====
function generateShareCard(idiom, mode) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 900;
    const ctx = canvas.getContext('2d');

    // 背景渐变
    const bg = ctx.createLinearGradient(0, 0, 0, 900);
    bg.addColorStop(0, '#1a1410');
    bg.addColorStop(1, '#2c2420');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 600, 900);

    // 装饰边框
    ctx.strokeStyle = '#C9A96E';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 560, 860);
    ctx.strokeStyle = 'rgba(201,169,110,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(32, 32, 536, 836);

    // Logo
    ctx.fillStyle = '#C9A96E';
    ctx.font = 'bold 28px "KaiTi","STKaiti","楷体",serif';
    ctx.textAlign = 'center';
    ctx.fillText('邯郸成语AR', 300, 90);

    // 分隔线
    ctx.strokeStyle = 'rgba(201,169,110,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 115);
    ctx.lineTo(500, 115);
    ctx.stroke();

    // 成语大字
    ctx.fillStyle = '#C9A96E';
    ctx.font = 'bold 72px "KaiTi","STKaiti","楷体",serif';
    ctx.fillText(idiom.name, 300, 210);

    // 拼音
    ctx.fillStyle = '#8a7a5a';
    ctx.font = '26px sans-serif';
    ctx.fillText(idiom.pinyin, 300, 255);

    // 释义
    ctx.fillStyle = '#F5F0E8';
    ctx.font = '22px "PingFang SC","Microsoft YaHei",sans-serif';
    const meaningLines = splitTextLines(ctx, idiom.meaning, 520);
    meaningLines.forEach((line, i) => {
      ctx.fillText(line, 300, 320 + i * 34);
    });

    // 模式标签
    const labelY = 320 + meaningLines.length * 34 + 30;
    ctx.fillStyle = 'rgba(201,169,110,0.15)';
    ctx.fillRect(200, labelY, 200, 40);
    ctx.fillStyle = '#C9A96E';
    ctx.font = '18px sans-serif';
    ctx.fillText(mode === 'game' ? '🧩 拼成语挑战完成' : '📷 AR探索发现', 300, labelY + 28);

    // 来源
    ctx.fillStyle = 'rgba(245,240,232,0.4)';
    ctx.font = '16px serif';
    ctx.fillText('—— ' + idiom.source, 300, labelY + 80);

    // 底部二维码区域
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(180, 680, 240, 80);
    ctx.fillStyle = 'rgba(245,240,232,0.4)';
    ctx.font = '14px sans-serif';
    ctx.fillText('扫码体验邯郸成语AR', 300, 710);
    ctx.fillText('探寻成语之都 · 邯郸', 300, 740);

    // 底部标签
    ctx.fillStyle = 'rgba(245,240,232,0.2)';
    ctx.font = '12px sans-serif';
    ctx.fillText('—— 成语元宇宙 · 数字文旅 ——', 300, 850);

    canvas.toBlob(blob => resolve(blob), 'image/png');
  });
}

function splitTextLines(ctx, text, maxWidth) {
  const chars = text.split('');
  const lines = [];
  let line = '';
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i];
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      lines.push(line);
      line = chars[i];
    } else { line = test; }
  }
  if (line.length > 0) lines.push(line);
  return lines;
}

async function shareIdiom(idiom, mode) {
  try {
    const blob = await generateShareCard(idiom, mode);
    const file = new File([blob], `${idiom.name}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `我在成语元宇宙发现了「${idiom.name}」`,
        text: `来邯郸成语AR，一起探索成语文化！`,
        files: [file]
      });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${idiom.name}.png`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('已保存分享卡片到相册');
    }
  } catch (e) {
    if (e.name !== 'AbortError') showToast('分享失败，请重试');
  }
}

// ===== 邀请链接生成 =====
function getInviteUrl() {
  const base = window.location.origin + window.location.pathname;
  return base + '?ref=' + (getNickname() || 'user');
}

// ===== 首页统计数据 =====
function getPlatformStats() {
  const totalGames = getCompletedIdioms().length;
  const totalScore = getScore();
  const totalBadges = getBadges().length;
  // 模拟总用户数（基于localStorage初始化时间）
  const installDate = localStorage.getItem('handan_install_date');
  if (!installDate) localStorage.setItem('handan_install_date', Date.now().toString());
  return { totalGames, totalScore, totalBadges };
}
