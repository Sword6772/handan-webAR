"""预生成12张成语3D卡片PNG"""
import os, sys, json, textwrap
from PIL import Image, ImageDraw, ImageFont

# 成语数据（从 js/data.js 提取）
idioms = [
  {"id":"han-dan-xue-bu","name":"邯郸学步","pinyin":"hán dān xué bù","meaning":"比喻模仿别人不成，反而丧失了原有的本领","story":"战国时期，燕国寿陵有个少年，听说赵国都城邯郸的人走路姿势特别优美，便不远千里来到邯郸学习走路。他每天在街上模仿邯郸人的步伐，学了几个月，不但没有学会邯郸人的步法，反而把自己原来的走路方式也忘记了。最后，他只好爬着回到了燕国。这个故事告诉我们，向别人学习要有选择，不能盲目模仿，否则不仅学不到别人的长处，还会丢失自己的本色。","source":"《庄子·秋水》"},
  {"id":"wan-bi-gui-zhao","name":"完璧归赵","pinyin":"wán bì guī zhào","meaning":"比喻把原物完整无缺地归还本人","story":"战国时期，赵惠文王得到了一块稀世珍宝——和氏璧。秦昭襄王听说后，提出用十五座城池换取和氏璧。赵王担心秦国不守信用，蔺相如主动请缨出使秦国。在秦国朝堂上，蔺相如见秦王得到和氏璧后绝口不提交换城池的事，便机智地取回和氏璧，以撞柱相威胁，要求秦王先交割城池。秦王无奈，只好答应斋戒五日再行交换。蔺相如料定秦王不会履约，秘密派人将和氏璧送回赵国。","source":"《史记·廉颇蔺相如列传》"},
  {"id":"fu-jing-qing-zui","name":"负荆请罪","pinyin":"fù jīng qǐng zuì","meaning":"比喻主动向人认错赔罪，请求责罚","story":"战国时期，赵国有两位重臣——蔺相如和廉颇。蔺相如因完璧归赵和渑池之会有功，被拜为上卿，位在廉颇之上。廉颇不服，扬言要羞辱蔺相如。蔺相如听说后，处处避让廉颇。门客不解，蔺相如解释说：秦国之所以不敢攻打赵国，是因为有我和廉将军在。如果我们将相不和，秦国就会有机可乘。廉颇听说后，深感惭愧，脱去上衣，背着荆条，到蔺相如府上请罪。两人从此成为刎颈之交。","source":"《史记·廉颇蔺相如列传》"},
  {"id":"huang-liang-yi-meng","name":"黄粱一梦","pinyin":"huáng liáng yī mèng","meaning":"比喻虚幻不实的事和欲望的破灭就像一场梦","story":"唐代，有个叫卢生的书生在邯郸客店遇见道士吕翁。卢生感叹自己穷困潦倒，吕翁便借给他一个青瓷枕。卢生枕着枕头入睡，梦见自己中了进士，做了大官，娶了美貌妻子，享尽荣华富贵。然而一觉醒来，店家的黄粱米饭还没有煮熟。吕翁说：人生也不过如此啊。卢生恍然大悟，拜谢而去。","source":"唐·沈既济《枕中记》"},
  {"id":"jia-zhi-lian-cheng","name":"价值连城","pinyin":"jià zhí lián chéng","meaning":"形容物品极为珍贵，价值极高","story":"这个成语也出自和氏璧的故事。秦王为了得到和氏璧，提出用十五座城池来交换。因此后人用价值连城来形容极其珍贵的东西。和氏璧后来被秦始皇制成传国玉玺，成为中国历史上最有名的玉器。","source":"《史记·廉颇蔺相如列传》"},
  {"id":"mao-sui-zi-jian","name":"毛遂自荐","pinyin":"máo suì zì jiàn","meaning":"比喻自告奋勇，自己推荐自己去担任某项工作","story":"战国时期，秦国攻打赵国，平原君赵胜奉命出使楚国求援。他要在门客中挑选二十名文武兼备的随从，选了十九人后还差一人。门客毛遂主动自荐，平原君说：有才能的人就像锥子放在口袋里，锥尖很快就会露出来。你在我的门下三年了，我怎么没听说过你的才能？毛遂回答说：那是因为你没有把我放进过口袋里。后来在楚国朝堂上，毛遂按剑上前，慷慨陈词，说服了楚王合纵抗秦。","source":"《史记·平原君虞卿列传》"},
  {"id":"po-fu-chen-zhou","name":"破釜沉舟","pinyin":"pò fǔ chén zhōu","meaning":"比喻下决心不顾一切地干到底","story":"秦末，项羽率领楚军北上救援巨鹿。渡过漳河后，项羽下令烧毁所有营帐，凿沉所有渡船，砸碎所有饭锅（破釜沉舟），每人只带三天干粮。这一举动表明了他们有进无退、不胜不归的决心。楚军士气大振，以一当十，大败秦军。这就是历史上著名的巨鹿之战。","source":"《史记·项羽本纪》"},
  {"id":"yi-yan-jiu-ding","name":"一言九鼎","pinyin":"yī yán jiǔ dǐng","meaning":"形容说话极有分量，一句话抵得上九鼎的重量","story":"九鼎是古代象征国家政权的传国之宝。战国时期，秦国进攻周王朝，索要九鼎。周王室向齐国求救，齐国出兵解围，条件是要借九鼎一用。周臣颜率对齐王说：我们愿意把九鼎借给齐国，但是九鼎很重，每个需要数万人才能搬动，不知道齐国打算从哪条路运走呢？齐王想了想，觉得搬运九鼎确实困难，便作罢了。后来人们用一言九鼎形容说话极有分量。","source":"《史记·平原君虞卿列传》"},
  {"id":"wei-wei-jiu-zhao","name":"围魏救赵","pinyin":"wéi wèi jiù zhào","meaning":"比喻袭击敌人后方据点以迫使进攻之敌撤退的战术","story":"战国时期，魏国大将庞涓率军攻打赵国都城邯郸。赵国向齐国求救，齐威王派田忌为大将、孙膑为军师出兵援救。孙膑建议：魏国精锐都在攻打邯郸，国内空虚，我们不如直接攻打魏国都城大梁。庞涓听说大梁被围，一定会撤兵回救，我们就可以在半路截击。田忌采纳了这个计策。庞涓果然放弃邯郸回师，在桂陵被齐军伏击，大败而归。这就是三十六计中的围魏救赵。","source":"《史记·孙子吴起列传》"},
  {"id":"yu-bang-xiang-zheng","name":"鹬蚌相争","pinyin":"yù bàng xiāng zhēng","meaning":"比喻双方争执不下，两败俱伤，让第三者占了便宜","story":"战国时期，赵国准备攻打燕国。燕国派使者苏代去见赵惠文王，讲了一个故事：我来的时候经过易水，看见一只河蚌张开贝壳晒太阳，一只鹬鸟飞来啄食蚌肉。河蚌连忙合起贝壳夹住鹬鸟的嘴。鹬鸟说要三天不下雨就有死蚌了，河蚌说今天不放明天不放就有死鹬了。两个谁也不肯让步。这时一个渔夫走来，毫不费力地把它们都捉住了。赵王听了，便取消了攻打燕国的计划。","source":"《战国策·燕策二》"},
  {"id":"jing-gong-zhi-niao","name":"惊弓之鸟","pinyin":"jīng gōng zhī niǎo","meaning":"比喻受过惊吓的人遇到一点动静就非常害怕","story":"战国时期，魏国更羸陪魏王散步，看见一只大雁飞来。更羸对魏王说：我不用箭，只要拉一下弓弦就能把那只大雁射下来。魏王不信。更羸拉开弓，只拉了一下弓弦，那只大雁果然掉了下来。魏王很惊讶，更羸解释说：这只大雁飞得很慢，叫声很悲，说明它受过箭伤，而且脱离了雁群。听到弓弦声，它害怕极了，使劲高飞，结果伤口裂开，掉了下来。","source":"《战国策·楚策四》"},
  {"id":"zhi-shang-tan-bing","name":"纸上谈兵","pinyin":"zhǐ shàng tán bīng","meaning":"比喻空谈理论，不能解决实际问题","story":"战国时期，赵国名将赵奢的儿子赵括，从小熟读兵书，谈论起兵法来头头是道，连他父亲赵奢也说不过他。但赵奢对妻子说：战争是你死我活的事，赵括却把它说得太容易了。将来赵国不用赵括为将还好，如果用他为将，赵国一定会断送在他手里。后来秦赵长平之战时，赵王中了秦国的反间计，用赵括替换了老将廉颇。赵括到任后改变原来的防御策略，结果被秦将白起打得大败，四十万赵军被活埋。","source":"《史记·廉颇蔺相如列传》"},
]

W, H = 512, 700

# 字体路径（Windows系统字体）
def find_font(name, size):
    """尝试多种字体路径"""
    candidates = [
        f"C:/Windows/Fonts/{name}.ttf",
        f"C:/Windows/Fonts/{name}.ttc",
        "C:/Windows/Fonts/simsun.ttc",
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simhei.ttf",
        "C:/Windows/Fonts/STKAITI.TTF",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except:
                continue
    return ImageFont.load_default()

font_name = find_font("STKAITI", 68)  # 楷体
font_pinyin = find_font("msyh", 26)   # 微软雅黑
font_meaning = find_font("msyh", 24)
font_story = find_font("msyh", 18)
font_source = find_font("simsun", 15)

# 如果楷体太大找不到，回退
if not hasattr(font_name, 'getbbox'):
    # 尝试其他楷体路径
    for fp in ["C:/Windows/Fonts/KaiTi.ttf", "C:/Windows/Fonts/kaiti.ttf", "C:/Windows/Fonts/SIMKAI.TTF"]:
        if os.path.exists(fp):
            try:
                font_name = ImageFont.truetype(fp, 68)
                break
            except:
                continue

def draw_card(idiom):
    img = Image.new('RGBA', (W, H), (26, 20, 16, 255))  # #1a1410

    d = ImageDraw.Draw(img)

    # 金色外边框
    d.rectangle([10, 10, W-11, H-11], outline=(201, 169, 110, 255), width=6)

    # 内边框
    d.rectangle([20, 20, W-21, H-21], outline=(201, 169, 110, 51), width=1)

    # 成语名 - 居中
    draw_center_text(d, idiom['name'], font_name, W//2, 100, (201, 169, 110, 255))

    # 拼音
    draw_center_text(d, idiom['pinyin'], font_pinyin, W//2, 165, (138, 122, 90, 255))

    # 分隔线
    d.line([(80, 215), (W-80, 215)], fill=(201, 169, 110, 64), width=1)

    # 释义（自动换行）
    y = 240
    y = draw_wrapped(d, idiom['meaning'], font_meaning, W//2, y, W-80, 36, (245, 240, 232, 255))

    y += 10
    # 典故故事（截断）
    story = idiom['story'][:160] + '...' if len(idiom['story']) > 160 else idiom['story']
    y = draw_wrapped(d, story, font_story, W//2, y, W-80, 28, (245, 240, 232, 153))

    # 出处
    draw_center_text(d, '—— ' + idiom['source'], font_source, W//2, H-40, (245, 240, 232, 77))

    return img

def draw_center_text(draw, text, font, x, y, color):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text((x - tw//2, y), text, font=font, fill=color)

def draw_wrapped(draw, text, font, cx, start_y, max_width, line_height, color):
    y = start_y
    line = ''
    for ch in text:
        test = line + ch
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] > max_width and line:
            bbox_l = draw.textbbox((0, 0), line, font=font)
            draw.text((cx - (bbox_l[2]-bbox_l[0])//2, y), line, font=font, fill=color)
            line = ch
            y += line_height
        else:
            line = test
    if line:
        bbox_l = draw.textbbox((0, 0), line, font=font)
        draw.text((cx - (bbox_l[2]-bbox_l[0])//2, y), line, font=font, fill=color)
        y += line_height
    return y

os.makedirs(os.path.dirname(__file__) or '.', exist_ok=True)

for idiom in idioms:
    img = draw_card(idiom)
    out_path = f"{os.path.dirname(__file__)}/idiom-{idiom['id']}.png"
    img.save(out_path, 'PNG')
    print(f"  {out_path} ({os.path.getsize(out_path)//1024}KB)")

print(f"\n生成完毕！共 {len(idioms)} 张卡片")
