// ===== 文化介绍页逻辑（竞赛增强版：LBS打卡 + AI入口） =====

const cultureScroll = document.getElementById('culture-scroll');

function buildCultureHTML() {
  let html = '';

  // 成语典故区
  html += '<div class="section-title">成语典故</div>';
  IDIOMS.forEach(idiom => {
    const completed = getCompletedIdioms().includes(idiom.name);
    const unlocked = completed ? ' ✅' : '';
    const illuPath = 'assets/images/' + idiom.illustration;
    html += `
      <div class="culture-card" data-idiom-id="${idiom.id}">
        <img class="card-img" src="${illuPath}" alt="${idiom.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
        <div class="card-img-fallback" style="display:none;width:60px;height:60px;background:rgba(201,169,110,0.08);align-items:center;justify-content:center;font-size:28px;color:#a89050;border-radius:8px;flex-shrink:0;">&#128214;</div>
        <div class="card-info">
          <div class="card-name">${idiom.name}${unlocked}</div>
          <div class="card-pinyin">${idiom.pinyin}</div>
          <div class="card-desc">${idiom.meaning}</div>
        </div>
      </div>`;
  });

  // 邯郸名胜区
  html += '<div class="section-title">邯郸名胜</div>';
  ATTRACTIONS.forEach(attr => {
    const imgPath = 'assets/images/' + attr.image;
    html += `
      <div class="attraction-card" data-attr-id="${attr.id}">
        <img class="attr-img" src="${imgPath}" alt="${attr.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
        <div class="attr-img-fallback" style="display:none;width:100%;height:160px;background:rgba(201,169,110,0.08);align-items:center;justify-content:center;font-size:40px;color:#a89050;">&#127958;</div>
        <div class="attr-info">
          <div class="attr-name">${attr.name}</div>
          <div class="attr-desc">${attr.desc}</div>
          <div class="attr-distance" data-attr-coords="${attr.lat || ''},${attr.lng || ''}"></div>
        </div>
      </div>`;
  });

  cultureScroll.innerHTML = html;

  // 绑定成语卡片点击
  cultureScroll.querySelectorAll('.culture-card').forEach(card => {
    card.addEventListener('click', () => {
      const idiom = IDIOMS.find(i => i.id === card.dataset.idiomId);
      if (idiom) openIdiomDetail(idiom);
    });
  });

  // 绑定景点卡片点击
  cultureScroll.querySelectorAll('.attraction-card').forEach(card => {
    card.addEventListener('click', () => {
      const attr = ATTRACTIONS.find(a => a.id === card.dataset.attrId);
      if (attr) openAttractionDetail(attr);
    });
  });

  // 计算距离
  updateDistances();
}

function openIdiomDetail(idiom) {
  const illuPath = 'assets/images/' + idiom.illustration;
  const html = `
    <img class="detail-img" src="${illuPath}" alt="${idiom.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
    <div class="detail-img-fallback" style="display:none;width:100%;height:200px;background:rgba(201,169,110,0.08);align-items:center;justify-content:center;font-size:64px;color:#a89050;border-radius:12px;">&#128214;</div>
    <div class="detail-name">${idiom.name}</div>
    <div class="detail-pinyin">${idiom.pinyin}</div>
    <div class="detail-meaning">${idiom.meaning}</div>
    <div class="detail-story">${idiom.story}</div>
    <div class="detail-source">—— ${idiom.source}</div>
    <button class="btn-ai-ask" data-idiom-id="${idiom.id}">
      🤖 问问AI成语先生
    </button>
  `;
  openDetail(html);

  // 绑定AI按钮
  setTimeout(() => {
    const aiBtn = document.querySelector('.btn-ai-ask');
    if (aiBtn) {
      aiBtn.addEventListener('click', () => {
        openAIChat(idiom);
      });
    }
  }, 100);
}

function openAttractionDetail(attr) {
  const imgPath = 'assets/images/' + attr.image;
  const checkedIn = getCheckins().find(c => c.id === attr.id);
  const html = `
    <img class="detail-img" src="${imgPath}" alt="${attr.name}" onerror="this.style.display='none';">
    <div class="detail-name">${attr.name}</div>
    <div class="detail-story">${attr.detail}</div>
    <button class="btn-checkin ${checkedIn ? 'checked' : ''}" data-attr-id="${attr.id}" data-attr-name="${attr.name}" ${checkedIn ? 'disabled' : ''}>
      ${checkedIn ? '✅ 已打卡' : '📍 AR云打卡'}
    </button>
  `;
  openDetail(html);

  // 绑定打卡按钮
  setTimeout(() => {
    const checkinBtn = document.querySelector('.btn-checkin:not(.checked)');
    if (checkinBtn) {
      checkinBtn.addEventListener('click', () => {
        const id = checkinBtn.dataset.attrId;
        const name = checkinBtn.dataset.attrName;
        if (checkInAttraction(id, name)) {
          checkinBtn.classList.add('checked');
          checkinBtn.textContent = '✅ 已打卡';
          checkinBtn.disabled = true;
        }
      });
    }
  }, 100);
}

// LBS距离计算
function updateDistances() {
  if (!navigator.geolocation) {
    document.querySelectorAll('.attr-distance').forEach(el => {
      el.textContent = '📡 开启定位查看距离';
    });
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      document.querySelectorAll('.attr-distance').forEach(el => {
        const coords = el.dataset.attrCoords;
        if (!coords) { el.textContent = ''; return; }
        const [attrLat, attrLng] = coords.split(',').map(Number);
        if (!attrLat || !attrLng) { el.textContent = ''; return; }
        const dist = calcDistance(latitude, longitude, attrLat, attrLng);
        el.textContent = `📍 距离约 ${dist} 公里`;
      });
    },
    () => {
      document.querySelectorAll('.attr-distance').forEach(el => {
        el.textContent = '📍 开启定位查看距离';
      });
    }
  );
}

// 页面初始化时构建
buildCultureHTML();
