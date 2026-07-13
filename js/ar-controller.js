// ===== AR控制器：MindAR + Three.js 编排 =====

let arActive = false;
let currentARMode = 'game'; // 'game' | 'scan'
let mindarInstance = null; // MindAR实例引用
let scanLoading = false; // 防止竞态
let scanFacingMode = 'environment'; // 'environment' (后置) | 'user' (前置)
let scanVideoStream = null; // 当前扫描模式的摄像头流，用于切换摄像头

// 变量（模式一：扫典故用 - 自定义渲染管线）
let scanRenderer = null;
let scanScene = null;
let scanCamera = null;
let scanCards = [];

// 变量（模式二：拼成语用）
let gameRenderer = null;
let gameScene = null;
let gameCamera = null;
let charMeshes = [];
let confettiParticles = [];

// 游戏引擎
const gameEngine = new IdiomGameEngine();

// ===== 摄像头切换按钮 =====
document.getElementById('btn-toggle-camera').addEventListener('click', (e) => {
  e.stopPropagation();
  toggleScanCamera();
});

// ===== AR模式切换 =====
document.getElementById('ar-mode-tabs').addEventListener('click', async (e) => {
  const tab = e.target.closest('.ar-mode-tab');
  if (!tab) return;
  const mode = tab.dataset.mode;
  if (mode === currentARMode) return;

  document.querySelectorAll('.ar-mode-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');

  // 先停掉当前模式
  if (currentARMode === 'scan') stopScanMode();
  if (currentARMode === 'game') stopGameMode();

  // 切换UI
  const prevMode = currentARMode;
  currentARMode = mode;
  document.getElementById('ar-mode-scan').classList.toggle('active', mode === 'scan');
  document.getElementById('ar-mode-game').classList.toggle('active', mode === 'game');

  // 启动新模式
  try {
    if (mode === 'scan') await startScanMode();
    if (mode === 'game') startGameMode();
  } catch (err) {
    console.error('Mode switch error:', err);
    currentARMode = prevMode; // 恢复
  }
});

// ===== AR初始化 =====
async function initAR() {
  arActive = true;
  if (currentARMode === 'scan') startScanMode();
  if (currentARMode === 'game') startGameMode();
}

function stopAR() {
  arActive = false;
  scanLoading = false;
  // 同时清理两种模式，确保资源释放
  stopScanMode();
  stopGameMode();
  // 二次确保 MindAR body 级 overlay 被清除
  document.querySelectorAll('[class*="mindar-ui"]').forEach(el => el.remove());
}

// =====================================================================
// 模式一：扫典故（MindAR图像追踪 + 成语内容展示）
// =====================================================================

async function startScanMode() {
  const container = document.getElementById('ar-mode-scan');
  const statusEl = document.getElementById('ar-status-scan');
  const guide = document.getElementById('scan-guide');

  scanLoading = true;
  try {
    const facingLabel = scanFacingMode === 'user' ? '前置' : '后置';
    statusEl.textContent = '正在启动' + facingLabel + '相机...';

    await initMindAR(container, scanFacingMode);

    if (!scanLoading) return; // 加载中被中断
    statusEl.textContent = '';
    guide.style.display = 'block';
    // 更新摄像头切换按钮状态
    updateCameraToggleBtn();

  } catch (err) {
    if (!scanLoading) return; // 加载中被中断，不显示错误
    console.error('Scan mode error:', err);
    const errName = (err && err.name) || '';
    const errMsg = (err && err.message) || '';
    if (errName === 'NotAllowedError' || errName === 'AbortError') {
      statusEl.textContent = '请授权相机权限后刷新页面';
    } else if (errMsg.includes('超时')) {
      statusEl.textContent = errMsg;
    } else {
      statusEl.textContent = '无法访问相机，请检查权限设置';
    }
    guide.style.display = 'none';
  }
  scanLoading = false;
}

function initMindAR(container, facingMode) {
  return new Promise((resolve, reject) => {
    if (typeof MINDAR === 'undefined') {
      reject(new Error('MindAR not loaded'));
      return;
    }

    // 超时保护
    const timeoutId = setTimeout(() => {
      reject(new Error('AR引擎初始化超时，请检查网络或刷新重试'));
    }, 25000);

    const cleanup = () => clearTimeout(timeoutId);

    // ===== 策略：不覆盖_startVideo，保持MindAR原生渲染管线 =====
    // 改为拦截document.createElement('video')给loadedmetadata加超时兜底
    // 同时拦截getUserMedia做摄像头方向切换

    const facing = facingMode || 'environment';

    // 拦截getUserMedia：支持摄像头方向切换
    const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function(constraints) {
      if (constraints.video && constraints.video.facingMode === 'environment') {
        constraints = {
          ...constraints,
          video: { ...constraints.video, facingMode: facing }
        };
      }
      return origGetUserMedia(constraints).then(stream => {
        scanVideoStream = stream;
        return stream;
      });
    };

    // 拦截createElement('video')：给loadedmetadata事件加超时兜底
    const origCreateElement = document.createElement.bind(document);
    document.createElement = function(tag, options) {
      const el = origCreateElement(tag, options);
      if (tag.toLowerCase() === 'video') {
        const origAddEventListener = el.addEventListener.bind(el);
        let metaFired = false;
        el.addEventListener = function(type, listener, options) {
          if (type === 'loadedmetadata') {
            const wrapped = function(ev) {
              if (metaFired) return;
              metaFired = true;
              listener.call(this, ev);
            };
            origAddEventListener.call(this, type, wrapped, options);
            // 超时兜底：8秒后loadedmetadata还没触发就手动触发
            setTimeout(() => {
              if (!metaFired && el.videoWidth > 0) {
                console.warn('loadedmetadata超时未触发，手动触发');
                wrapped(new Event('loadedmetadata'));
              } else if (!metaFired) {
                console.warn('loadedmetadata超时且无视频尺寸，强制触发');
                wrapped(new Event('loadedmetadata'));
              }
            }, 8000);
          } else {
            origAddEventListener.call(this, type, listener, options);
          }
        };
      }
      return el;
    };

    // MindAR v1 API: 内置Three.js渲染器
    const mindarThree = new MINDAR.IMAGE.MindARThree({
      container: container,
      imageTargetSrc: 'assets/markers/targets.mind'
    });

    // 从 MindAR 获取相机引用（用于后续同步相机矩阵到自定义渲染器）
    const { camera: arCamera } = mindarThree;

    // 为每个成语创建锚点（MindAR 只做追踪，内容用独立 THREE 渲染）
    const anchorData = [];
    IDIOMS.forEach((idiom, index) => {
      const anchor = mindarThree.addAnchor(index);
      anchorData.push({ anchor, idiom, index });
      console.log('[AR] 锚点已创建 ' + index + ': ' + idiom.name);
    });
    const restorePatches = () => {
      document.createElement = origCreateElement;
      navigator.mediaDevices.getUserMedia = origGetUserMedia;
    };

    mindarThree.start().then(() => {
      cleanup();
      restorePatches();

      // === Step 1: MindAR video 作为相机背景（和拼成语模式一样） ===
      const mindarVideo = container.querySelector('video');
      if (mindarVideo) {
        mindarVideo.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;opacity:1;pointer-events:none;';
      }

      // === Step 2: 隐藏 MindAR 自己的 canvas 和 UI（我们用自定义渲染器） ===
      container.querySelectorAll('canvas').forEach(c => { c.style.display = 'none'; });
      if (mindarThree.cssRenderer && mindarThree.cssRenderer.domElement) {
        mindarThree.cssRenderer.domElement.style.display = 'none';
      }
      container.querySelectorAll('[class*="mindar-ui"]').forEach(el => { el.style.display = 'none'; });

      // === Step 3: 创建自定义 Three.js 渲染器（独立版 THREE，和拼成语模式一致） ===
      scanRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      scanRenderer.setSize(container.clientWidth, container.clientHeight);
      scanRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      scanRenderer.domElement.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;pointer-events:none;';
      container.appendChild(scanRenderer.domElement);

      scanScene = new THREE.Scene();
      scanCamera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.01, 100);

      // === Step 4: 用独立版 THREE 创建卡片内容 ===
      scanCards = [];
      IDIOMS.forEach((idiom, index) => {
        const worldGroup = new THREE.Group();
        worldGroup.visible = false;

        const cardCanvas = document.createElement('canvas');
        cardCanvas.width = 512;
        cardCanvas.height = 700;
        drawIdiomCard(cardCanvas, idiom);
        const texture = new THREE.CanvasTexture(cardCanvas);
        texture.colorSpace = THREE.SRGBColorSpace;

        const planeGeo = new THREE.PlaneGeometry(1.0, 1.36);
        const planeMat = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide
        });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        worldGroup.add(plane);

        // 金色边框
        const edgeGeo = new THREE.EdgesGeometry(planeGeo);
        const edgeMat = new THREE.LineBasicMaterial({ color: 0xC9A96E });
        const edgeLine = new THREE.LineSegments(edgeGeo, edgeMat);
        worldGroup.add(edgeLine);

        scanScene.add(worldGroup);
        scanCards.push({ group: worldGroup, anchor: anchorData[index].anchor });
        console.log('[AR] 卡片已创建: ' + idiom.name);
      });

      // === Step 5: 自定义渲染循环 ===
      let lastLogTime = 0;
      const renderLoop = () => {
        if (!arActive || currentARMode !== 'scan') return;

        // 同步 MindAR 相机参数到我们的相机
        scanCamera.projectionMatrix.fromArray(arCamera.projectionMatrix.toArray());
        scanCamera.matrixWorld.fromArray(arCamera.matrixWorld.toArray());
        scanCamera.matrix.copy(scanCamera.matrixWorld);
        scanCamera.matrixWorldInverse.copy(scanCamera.matrix).invert();

        let anyFound = false;
        scanCards.forEach(({ group, anchor }) => {
          if (anchor.visible) {
            anyFound = true;
            if (!group.visible) console.log('[AR] 检测到目标，卡片显示中...');
            group.visible = true;
            // 从 MindAR anchor 复制世界变换到我们的 group
            const m = anchor.group.matrixWorld.elements;
            group.matrix.fromArray(m);
            group.matrix.decompose(group.position, group.quaternion, group.scale);
            group.matrixAutoUpdate = false;
          } else {
            group.visible = false;
          }
        });

        scanRenderer.render(scanScene, scanCamera);

        const now = Date.now();
        if (now - lastLogTime > 5000) {
          lastLogTime = now;
          const n = scanCards.filter(s => s.anchor.visible).length;
          console.log('[AR] 可见卡片: ' + n + '/' + scanCards.length);
        }

        document.getElementById('scan-guide').style.display = anyFound ? 'none' : 'block';
        requestAnimationFrame(renderLoop);
      };
      renderLoop();

      console.log('[AR] 自定义渲染管线已启动（独立Three.js）');
      mindarInstance = { mindarThree, anchorData };
      resolve();
    }).catch((err) => {
      cleanup();
      restorePatches();
      reject(err);
    });
  });
}

function drawIdiomCard(canvas, idiom) {
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = '#1a1410';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 金色边框
  ctx.strokeStyle = '#C9A96E';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  // 内边框
  ctx.strokeStyle = 'rgba(201,169,110,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  // 成语名（大号书法体）
  ctx.fillStyle = '#C9A96E';
  ctx.font = 'bold 68px "KaiTi","STKaiti","楷体",serif';
  ctx.textAlign = 'center';
  ctx.fillText(idiom.name, canvas.width / 2, 140);

  // 拼音
  ctx.fillStyle = '#8a7a5a';
  ctx.font = '26px sans-serif';
  ctx.fillText(idiom.pinyin, canvas.width / 2, 185);

  // 分隔线
  ctx.strokeStyle = 'rgba(201,169,110,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 215);
  ctx.lineTo(canvas.width - 80, 215);
  ctx.stroke();

  // 释义
  ctx.fillStyle = '#F5F0E8';
  ctx.font = '24px "PingFang SC","Microsoft YaHei",sans-serif';
  const meaningLines = splitLines(ctx, idiom.meaning, canvas.width - 80);
  meaningLines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, 260 + i * 36);
  });

  const meaningEndY = 260 + meaningLines.length * 36 + 16;

  // 典故故事
  ctx.fillStyle = 'rgba(245,240,232,0.6)';
  ctx.font = '18px "PingFang SC","Microsoft YaHei",sans-serif';
  const storyText = idiom.story.length > 160 ? idiom.story.substring(0, 160) + '...' : idiom.story;
  const storyLines = splitLines(ctx, storyText, canvas.width - 80);
  storyLines.forEach((line, i) => {
    const y = meaningEndY + i * 28;
    if (y < canvas.height - 50) ctx.fillText(line, canvas.width / 2, y);
  });

  // 出处
  ctx.fillStyle = 'rgba(245,240,232,0.3)';
  ctx.font = '15px serif';
  ctx.fillText('—— ' + idiom.source, canvas.width / 2, canvas.height - 30);
}

function splitLines(ctx, text, maxWidth) {
  const chars = text.split('');
  const lines = [];
  let line = '';
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i];
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      lines.push(line);
      line = chars[i];
    } else {
      line = test;
    }
  }
  if (line.length > 0) lines.push(line);
  return lines;
}

function stopScanMode() {
  scanLoading = false; // 中断可能正在进行的加载
  if (mindarInstance) {
    mindarInstance.mindarThree.stop();
    mindarInstance = null;
  }
  // 释放我们自己管理的摄像头流
  if (scanVideoStream) {
    scanVideoStream.getTracks().forEach(track => track.stop());
    scanVideoStream = null;
  }
  // 清理自定义渲染器
  if (scanRenderer) {
    scanRenderer.dispose();
    scanRenderer.domElement.remove();
    scanRenderer = null;
  }
  scanScene = null;
  scanCamera = null;
  scanCards = [];
  // 清理 MindAR 创建的 DOM 元素（MindAR 的 overlay 挂在 body 下）
  document.querySelectorAll('[class*="mindar-ui"]').forEach(el => el.remove());
  // 也清理容器内的元素
  const container = document.getElementById('ar-mode-scan');
  if (container) {
    container.querySelectorAll('video, canvas').forEach(el => el.remove());
  }
  document.getElementById('ar-status-scan').textContent = '';
  document.getElementById('scan-guide').style.display = 'none';
  // 更新摄像头切换按钮状态
  updateCameraToggleBtn();
}

// ===== 摄像头切换 =====
async function toggleScanCamera() {
  if (!arActive || currentARMode !== 'scan') return;
  scanFacingMode = scanFacingMode === 'environment' ? 'user' : 'environment';

  // 停止当前扫描模式
  stopScanMode();

  // 重新启动
  currentARMode = 'scan';
  document.getElementById('ar-mode-scan').classList.add('active');
  document.getElementById('ar-mode-game').classList.remove('active');

  try {
    await startScanMode();
  } catch (err) {
    console.error('Camera toggle error:', err);
  }
}

function updateCameraToggleBtn() {
  const btn = document.getElementById('btn-toggle-camera');
  if (!btn) return;
  const isScanActive = (currentARMode === 'scan' && arActive && mindarInstance);
  btn.style.display = isScanActive ? 'block' : 'none';
  btn.textContent = scanFacingMode === 'user' ? '📷 切换到后置' : '🤳 切换到前置';
}

// =====================================================================
// 模式二：拼成语（散字选字AR游戏）
// =====================================================================

async function startGameMode() {
  const video = document.getElementById('ar-video-game');
  const container = document.getElementById('ar-mode-game');
  const statusEl = document.getElementById('ar-status-game');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });
    video.srcObject = stream;
    await video.play();

    // Three.js渲染器
    gameRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    gameRenderer.setSize(container.clientWidth, container.clientHeight);
    gameRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    gameRenderer.domElement.id = 'ar-canvas';
    container.appendChild(gameRenderer.domElement);

    gameScene = new THREE.Scene();
    gameCamera = new THREE.PerspectiveCamera(
      60, container.clientWidth / container.clientHeight, 0.01, 100
    );
    gameCamera.position.set(0, 0, 2);
    gameCamera.lookAt(0, 0, 0);

    // 光照
    gameScene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir = new THREE.DirectionalLight(0xC9A96E, 0.4);
    dir.position.set(0, 1, 2);
    gameScene.add(dir);

    // 渲染循环
    const loop = () => {
      if (!arActive || currentARMode !== 'game') return;
      confettiParticles = confettiParticles.filter(p => {
        p.position.y -= 0.008;
        p.material.opacity -= 0.004;
        if (p.material.opacity <= 0) { gameScene.remove(p); return false; }
        return true;
      });
      gameRenderer.render(gameScene, gameCamera);
      requestAnimationFrame(loop);
    };
    loop();

    gameRenderer.domElement.addEventListener('click', handleGameTap);

    statusEl.textContent = '点击下方按钮开始游戏';
    document.getElementById('btn-game-start').classList.remove('hidden');
    document.getElementById('btn-game-next').classList.add('hidden');

  } catch (err) {
    console.error('Game camera error:', err);
    statusEl.textContent = '无法访问相机，请检查权限设置';
  }
}

function handleGameTap(e) {
  if (!gameEngine.isActive || !gameCamera || !gameScene) return;

  const container = document.getElementById('ar-mode-game');
  const rect = container.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, gameCamera);
  const intersects = raycaster.intersectObjects(charMeshes);
  const validHit = intersects.find(h =>
    h.object.visible && !gameEngine.selectedIndices.includes(h.object.userData.arrayIndex)
  );
  if (validHit) {
    const mesh = validHit.object;
    const result = gameEngine.selectChar(mesh.userData.arrayIndex);
    if (result) handleGameResult(result, mesh);
  }
}

function handleGameResult(result, mesh) {
  switch (result.type) {
    case 'correct':
      animateCharToSlot(mesh, result.slotIndex, result.char);
      document.getElementById('game-info').textContent = '正确！';
      break;
    case 'wrong_order':
      shakeMesh(mesh);
      document.getElementById('game-info').textContent = '顺序不对，请按正确顺序选择';
      break;
    case 'wrong_char':
      shakeMesh(mesh);
      document.getElementById('game-info').textContent = '这不是目标成语中的字，再试试';
      break;
  }
}

function animateCharToSlot(mesh, slotIndex, char) {
  mesh.material.color.set(0x4a8c5c);
  const target = 0.01;
  const step = () => {
    mesh.scale.lerp(new THREE.Vector3(target, target, target), 0.15);
    if (mesh.scale.x > 0.03) requestAnimationFrame(step);
    else {
      mesh.visible = false;
      mesh.scale.set(1, 1, 1);
      mesh.material.color.set(0xC9A96E);
      charMeshes = charMeshes.filter(m => m !== mesh);
      gameScene.remove(mesh);
    }
  };
  step();
  const slots = document.getElementById('game-slots');
  const els = slots.querySelectorAll('.slot');
  if (els[slotIndex]) { els[slotIndex].textContent = char; els[slotIndex].classList.add('filled'); }
}

function shakeMesh(mesh) {
  const orig = mesh.position.clone();
  let n = 0;
  const shake = () => {
    if (n >= 6) { mesh.position.copy(orig); return; }
    mesh.position.x = orig.x + (Math.random() - 0.5) * 0.03;
    mesh.position.y = orig.y + (Math.random() - 0.5) * 0.03;
    n++;
    setTimeout(shake, 60);
  };
  shake();
}

// ===== 游戏控制按钮 =====
document.getElementById('btn-game-start').addEventListener('click', startNewGame);
document.getElementById('btn-game-next').addEventListener('click', () => {
  clearGameScene();
  startNewGame();
});

// 游戏结束弹窗内的按钮事件（委托）
document.getElementById('game-hud').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.id === 'btn-share') {
    const idiomName = btn.dataset.idiom;
    const idiom = IDIOMS.find(i => i.name === idiomName);
    if (idiom) shareIdiom(idiom, 'game');
  }
  if (btn.id === 'btn-photo') {
    captureARPhoto();
  }
});

function startNewGame() {
  clearGameScene();
  document.getElementById('btn-game-start').classList.add('hidden');
  document.getElementById('btn-game-next').classList.add('hidden');
  document.getElementById('game-info').textContent = '';
  document.getElementById('ar-status-game').textContent = '';

  const data = gameEngine.start();
  document.getElementById('game-slots').innerHTML =
    data.idiomName.split('').map(() => '<div class="slot"></div>').join('');
  document.getElementById('game-info').textContent = '请从场景中点击正确的汉字组成成语';

  scatterChars(data.allChars);

  // 计时器更新
  gameEngine.onTimerUpdate = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    document.getElementById('game-info').textContent =
      `⏱ ${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')} | 点击正确的字组成成语`;
  };

  // 完成回调（增强版）
  gameEngine.onGameComplete = (idiom, scoreResult, newBadges) => {
    spawnConfetti();
    const t = scoreResult.time;
    const timeStr = `${Math.floor(t/60)}分${t%60}秒`;

    let badgeHTML = '';
    if (newBadges && newBadges.length > 0) {
      badgeHTML = '<div class="result-badges">' + newBadges.map(b =>
        `<span class="result-badge">${b.icon} ${b.name}</span>`
      ).join('') + '</div>';
    }

    let rankUpHTML = '';
    if (scoreResult.rankUp) {
      rankUpHTML = `<div class="result-rankup">
        🎉 段位提升！${scoreResult.oldRank.icon} ${scoreResult.oldRank.name} → ${scoreResult.newRank.icon} ${scoreResult.newRank.name}
      </div>`;
    }

    document.getElementById('game-info').textContent = '🎉 恭喜完成！';
    document.getElementById('ar-status-game').innerHTML = `
      <div class="result-idiom-name">${idiom.name}</div>
      <div class="result-idiom-pinyin">${idiom.pinyin}</div>
      <div class="result-score-detail">
        <span>⏱ ${timeStr}</span>
        <span>✅ +${scoreResult.baseScore}</span>
        ${scoreResult.speedBonus > 0 ? `<span>⚡ 速度+${scoreResult.speedBonus}</span>` : ''}
        ${scoreResult.perfectBonus > 0 ? `<span>💯 完美+${scoreResult.perfectBonus}</span>` : ''}
        <span class="result-total">总计 +${scoreResult.total}分</span>
      </div>
      ${rankUpHTML}
      ${badgeHTML}
    `;

    // 显示操作按钮
    document.getElementById('btn-game-next').classList.remove('hidden');
    const hud = document.getElementById('game-hud');

    // 添加分享和合影按钮（临时）
    let actionBtns = hud.querySelector('.game-actions');
    if (!actionBtns) {
      actionBtns = document.createElement('div');
      actionBtns.className = 'game-actions';
      hud.appendChild(actionBtns);
    }
    actionBtns.innerHTML = `
      <button class="btn-game-action" id="btn-share" data-idiom="${idiom.name}">📤 分享成就</button>
      <button class="btn-game-action" id="btn-photo">📸 AR合影</button>
    `;
  };

  // 清除之前的action buttons
  const oldActions = document.querySelector('#game-hud .game-actions');
  if (oldActions) oldActions.remove();
}

// AR合影截图
function captureARPhoto() {
  const container = document.getElementById('ar-mode-game');
  const canvas = document.createElement('canvas');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  const ctx = canvas.getContext('2d');

  // 绘制视频背景
  const video = document.getElementById('ar-video-game');
  if (video && video.readyState >= 2) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }

  // 绘制3D画布
  if (gameRenderer && gameRenderer.domElement) {
    ctx.drawImage(gameRenderer.domElement, 0, 0, canvas.width, canvas.height);
  }

  // 叠加文字信息
  if (gameEngine.currentIdiom) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
    ctx.fillStyle = '#C9A96E';
    ctx.font = 'bold 32px "KaiTi","STKaiti",serif';
    ctx.textAlign = 'center';
    ctx.fillText(gameEngine.currentIdiom.name, canvas.width/2, canvas.height - 50);
    ctx.fillStyle = '#F5F0E8';
    ctx.font = '16px sans-serif';
    ctx.fillText('—— 邯郸成语AR · 成语元宇宙 ——', canvas.width/2, canvas.height - 15);
  }

  // 保存或分享
  canvas.toBlob(blob => {
    const file = new File([blob], `AR合影_${gameEngine.currentIdiom?.name || '成语'}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare({ files: [file] })) {
      navigator.share({ title: '我的AR成语合影', files: [file] }).catch(() => {});
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      showToast('合影已保存');
    }
  }, 'image/png');
}

function scatterChars(chars) {
  charMeshes = [];
  const count = chars.length;

  // 用网格+随机偏移布局，确保字不重叠
  const positions = generatePositions(count);

  chars.forEach((cd, i) => {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#C9A96E';
    ctx.font = 'bold 80px "KaiTi","STKaiti","楷体","Microsoft YaHei",serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cd.char, 64, 64);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(mat);

    sprite.position.set(positions[i].x, positions[i].y, 0);
    sprite.scale.set(0.24, 0.24, 1);
    sprite.userData = { char: cd.char, isCorrect: cd.isCorrect, correctIndex: cd.correctIndex, arrayIndex: i };

    gameScene.add(sprite);
    charMeshes.push(sprite);
  });
}

// 随机分布，保证最小间距不重叠
function generatePositions(count) {
  const positions = [];
  const minDist = 0.35;
  const maxAttempts = 50;
  const bounds = { xMin: -0.6, xMax: 0.6, yMin: -0.7, yMax: 0.7 };

  for (let i = 0; i < count; i++) {
    let placed = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidate = {
        x: bounds.xMin + Math.random() * (bounds.xMax - bounds.xMin),
        y: bounds.yMin + Math.random() * (bounds.yMax - bounds.yMin)
      };

      // 检查与已放置位置的最小距离
      let tooClose = false;
      for (const p of positions) {
        const dx = candidate.x - p.x;
        const dy = candidate.y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < minDist) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        positions.push(candidate);
        placed = true;
        break;
      }
    }

    // 兜底：找一个离其他位置最远的点
    if (!placed) {
      let best = null;
      let bestMinDist = -1;
      for (let a = 0; a < 200; a++) {
        const c = {
          x: bounds.xMin + Math.random() * (bounds.xMax - bounds.xMin),
          y: bounds.yMin + Math.random() * (bounds.yMax - bounds.yMin)
        };
        let minD = Infinity;
        for (const p of positions) {
          const d = Math.sqrt((c.x - p.x) ** 2 + (c.y - p.y) ** 2);
          if (d < minD) minD = d;
        }
        if (minD > bestMinDist) {
          bestMinDist = minD;
          best = c;
        }
      }
      positions.push(best || { x: 0, y: 0 });
    }
  }

  return positions;
}

function randJitter(range) {
  return (Math.random() - 0.5) * 2 * range;
}

function clearGameScene() {
  charMeshes.forEach(m => gameScene.remove(m));
  charMeshes = [];
  confettiParticles.forEach(p => gameScene.remove(p));
  confettiParticles = [];
  document.getElementById('game-slots').innerHTML = '';
  document.getElementById('game-info').textContent = '';
  gameEngine.reset();
}

function spawnConfetti() {
  const colors = [0xC9A96E, 0xc23a2b, 0x4a8c5c, 0xF5F0E8, 0xd4b87a];
  for (let i = 0; i < 50; i++) {
    const geo = new THREE.PlaneGeometry(0.02 + Math.random() * 0.04, 0.02 + Math.random() * 0.04);
    const mat = new THREE.MeshBasicMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      side: THREE.DoubleSide, transparent: true, opacity: 1
    });
    const piece = new THREE.Mesh(geo, mat);
    piece.position.set((Math.random() - 0.5) * 1.2, 0.5 + Math.random() * 0.4, (Math.random() - 0.5) * 0.4);
    piece.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    gameScene.add(piece);
    confettiParticles.push(piece);
  }
}

function stopGameMode() {
  clearGameScene();
  if (gameRenderer) {
    gameRenderer.domElement.removeEventListener('click', handleGameTap);
    gameRenderer.dispose();
    gameRenderer.domElement.remove();
    gameRenderer = null;
  }
  // 释放游戏模式的摄像头
  const video = document.getElementById('ar-video-game');
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }
  gameScene = null;
  gameCamera = null;
  document.getElementById('ar-status-game').textContent = '';
}
