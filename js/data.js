// ===== 成语与文化内容数据 =====

const IDIOMS = [
  {
    id: 'han-dan-xue-bu',
    name: '邯郸学步',
    chars: ['邯','郸','学','步'],
    pinyin: 'hán dān xué bù',
    meaning: '比喻模仿别人不成，反而丧失了原有的本领',
    story: '战国时期，燕国寿陵有个少年，听说赵国都城邯郸的人走路姿势特别优美，便不远千里来到邯郸学习走路。他每天在街上模仿邯郸人的步伐，学了几个月，不但没有学会邯郸人的步法，反而把自己原来的走路方式也忘记了。最后，他只好爬着回到了燕国。这个故事告诉我们，向别人学习要有选择，不能盲目模仿，否则不仅学不到别人的长处，还会丢失自己的本色。',
    source: '《庄子·秋水》',
    difficulty: 1,
    distractors: ['单','舟','雪','布'],
    targetFile: 'target-han-dan-xue-bu.jpg',
    illustration: 'illu-han-dan-xue-bu.jpg'
  },
  {
    id: 'wan-bi-gui-zhao',
    name: '完璧归赵',
    chars: ['完','璧','归','赵'],
    pinyin: 'wán bì guī zhào',
    meaning: '比喻把原物完整无缺地归还本人',
    story: '战国时期，赵惠文王得到了一块稀世珍宝——和氏璧。秦昭襄王听说后，提出用十五座城池换取和氏璧。赵王担心秦国不守信用，蔺相如主动请缨出使秦国。在秦国朝堂上，蔺相如见秦王得到和氏璧后绝口不提交换城池的事，便机智地取回和氏璧，以撞柱相威胁，要求秦王先交割城池。秦王无奈，只好答应斋戒五日再行交换。蔺相如料定秦王不会履约，秘密派人将和氏璧送回赵国。蔺相如不辱使命，将和氏璧完整无缺地带回了赵国。',
    source: '《史记·廉颇蔺相如列传》',
    difficulty: 1,
    distractors: ['全','壁','贵','走'],
    targetFile: 'target-wan-bi-gui-zhao.jpg',
    illustration: 'illu-wan-bi-gui-zhao.jpg'
  },
  {
    id: 'fu-jing-qing-zui',
    name: '负荆请罪',
    chars: ['负','荆','请','罪'],
    pinyin: 'fù jīng qǐng zuì',
    meaning: '形容主动向人认错赔罪，诚意十足',
    story: '蔺相如因"完璧归赵"和"渑池之会"立下大功，被赵王封为上卿，地位在大将军廉颇之上。廉颇对此十分不满，扬言要当面羞辱蔺相如。蔺相如听说后，处处回避廉颇，门客们都以为他胆小怕事。蔺相如解释说："我连秦王都不怕，怎么会怕廉将军？秦国之所以不敢攻打赵国，就是因为有我和廉将军在。如果我们将相不和，秦国必定乘虚而入。"廉颇听说后深感惭愧，脱去上衣，背上荆条，亲自到蔺相如府上请罪。从此，两人成为刎颈之交，共同保卫赵国。',
    source: '《史记·廉颇蔺相如列传》',
    difficulty: 1,
    distractors: ['赴','京','清','最'],
    targetFile: 'target-fu-jing-qing-zui.jpg',
    illustration: 'illu-fu-jing-qing-zui.jpg'
  },
  {
    id: 'huang-liang-yi-meng',
    name: '黄粱一梦',
    chars: ['黄','粱','一','梦'],
    pinyin: 'huáng liáng yī mèng',
    meaning: '比喻虚幻不实的事和欲望的破灭，像一场梦',
    story: '唐代，有个叫卢生的书生在邯郸旅店遇见道士吕翁。卢生感叹自己贫穷，吕翁拿出一个青瓷枕头让他枕着睡觉。卢生梦见自己娶了名门千金，考中进士，官至宰相，子孙满堂，享尽荣华富贵。然而一觉醒来，店主的黄粱米饭还没有煮熟。吕翁笑着说："人生不过如此啊。"卢生恍然大悟，放弃了追求功名利禄的念头。',
    source: '唐·沈既济《枕中记》',
    difficulty: 2,
    distractors: ['皇','梁','衣','孟'],
    targetFile: 'target-huang-liang-yi-meng.jpg',
    illustration: 'illu-huang-liang-yi-meng.jpg'
  },
  {
    id: 'mao-sui-zi-jian',
    name: '毛遂自荐',
    chars: ['毛','遂','自','荐'],
    pinyin: 'máo suì zì jiàn',
    meaning: '比喻自告奋勇，自我推荐',
    story: '战国时期，秦国攻打赵国，平原君赵胜奉命去楚国求援。他想从门客中挑选二十名文武兼备的随从，但只选出了十九人。这时，门客毛遂走上前来自我推荐。平原君说："有才能的人就像锥子放在布袋里，马上就会冒出来。你在我门下三年了，我却没听说过你。"毛遂回答："我今天就是请求您把我放进布袋里。如果我早被放进布袋，早就脱颖而出了。"平原君于是带上了他。到了楚国，正是毛遂的慷慨陈词说服了楚王出兵救赵。',
    source: '《史记·平原君虞卿列传》',
    difficulty: 2,
    distractors: ['手','随','字','存'],
    targetFile: 'target-mao-sui-zi-jian.jpg',
    illustration: 'illu-mao-sui-zi-jian.jpg'
  },
  {
    id: 'zhi-shang-tan-bing',
    name: '纸上谈兵',
    chars: ['纸','上','谈','兵'],
    pinyin: 'zhǐ shàng tán bīng',
    meaning: '比喻空谈理论，不能解决实际问题',
    story: '战国时，赵国名将赵奢的儿子赵括从小熟读兵书，谈论起军事来头头是道，连父亲都辩不过他。但赵奢认为儿子只会纸上谈兵，没有实战经验。后来秦国攻打赵国，赵国老将廉颇采取坚守策略。秦国使用反间计，让赵王用赵括替换廉颇。赵括上任后，完全改变廉颇的策略，盲目出击，结果被秦将白起包围。在长平之战中，赵括战死，四十万赵军被俘。这是中国历史上最惨烈的战役之一。',
    source: '《史记·廉颇蔺相如列传》',
    difficulty: 2,
    distractors: ['止','下','淡','并'],
    targetFile: 'target-zhi-shang-tan-bing.jpg',
    illustration: 'illu-zhi-shang-tan-bing.jpg'
  },
  {
    id: 'wei-wei-jiu-zhao',
    name: '围魏救赵',
    chars: ['围','魏','救','赵'],
    pinyin: 'wéi wèi jiù zhào',
    meaning: '比喻通过间接的方式达到目的',
    story: '战国时期，魏国大将庞涓率军围攻赵国都城邯郸。赵国向齐国求救，齐王派田忌和孙膑率军救援。孙膑认为魏国精锐都在赵国前线，魏国都城大梁必然空虚，不如直接攻打大梁，庞涓必定回师救援，这样既解了邯郸之围，又能在途中截击魏军。田忌采纳了这个建议。庞涓果然撤军回援，在桂陵被齐军伏击大败。这就是著名的"围魏救赵"战术，后来成为三十六计之一。',
    source: '《史记·孙子吴起列传》',
    difficulty: 2,
    distractors: ['为','未','求','超'],
    targetFile: 'target-wei-wei-jiu-zhao.jpg',
    illustration: 'illu-wei-wei-jiu-zhao.jpg'
  },
  {
    id: 'yi-yan-jiu-ding',
    name: '一言九鼎',
    chars: ['一','言','九','鼎'],
    pinyin: 'yī yán jiǔ dǐng',
    meaning: '形容说话极有分量，一句话抵得上九鼎的重量',
    story: '毛遂随平原君出使楚国，在楚国朝堂上，平原君与楚王从早晨谈到中午，楚王仍犹豫不决。毛遂按剑走上前去，对楚王慷慨陈词，分析合纵抗秦的利害关系。楚王被毛遂的气势和道理所折服，当场答应了合纵之约。平原君回到赵国后赞叹道："毛先生一至楚，而使赵重于九鼎大吕。"意思是毛遂的一番话，使赵国的地位比九鼎还要重。九鼎是夏商周三代传国之宝，是天子威仪的象征。',
    source: '《史记·平原君虞卿列传》',
    difficulty: 2,
    distractors: ['二','严','酒','顶'],
    targetFile: 'target-yi-yan-jiu-ding.jpg',
    illustration: 'illu-yi-yan-jiu-ding.jpg'
  },
  {
    id: 'jia-zhi-lian-cheng',
    name: '价值连城',
    chars: ['价','值','连','城'],
    pinyin: 'jià zhí lián chéng',
    meaning: '形容物品极为珍贵，价值相当于多座城池',
    story: '战国时期，赵国得到了闻名天下的和氏璧。这块玉璧晶莹剔透，毫无瑕疵，是举世无双的珍宝。秦昭襄王得知后，派使者到赵国，提出用十五座城池来交换和氏璧。一块玉璧竟然价值十五座城池，可见其珍贵程度。后来这个故事衍生了两个成语："价值连城"形容物品极其珍贵，"完璧归赵"则来自蔺相如护送和氏璧安全回到赵国的后续故事。',
    source: '《史记·廉颇蔺相如列传》',
    difficulty: 2,
    distractors: ['介','直','联','成'],
    targetFile: 'target-jia-zhi-lian-cheng.jpg',
    illustration: 'illu-jia-zhi-lian-cheng.jpg'
  },
  {
    id: 'yu-bang-xiang-zheng',
    name: '鹬蚌相争',
    chars: ['鹬','蚌','相','争'],
    pinyin: 'yù bàng xiāng zhēng',
    meaning: '比喻双方争斗，让第三方得利',
    story: '战国时，赵国打算攻打燕国。燕国派苏代去劝说赵惠文王。苏代讲了一个寓言：一只河蚌在河边晒太阳，一只鹬鸟飞过来啄食蚌肉。河蚌合起壳夹住了鹬鸟的嘴，双方互不相让。渔夫经过，轻松地把它们都捉走了。苏代说："如果赵燕相争，强大的秦国就会像渔夫一样，坐收渔翁之利。"赵惠文王听后，放弃了攻打燕国的计划。',
    source: '《战国策·燕策二》',
    difficulty: 2,
    distractors: ['鱼','丰','想','争'],
    targetFile: 'target-yu-bang-xiang-zheng.jpg',
    illustration: 'illu-yu-bang-xiang-zheng.jpg'
  },
  {
    id: 'jing-gong-zhi-niao',
    name: '惊弓之鸟',
    chars: ['惊','弓','之','鸟'],
    pinyin: 'jīng gōng zhī niǎo',
    meaning: '比喻受过惊吓的人遇到类似情况就害怕',
    story: '战国时，魏国神射手更羸和魏王在京台之下看见一只大雁。更羸说："我只需拉一下空弓，就能把这只大雁射下来。"魏王不信。更羸对着大雁拉动弓弦，大雁果然应声落下。魏王惊叹不已。更羸解释说："这只大雁飞得很慢，叫声凄惨，说明它受过箭伤且离群已久。听到弓弦声，它惊恐地猛力高飞，结果旧伤裂开，就掉下来了。"这个故事展现了更羸细心观察和推理的能力。',
    source: '《战国策·楚策四》',
    difficulty: 3,
    distractors: ['京','公','只','乌'],
    targetFile: 'target-jing-gong-zhi-niao.jpg',
    illustration: 'illu-jing-gong-zhi-niao.jpg'
  },
  {
    id: 'po-fu-chen-zhou',
    name: '破釜沉舟',
    chars: ['破','釜','沉','舟'],
    pinyin: 'pò fǔ chén zhōu',
    meaning: '比喻下定决心，决一死战，不留退路',
    story: '秦朝末年，秦军围攻赵国巨鹿。项羽率军前去救援，渡过漳河后，他下令将渡船全部凿沉，将煮饭的锅全部砸破，将营房全部烧毁，每人只带三天的干粮。将士们见退路已断，只有奋勇杀敌才能求生，于是以一当十，大败秦军。巨鹿之战后，项羽威震天下，各路诸侯无不服膺。这个故事成为"破釜沉舟"的典故，也成为中国军事史上"置之死地而后生"的经典战例。',
    source: '《史记·项羽本纪》',
    difficulty: 3,
    distractors: ['波','金','沈','州'],
    targetFile: 'target-po-fu-chen-zhou.jpg',
    illustration: 'illu-po-fu-chen-zhou.jpg'
  }
];

// ===== 邯郸名胜景点数据 =====
const ATTRACTIONS = [
  {
    id: 'congtai',
    name: '丛台公园',
    desc: '赵武灵王"胡服骑射"的点将台，邯郸千年历史的象征',
    detail: '丛台又称武灵丛台，位于邯郸市中心丛台公园内，始建于战国赵武灵王时期（公元前325-前299年），是赵武灵王观看军事操练和歌舞表演的地方。丛台高约26米，台上有据胜亭等古建筑，登台可俯瞰邯郸全城。丛台之名取"连聚非一"之意，因当时是由许多高台连接而成得名。现存丛台为清代同治年间重修，是全国重点文物保护单位。唐代大诗人李白、杜甫等都曾登临丛台并留下诗篇。',
    image: 'attr-congtai.jpg'
  },
  {
    id: 'wahuang-palace',
    name: '娲皇宫',
    desc: '中国最大的女娲祭祀地，悬挂于峭壁之上的建筑奇观',
    detail: '娲皇宫位于邯郸市涉县中皇山悬崖之上，始建于北齐（公元550-577年），是为祭祀华夏始祖女娲而建。整个建筑群依山而建，悬挂于悬崖峭壁之间，被誉为"活楼吊庙"。主殿娲皇阁高23米，共四层。娲皇宫不仅是全国重点文物保护单位，也是国家5A级旅游景区。每年农历三月初一至三月十八的娲皇庙会吸引大量游客和香客。女娲"炼石补天"的神话传说就源于此地。',
    image: 'attr-wahuang-palace.jpg'
  },
  {
    id: 'jingniang-lake',
    name: '京娘湖',
    desc: '太行山中的碧水明珠，流传着赵匡胤千里送京娘的传说',
    detail: '京娘湖位于邯郸市武安市西北部太行山深处，是一座山谷型水库。湖名来源于宋太祖赵匡胤千里送京娘的美丽传说：赵匡胤年轻时曾护送被山贼掳走的女子京娘回家，两人一路患难与共。京娘湖水面面积约3平方公里，湖水清澈，周围群山环抱，峰峦叠嶂，有"太行三峡"之美誉。景区内有京娘祠、宋祖峰、一线天等景点，是国家4A级旅游景区。',
    image: 'attr-jingniang-lake.jpg'
  },
  {
    id: 'xiangtangshan',
    name: '响堂山石窟',
    desc: '北齐皇家石窟，中国北方佛教石窟艺术的代表',
    detail: '响堂山石窟位于邯郸市峰峰矿区，分为南响堂和北响堂两处，始凿于北齐时期（公元550-577年）。石窟因人们在山谷中行走谈笑会发出回声而得名。现存洞窟16座，大小造像4300余尊，是研究中国佛教艺术和北齐历史的重要实物资料。北响堂大佛洞高12.5米，是响堂山最大的洞窟。响堂山石窟是全国重点文物保护单位，与云冈石窟、龙门石窟并称为中国北方三大石窟群。',
    image: 'attr-xiangtangshan.jpg'
  },
  {
    id: 'zhao-royal-city',
    name: '赵王城遗址',
    desc: '战国七雄赵国都城的遗迹，见证千年辉煌',
    detail: '赵王城遗址位于邯郸市西南部，是战国时期赵国都城邯郸的宫城遗址。赵王城始建于公元前386年赵敬侯迁都邯郸之时，历经八代国君，延续了158年。遗址由东城、西城和北城三部分组成，总面积约512万平方米。现存的主要遗迹有龙台（宫殿基址，高约16米），以及城墙、城门、道路等遗迹。赵王城遗址是全国重点文物保护单位，被列入国家考古遗址公园立项名单。',
    image: 'attr-zhao-royal-city.jpg'
  },
  {
    id: 'guangfu-ancient-city',
    name: '广府古城',
    desc: '华北保存最完整的古代水城，太极文化的发源地',
    detail: '广府古城位于邯郸市永年区，始建于隋唐时期，是华北地区保存最完整的古代水城。古城四面环水，城墙周长约4.5公里，高12米，宽8米，有四座城门。城内保留着众多明清古建筑和传统街巷。广府古城是杨式太极拳和武式太极拳的发源地，素有"太极拳之乡"的美誉，每年吸引大量太极拳爱好者前来寻根问祖。广府古城为国家5A级旅游景区，是了解中国古代城市格局和太极文化的绝佳去处。',
    image: 'attr-guangfu-ancient-city.jpg'
  }
];

// ===== 积分与段位系统 =====
const RANKS = [
  { name: '成语小白', minScore: 0, maxScore: 99, icon: '🌱', color: '#a0a0a0' },
  { name: '成语学徒', minScore: 100, maxScore: 299, icon: '📖', color: '#8a7a5a' },
  { name: '成语秀才', minScore: 300, maxScore: 599, icon: '🎓', color: '#4a8c5c' },
  { name: '成语达人', minScore: 600, maxScore: 999, icon: '⭐', color: '#d4b87a' },
  { name: '成语大师', minScore: 1000, maxScore: 1999, icon: '👑', color: '#C9A96E' },
  { name: '成语至尊', minScore: 2000, maxScore: Infinity, icon: '🏆', color: '#c23a2b' }
];

// 数字徽章定义
const BADGES = [
  { id: 'first_win', name: '初出茅庐', desc: '首次拼出成语', icon: '🎯' },
  { id: 'five_wins', name: '小有所成', desc: '累计拼出5个成语', icon: '✨' },
  { id: 'all_idioms', name: '学富五车', desc: '解锁全部12个成语', icon: '📚' },
  { id: 'perfect', name: '一字不差', desc: '零失误拼出一个成语', icon: '💯' },
  { id: 'speed_demon', name: '出口成章', desc: '30秒内拼出一个成语', icon: '⚡' },
  { id: 'ten_wins', name: '成语高手', desc: '累计拼出10个成语', icon: '🌟' },
  { id: 'checkin_3', name: '邯郸游客', desc: '打卡3个景点', icon: '📍' },
  { id: 'checkin_all', name: '走遍邯郸', desc: '打卡全部6个景点', icon: '🗺️' }
];

// 虚拟商品定义
const SHOP_ITEMS = [
  { id: 'coupon_10', name: '景区门票9折券', cost: 200, icon: '🎫', type: 'coupon' },
  { id: 'coupon_20', name: '文创商品8折券', cost: 300, icon: '🎁', type: 'coupon' },
  { id: 'badge_digital', name: '限定数字徽章', cost: 500, icon: '💎', type: 'badge' },
  { id: 'vip_card', name: 'VIP体验卡', cost: 800, icon: '👑', type: 'vip' }
];
