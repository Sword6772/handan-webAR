// ===== AR控制器：MindAR + Three.js 编排 =====

let arActive = false;
let currentARMode = 'game'; // 'game' | 'scan'
let mindarInstance = null; // MindAR实例引用
let scanLoading = false; // 防止竞态
let scanFacingMode = 'environment'; // 'environment' (后置) | 'user' (前置)
let scanVideoStream = null; // 当前扫描模式的摄像头流，用于切换摄像头

// 变量（模式一：扫典故用 — MindAR原生渲染）
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

    const timeoutId = setTimeout(() => {
      reject(new Error('AR引擎初始化超时，请检查网络或刷新重试'));
    }, 25000);
    const cleanup = () => clearTimeout(timeoutId);

    const facing = facingMode || 'environment';

    // 拦截getUserMedia：支持摄像头方向切换
    const origGetUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
    if (origGetUserMedia) {
      navigator.mediaDevices.getUserMedia = function(constraints) {
        if (constraints.video && constraints.video.facingMode === 'environment') {
          constraints = { ...constraints, video: { ...constraints.video, facingMode: facing } };
        }
        return origGetUserMedia(constraints).then(stream => {
          scanVideoStream = stream;
          return stream;
        });
      };
    }

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

    const mindarThree = new MINDAR.IMAGE.MindARThree({
      container: container,
      imageTargetSrc: 'assets/markers/targets.mind'
    });

    // 创建锚点（MindAR 追踪）
    const anchorData = [];
    IDIOMS.forEach((idiom, index) => {
      const anchor = mindarThree.addAnchor(index);
      anchorData.push({ anchor, idiom, index });
    });

    const restorePatches = () => {
      document.createElement = origCreateElement;
      if (origGetUserMedia) navigator.mediaDevices.getUserMedia = origGetUserMedia;
    };

    // 如果 mediaDevices 不可用，直接走错误流程
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      reject(new Error('设备不支持摄像头'));
      return;
    }

    mindarThree.start().then(() => {
      cleanup();
      restorePatches();

      // === 诊断：检查相机和视频流状态 ===
      var videoEl = container.querySelector('video');
      if (videoEl) {
        console.log('[诊断] 视频元素存在, srcObject=' + !!videoEl.srcObject +
          ', readyState=' + videoEl.readyState +
          ', videoWidth=' + videoEl.videoWidth +
          ', videoHeight=' + videoEl.videoHeight);
      } else {
        console.warn('[诊断] 未找到视频元素！');
      }
      var canvasEl = container.querySelector('canvas');
      if (canvasEl) {
        console.log('[诊断] Canvas元素存在, 尺寸=' + canvasEl.width + 'x' + canvasEl.height +
          ', display=' + canvasEl.style.display);
      }
      console.log('[诊断] MindAR场景子节点数=' + mindarThree.scene.children.length +
        ', 锚点数=' + anchorData.length);
      console.log('[诊断] targets.mind路径=' + 'assets/markers/targets.mind');

      // 使用 MindAR 捆绑的 Three.js，确保对象与 MindAR 渲染器兼容
      var M = MINDAR.IMAGE.THREE;

      // 隐藏 MindAR 的 UI 覆盖层（保留 canvas 和 video 用于相机背景）
      container.querySelectorAll('[class*="mindar-ui"]').forEach(function(el) { el.style.display = 'none'; });

      // 预加载卡片PNG，挂载到MindAR锚点组（MindAR自动处理定位和渲染）
      scanCards = [];
      var imagePromises = IDIOMS.map(function(idiom) {
        return new Promise(function(resolve, reject) {
          var img = new Image();
          img.onload = function() { resolve({ img: img, idiom: idiom }); };
          img.onerror = function() { reject(new Error('图片加载失败: ' + idiom.id)); };
          img.src = 'assets/images/cards/idiom-' + idiom.id + '.png';
        });
      });

      Promise.all(imagePromises).then(function(results) {
        console.log('[AR] 所有卡片图片加载完成 (' + results.length + '/' + IDIOMS.length + ')');
        results.forEach(function(item, index) {
          var anchor = anchorData[index].anchor;

          var cardCanvas = document.createElement('canvas');
          cardCanvas.width = 512; cardCanvas.height = 700;
          var ctx = cardCanvas.getContext('2d');
          ctx.drawImage(item.img, 0, 0, 512, 700);

          var texture = new M.CanvasTexture(cardCanvas);
          texture.encoding = M.sRGBEncoding;
          texture.needsUpdate = true;

          var plane = new M.Mesh(
            new M.PlaneGeometry(1.0, 1.36),
            new M.MeshBasicMaterial({ map: texture, transparent: true, side: M.DoubleSide })
          );

          var edgeLine = new M.LineSegments(
            new M.EdgesGeometry(new M.PlaneGeometry(1.0, 1.36)),
            new M.LineBasicMaterial({ color: 0xC9A96E })
          );
          plane.add(edgeLine);

          // 直接挂载到MindAR锚点组——MindAR会自动更新位置、旋转、缩放
          anchor.group.add(plane);
          scanCards.push({ group: plane, anchor: anchor, index: index });
          console.log('[AR] 卡片#' + index + ' ' + item.idiom.name + ' 已挂载到锚点');

          // 调试：在第0个卡片上加红色测试边框
          if (index === 0) {
            // 测试1: 红色立方体挂在锚点上
            var testCube = new M.Mesh(
              new M.BoxGeometry(0.3, 0.3, 0.3),
              new M.MeshBasicMaterial({ color: 0xff0000 })
            );
            testCube.position.set(0, 0, 0.5);
            anchor.group.add(testCube);
            console.log('[调试] 红色测试立方体已添加到锚点#0 (位置:0,0,0.5)');

            // 测试2: 绿色平面直接挂在场景根节点，始终可见
            var testGeo2 = new M.PlaneGeometry(0.5, 0.5);
            var testMat2 = new M.MeshBasicMaterial({ color: 0x00ff00, side: M.DoubleSide });
            var testPlane2 = new M.Mesh(testGeo2, testMat2);
            testPlane2.position.set(0, 0, -1.5);
            mindarThree.scene.add(testPlane2);
            console.log('[调试] 绿色测试平面已添加到场景根节点 (0,0,-1.5) 应始终可见');
          }
        });

        // 追踪状态更新循环（含检测日志 + 手动渲染确保3D对象可见）
        var frameCount = 0;
        (function updateGuide() {
          if (!arActive || currentARMode !== 'scan') return;
          frameCount++;
          var anyVisible = false;
          for (var i = 0; i < anchorData.length; i++) {
            if (anchorData[i].anchor.visible) { anyVisible = true; break; }
          }
          var guide = document.getElementById('scan-guide');
          if (guide) guide.style.display = anyVisible ? 'none' : 'block';

          // 手动触发渲染：确保 MindAR scene 中的 3D 对象被渲染
          // 不清理颜色缓冲，保留 MindAR 已渲染的相机背景
          if (mindarThree && mindarThree.renderer && mindarThree.scene && mindarThree.camera) {
            mindarThree.renderer.autoClear = false;
            mindarThree.renderer.render(mindarThree.scene, mindarThree.camera);
            mindarThree.renderer.autoClear = true;
          }

          // 每秒输出一次状态
          if (frameCount % 60 === 0) {
            console.log('[追踪] frame=' + frameCount + ' 任意锚点可见=' + anyVisible +
              ' scanCards=' + scanCards.length + ' 场景子节点=' + mindarThree.scene.children.length);
          }
          requestAnimationFrame(updateGuide);
        })();

        console.log('[AR] 扫描模式就绪（MindAR原生渲染管道）');
      }).catch(function(err) {
        console.error('[AR] 卡片预加载失败:', err);
      });

      mindarInstance = { mindarThree: mindarThree, anchorData: anchorData };
      resolve();
    }).catch((err) => {
      cleanup();
      restorePatches();
      reject(err);
    });
  });
}

function stopScanMode() {
  scanLoading = false;
  if (mindarInstance) {
    mindarInstance.mindarThree.stop();
    mindarInstance = null;
  }
  if (scanVideoStream) {
    scanVideoStream.getTracks().forEach(track => track.stop());
    scanVideoStream = null;
  }
  scanCards = [];
  // 清理 MindAR 创建的 DOM 元素
  document.querySelectorAll('[class*="mindar-ui"]').forEach(el => el.remove());
  const container = document.getElementById('ar-mode-scan');
  if (container) {
    container.querySelectorAll('video, canvas').forEach(el => el.remove());
  }
  document.getElementById('ar-status-scan').textContent = '';
  document.getElementById('scan-guide').style.display = 'none';
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
