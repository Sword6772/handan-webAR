// ===== AI成语先生对话 =====

const aiModal = document.getElementById('ai-modal');
const aiMessages = document.getElementById('ai-messages');
const aiInput = document.getElementById('ai-input');
const aiSend = document.getElementById('ai-send');
const aiOverlay = document.getElementById('ai-overlay');
const aiClose = document.getElementById('ai-close');
const aiPresets = document.getElementById('ai-presets');

let currentIdiomContext = null; // 当前正在查看的成语
let isAiLoading = false;

// API配置 — 使用DeepSeek免费API
const AI_API_KEY = ''; // 用户可填入自己的API Key
const AI_API_URL = 'https://api.deepseek.com/chat/completions';
const AI_MODEL = 'deepseek-chat';

function openAIChat(idiom) {
  currentIdiomContext = idiom;
  aiModal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // 重置对话
  aiMessages.innerHTML = `
    <div class="ai-msg bot">你好！我是AI成语先生，你可以问我任何关于「${idiom ? idiom.name : '邯郸成语'}」的问题。</div>
  `;

  // 更新预设问题
  aiPresets.innerHTML = `
    <button class="ai-preset" data-q="帮我介绍一下「${idiom ? idiom.name : '这个成语'}」的故事">📖 讲个故事</button>
    <button class="ai-preset" data-q="用小朋友能听懂的话解释「${idiom ? idiom.name : '这个成语'}」">👶 儿童版</button>
    <button class="ai-preset" data-q="「${idiom ? idiom.name : '这个成语'}」教会我们什么道理">💡 成语道理</button>
  `;

  aiInput.focus();
}

function closeAIChat() {
  aiModal.classList.remove('open');
  document.body.style.overflow = '';
  currentIdiomContext = null;
}

aiOverlay.addEventListener('click', closeAIChat);
aiClose.addEventListener('click', closeAIChat);

// 发送消息
async function sendAIMessage(question) {
  if (isAiLoading) return;
  const text = question || aiInput.value.trim();
  if (!text) return;

  aiInput.value = '';

  // 添加用户消息
  appendMessage('user', text);

  // 检查API Key
  if (!AI_API_KEY) {
    // 本地模拟模式
    appendMessage('loading', '思考中...');
    await sleep(800 + Math.random() * 1200);
    removeLoading();
    const reply = generateLocalReply(text);
    appendMessage('bot', reply);
    return;
  }

  // 真实API调用
  appendMessage('loading', '思考中...');
  try {
    const reply = await callAIAPI(text);
    removeLoading();
    appendMessage('bot', reply);
  } catch (err) {
    removeLoading();
    appendMessage('bot', '抱歉，AI服务暂时不可用，请稍后再试。');
    console.error('AI API error:', err);
  }
}

function appendMessage(role, text) {
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;
  div.textContent = text;
  aiMessages.appendChild(div);
  aiMessages.scrollTop = aiMessages.scrollHeight;
}

function removeLoading() {
  const loading = aiMessages.querySelector('.ai-msg.loading');
  if (loading) loading.remove();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 本地模拟回复（无API Key时使用）
function generateLocalReply(question) {
  const ctx = currentIdiomContext;
  const q = question.toLowerCase();

  if (ctx) {
    if (q.includes('故事') || q.includes('介绍')) {
      return ctx.story + '\n\n这个成语出自' + ctx.source + '，是邯郸成语文化的经典代表之一。';
    }
    if (q.includes('儿童') || q.includes('小朋友') || q.includes('简单')) {
      const shortStory = ctx.story.length > 200 ? ctx.story.substring(0, 200) + '...' : ctx.story;
      return '小朋友们好！🌟\n\n' + ctx.name + '的意思是：' + ctx.meaning + '\n\n故事是这样的：' + shortStory + '\n\n记住哦，这个成语告诉我们：每个成语背后都有一个有趣的故事！';
    }
    if (q.includes('道理') || q.includes('教会') || q.includes('启示')) {
      return '「' + ctx.name + '」给我们最大的启示就藏在它的释义中：' + ctx.meaning + '\n\n这个成语出自' + ctx.source + '，经过了千年的流传，至今仍然闪烁着智慧的光芒。在生活中，我们可以从这个故事中汲取古人的经验教训。';
    }
    if (q.includes('拼音') || q.includes('怎么读')) {
      return '「' + ctx.name + '」的拼音是：' + ctx.pinyin;
    }
    if (q.includes('出处') || q.includes('来源')) {
      return '「' + ctx.name + '」出自：' + ctx.source;
    }
  }

  // 通用回复
  if (q.includes('邯郸')) {
    return '邯郸是中国成语典故之乡，有超过1500条成语与邯郸有关。像"邯郸学步"、"完璧归赵"、"黄粱一梦"等都发生在邯郸。邯郸位于河北省南部，是战国时期赵国的都城，历史文化底蕴非常深厚！';
  }
  if (q.includes('成语') && q.includes('最多')) {
    return '邯郸被誉为"中国成语典故之都"，据考证与邯郸相关的成语典故多达1584条！其中最著名的包括邯郸学步、完璧归赵、负荆请罪、黄粱一梦、毛遂自荐等。';
  }
  if (q.includes('你好') || q.includes('嗨')) {
    return '你好！我是AI成语先生，很高兴和你聊成语。你可以问我任何关于邯郸成语的问题，比如让我讲个故事，或者解释某个成语的含义。';
  }

  return '这是个好问题！关于"' + question + '"，建议你到文化介绍页面查看详细的成语典故。你也可以试试问我"给我讲个故事"或者"这个成语是什么意思"哦！';
}

async function callAIAPI(question) {
  const messages = [
    {
      role: 'system',
      content: '你是"AI成语先生"，一个专注于邯郸成语文化的智能助手。你博学多才，能用通俗易懂的方式讲解成语典故。回答时请使用中文，语气亲切自然，适当引用历史背景。如果用户询问的成语你不知道，可以推荐相关的邯郸成语。'
    }
  ];

  if (currentIdiomContext) {
    messages.push({
      role: 'system',
      content: `用户正在查看成语「${currentIdiomContext.name}」(${currentIdiomContext.pinyin})。释义：${currentIdiomContext.meaning}。出处：${currentIdiomContext.source}。故事：${currentIdiomContext.story}`
    });
  }

  messages.push({ role: 'user', content: question });

  const response = await fetch(AI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_API_KEY}`
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 800
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// 事件绑定
aiSend.addEventListener('click', () => sendAIMessage());

aiInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendAIMessage();
  }
});

aiPresets.addEventListener('click', (e) => {
  const btn = e.target.closest('.ai-preset');
  if (!btn) return;
  sendAIMessage(btn.dataset.q);
});
