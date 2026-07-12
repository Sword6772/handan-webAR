// ===== 我的页面逻辑（竞赛增强版） =====

const profileAvatar = document.getElementById('profile-avatar');
const profileAvatarWrap = document.getElementById('profile-avatar-wrap');
const avatarInput = document.getElementById('avatar-input');
const profileName = document.getElementById('profile-name');

function initProfile() {
  // 加载头像
  const savedAvatar = getAvatar();
  if (savedAvatar) {
    profileAvatar.style.backgroundImage = `url(${savedAvatar})`;
    profileAvatar.textContent = '';
  } else {
    profileAvatar.style.backgroundImage = 'url(assets/images/img-avatar-default.jpg)';
    profileAvatar.textContent = '';
  }

  // 加载昵称
  profileName.value = getNickname();

  // 加载统计数据
  refreshProfileStats();

  // 头像点击
  profileAvatarWrap.addEventListener('click', () => avatarInput.click());
  avatarInput.addEventListener('change', handleAvatarUpload);

  // 昵称编辑
  profileName.addEventListener('input', () => {
    setNickname(profileName.value.trim() || '成语爱好者');
  });

  // 门票购买
  document.getElementById('btn-ticket').addEventListener('click', () => {
    showToast('敬请期待，即将接入景区票务系统');
  });

  // 邀请好友
  document.getElementById('btn-invite').addEventListener('click', () => {
    const url = getInviteUrl();
    if (navigator.share) {
      navigator.share({ title: '来邯郸成语AR，探索成语文化！', text: '我在成语元宇宙等你！', url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => showToast('邀请链接已复制')).catch(() => showToast('分享功能暂不可用'));
    }
  });
}

function refreshProfileStats() {
  // 统计
  document.getElementById('stat-unlocked').textContent = getUnlockedCount();
  document.getElementById('stat-badges').textContent = getBadges().length;

  // 段位展示
  const rank = getRank();
  document.getElementById('rank-icon').textContent = rank.icon;
  document.getElementById('rank-name').textContent = rank.name;
  document.getElementById('rank-name').style.color = rank.color;
  document.getElementById('rank-score').textContent = getScore() + ' 积分';

  // 进度条
  const nextRank = RANKS[RANKS.indexOf(rank) + 1];
  if (nextRank) {
    const progress = ((getScore() - rank.minScore) / (nextRank.minScore - rank.minScore)) * 100;
    document.getElementById('rank-progress').style.width = Math.min(progress, 100) + '%';
    document.getElementById('rank-score').textContent = getScore() + '/' + nextRank.minScore + ' 积分';
  } else {
    document.getElementById('rank-progress').style.width = '100%';
  }

  // 邯郸币
  document.getElementById('coins-amount').textContent = getCoins();

  // 徽章
  renderBadges();

  // 错题本
  renderErrorBook();

  // 积分兑换
  renderShop();
}

function renderBadges() {
  const grid = document.getElementById('badges-grid');
  const unlockedBadges = getBadges();

  grid.innerHTML = BADGES.map(b => {
    const unlocked = unlockedBadges.includes(b.id);
    return `<div class="badge-item ${unlocked ? 'unlocked' : 'locked'}">
      <span class="badge-icon">${unlocked ? b.icon : '🔒'}</span>
      <span class="badge-name">${unlocked ? b.name : '???'}</span>
      <span class="badge-desc">${unlocked ? b.desc : '尚未解锁'}</span>
    </div>`;
  }).join('');
}

function renderErrorBook() {
  const container = document.getElementById('error-book');
  const records = getErrorRecords();

  if (records.length === 0) {
    container.innerHTML = '<span class="empty-hint">暂无错题，继续保持！</span>';
    return;
  }

  container.innerHTML = records.map(r => `
    <div class="error-item">
      <span class="error-idiom">${r.idiom}</span>
      <span class="error-chars">错字: ${r.wrongChars.map(c => `<em>${c}</em>`).join(' ')}</span>
      <span class="error-count">×${r.count}</span>
    </div>
  `).join('');
}

function renderShop() {
  const list = document.getElementById('shop-list');
  const coins = getCoins();

  list.innerHTML = SHOP_ITEMS.map(item => {
    const canBuy = coins >= item.cost;
    return `<div class="shop-item">
      <span class="shop-icon">${item.icon}</span>
      <div class="shop-info">
        <span class="shop-name">${item.name}</span>
        <span class="shop-cost">🪙 ${item.cost}</span>
      </div>
      <button class="btn-shop-buy ${canBuy ? '' : 'disabled'}" data-id="${item.id}" data-cost="${item.cost}" ${canBuy ? '' : 'disabled'}>
        ${canBuy ? '兑换' : '不足'}
      </button>
    </div>`;
  }).join('');

  // 绑定兑换事件
  list.querySelectorAll('.btn-shop-buy:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      const cost = parseInt(btn.dataset.cost);
      if (spendCoins(cost)) {
        showToast('兑换成功！');
        refreshProfileStats();
      } else {
        showToast('邯郸币不足');
      }
    });
  });
}

function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 256, 256);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setAvatar(dataUrl);
      profileAvatar.style.backgroundImage = `url(${dataUrl})`;
      profileAvatar.textContent = '';
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// 进入个人页时刷新数据
const profileObserver = new MutationObserver(() => {
  if (document.getElementById('page-profile').classList.contains('active')) {
    refreshProfileStats();
  }
});
document.getElementById('page-profile').addEventListener('transitionend', refreshProfileStats);

initProfile();
