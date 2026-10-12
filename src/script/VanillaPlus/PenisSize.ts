// ./src/script/VanillaPlus/PenisSize.ts

// 只补原版缺少第 5 档的 NPC 分支，不改已有的第 5 档或嵌套随机分支。
export const npc_size_patch = {
  srcmatchgroup: /(<<switch \$NPCList\[(?:\$mouthtarget|_n|_nn)\]\.penissize>>\s*<<case )((?:3 )?4)(>>)/g,
  to: '$1$2 5$3'
};

export default function (maplebirch: typeof window.maplebirch) {
  // 原版 effects 尚未覆盖增长到 7、缩回 6；在正文前提示并消费对应消息。
  maplebirch.dynamic.regStateEvent('gate', 'deadwood-size-seven-change', {
    cond: () => !!V.effectsmessage && !V.statFreeze && !V.silenceNotifications && (V.penisgrowthmessage === 7 || V.penisshrinkmessage === 6),
    output: 'deadwood-reblooms-size-seven-change'
  });

  const npc_prototype = maplebirch.npc.NamedNPC.prototype;
  const describe = npc_prototype.bodyPartdescription;
  npc_prototype.bodyPartdescription = function () {
    const extended = this.penissize === 5 && (this.penis === 'clothed' || this.penisdesc === 'penis' || (!this.penisdesc && this.penis !== 'none'));
    describe.call(this);
    if (extended) this.penisdesc = lanSwitch('gargantuan penis', '骇人肉棒');
  };

  maplebirch.once(':storyready', () => {
    const original = window.settingValueNameFromValue;
    if (typeof original === 'function') {
      window.settingValueNameFromValue = (name, value) => (value === 7 && ['penissizemin', 'penissizemax'].includes(name) ? lanSwitch('Gargantuan', '骇人') : original(name, value));
    }
  });

  // 保留原版的体毛尺寸、滤镜与遮挡，只替换侧栏主图及存在的寄生覆盖图。
  maplebirch.char.use(
    'pre',
    options => {
      if (V.player?.penissize !== 7 || options.mannequin || !options.penis) return;
      options.penis = options.penis.replace(/-6$/, '-7');
      if (V.worn.genitals.name === 'chastity parasite' && options.penis_parasite?.includes('ear-slime')) {
        options.ear_slime_size = 3;
        options.penis_parasite = 'ear-slime-3';
      }
      if (!options.penis_parasite?.endsWith('-7')) return;
      const folder = options.penis_parasite.includes('ear-slime') ? `body/${options.balls ? 'penis' : 'penis-no-balls'}` : 'body/parasites';
      if (maplebirch.host.modLoader.resources.has(`img/${folder}/${options.penis_parasite}.png`) !== true) {
        options.penis_parasite = options.penis_parasite.replace(/-7$/, '-6');
      }
    },
    'main'
  );

  // NPC 第 5 档复用侧栏第 7 档图片；只修改本次渲染参数。
  maplebirch.char.use(
    'pre',
    options => {
      for (const nnpc of [options.maplebirch?.nnpc, options.maplebirch?.previous]) {
        if (!nnpc?.penis || Math.round(nnpc.bodydata?.penissize ?? 1) !== 5) continue;
        const penis = nnpc.penis.replace(/-6$/, '-7');
        const folder = nnpc.balls ? 'penis' : 'penis-no-balls';
        if (maplebirch.host.modLoader.resources.has(`img/body/${folder}/${penis}.png`) !== true) continue;
        nnpc.penis_size = 7;
        nnpc.penis = penis;
      }
    },
    ['main', 'npc-pet-nnpc', 'npc-pet-previous']
  );

  // 原版近景的寄生贞操装置只提供 0–6 号素材；这里仅调整图片索引。
  maplebirch.char.use(
    'pre',
    options => {
      if (V.player?.penissize !== 7) return;
      if (options.chastity === 'chastity-parasite-7') options.chastity = 'chastity-parasite-6';
      if (options.penis?.size === 'chastity-parasite-7') options.penis.size = 'chastity-parasite-6';
    },
    ['combatClosePenis', 'combatCloseVagina']
  );

  const clamp = { src: 'Math.clamp($player.penissize, 0, 6)', to: 'Math.clamp($player.penissize, 0, 7)', expected: 1 };
  const sizeSwitch = /<<switch \$player\.penissize>>\s*(?=<<case 6>>)/g;
  // 用尺寸分支作锚点，保留原文并避免依赖英文句子。
  const sceneSwitch = /(<<switch \$player\.penissize>>(?:(?!<<\/switch>>)[\s\S])*?)(<<case 6>>)/;
  const remainingSizeSix = /(<<switch \$player\.penissize>>(?:(?!<<case 7>>|<<\/switch>>)[\s\S])*?)(<<case 6>>)/g;
  const widgetPassage: typeof maplebirch.tool.zone.widgetPassage = {
    // 设置与名称仍使用原版数据表；现有存档的个人尺寸上限不强制改写。
    'Widgets variablesStatic': [{ srcmatch: /<<set setup\.penisSizes to \[[^\]\n]+\]>>/, applyafter: '<<run setup.penisSizes.push(lanSwitch("gargantuan", "骇人"))>>', expected: 1 }],
    gameStartOnly: [{ src: '<<set $penissizemax to 6>>', to: '<<set $penissizemax to 7>>', expected: 1 }],
    'Widgets Clamp': [clamp],
    // 6→7 需要更长的积累区间；末尾钳制和统计百分比使用相同边界。
    'Widgets physicalAdjustments': [
      clamp,
      {
        src: '$penisgrowthtimer lte 0 and $player.penissize lt',
        to: '$penisgrowthtimer lte ($player.penissize is 6 ? -1400 : 0) and $player.penissize lt',
        expected: 1
      },
      {
        srcmatchgroup: /(<<set \$player\.penissize \+= 1>>\s*<<set \$penisgrowthtimer \+= )700/,
        to: '$1($player.penissize is 7 ? 2100 : 700)',
        expected: 1
      },
      {
        src: '$penisgrowthtimer gte 1000 and $player.penissize gt 2',
        to: '$penisgrowthtimer gte ($player.penissize is 7 ? 2400 : 1000) and $player.penissize gt 2 and ($player.penissize isnot 7 or $penissizemin lt 7)',
        expected: 1
      },
      {
        srcmatchgroup: /(<<set \$player\.penissize -= 1>>\s*<<set \$penisgrowthtimer -= )700/,
        to: '$1($player.penissize is 6 ? 2100 : 700)',
        expected: 1
      },
      {
        src: 'Math.clamp($penisgrowthtimer, 0, 1000)',
        to: 'Math.clamp($penisgrowthtimer, $player.penissize is 6 ? -1400 : 0, $player.penissize is 7 ? 2400 : 1000)',
        expected: 1
      }
    ],
    Statistics: [
      { src: '<<set $_penisGrowthMin to 0>>', to: '<<set $_penisGrowthMin to ($player.penissize is 6 ? -1400 : 0)>>', expected: 1 },
      { src: '<<set $_penisGrowthMax to 1000>>', to: '<<set $_penisGrowthMax to ($player.penissize is 7 ? 2400 : 1000)>>', expected: 1 }
    ],
    'Widgets Text': [{ srcmatch: /<<case 6>><<set _text_output to "[^"\n]+">>/, applybefore: '<<case 7>><<set _text_output to lanSwitch("gargantuan", "骇人")>>', expected: 1 }],
    'Widgets Settings': [
      {
        srcmatch: /<<set _penisNames to \[[^\]\n]+\]>>/g,
        applyafter: '<<set _penisNames[5] to setup.penisSizes[7].toUpperFirst()>>',
        expected: 3
      },
      {
        src: '"$penissizemin" "$penissizemax" $penissizemin $penissizemax 0 6 1',
        to: '"$penissizemin" "$penissizemax" $penissizemin $penissizemax 0 7 1',
        expected: 1
      },
      {
        srcmatch: /<<rangeslider "\$penissizemin" "\$penissizemax" \$penissizemin \$penissizemax 0 7 1[\s\S]*?var name = \[[^\]\n]+\];/,
        applyafter: 'name.push(lanSwitch("Gargantuan", "骇人"));',
        expected: 1
      }
    ],
    Cheats: [
      { src: '"$player.penissize" $player.penissize 0 6 1', to: '"$player.penissize" $player.penissize 0 7 1', expected: 1 },
      { srcmatch: /<<set _penisText to \[[^\]\n]+\]>>/, applyafter: '<<run _penisText.push(lanSwitch("Gargantuan", "骇人"))>>', expected: 1 }
    ],
    'Body Comment Random Flavour Text Widgets': [
      { src: '$player.penissize is 6', to: '$player.penissize gte 6', expected: 1 },
      {
        src: '<<set _possibilities to _big_penis_all>>',
        applyafter: '<<if $player.penissize is 7 and !playerHasStrapon() and !playerChastity("penis")>><<deadwood-reblooms-size-seven-remarks>><</if>>',
        expected: 1
      }
    ],
    'Widgets Audience': [
      {
        srcmatch: sizeSwitch,
        applyafter: '<<case 7>><<deadwood-reblooms-size-seven-audience>>',
        expected: 2
      }
    ],
    'Widgets Speech': [clamp, { src: '<<switch Math.clamp($player.penissize, 0, 7)>>', applyafter: '<<case 7>><<deadwood-reblooms-size-seven-speech>>', expected: 1 }],
    'Widgets Ejaculation-GWYLAN': [{ srcmatch: sizeSwitch, applyafter: '<<case 7>><<deadwood-reblooms-size-seven-gwylan-ejaculation>>', expected: 2 }],
    'Widgets speech-GWYLAN': [{ srcmatch: sizeSwitch, applyafter: '<<case 7>><<deadwood-reblooms-size-seven-gwylan-speech>>', expected: 1 }],
    // 下列原版分支已区分 NPC 第 5 档，不再重复改写：
    // Widgets Effects Vagina : 2 处单插、2 处双插。
    // Widgets Effects Anus   : 2 处单插、2 处双插。
    // Widgets Combat Beast   : 2 处主动动作。
    // NPC 存档尺寸仍为 5；只有侧栏图片索引使用 7。

    // NPC 原版补缺：口腔 1 处、主动动作 11 处、射精落点 9 处。
    // DoLX 已有独立第 5 档，由 DoLX.ts 跳过下面三组补丁。
    'Widgets Effects Man': [{ ...npc_size_patch, expected: 1 }],
    'Widgets Combat Man-Combat': [{ ...npc_size_patch, expected: 11 }],
    'Widgets Ejaculation': [{ ...npc_size_patch, expected: 9 }],

    'Trash Compare Widgets': [{ srcmatchgroup: sceneSwitch, to: '$1<<case 7>><<deadwood-reblooms-size-seven-trash>>$2', expected: 1 }]
  };
  const locationPassage: typeof maplebirch.tool.zone.locationPassage = {
    // 无 g 的 srcmatch 只改第一个尺寸分支；后续分支沿用原版大尺寸正文。
    'Gwylan Ritual Sex Gwylan Riding': [
      { srcmatch: sceneSwitch, to: '$1<<case 7>><<bodyliquid "penis" "goo">><<deadwood-reblooms-size-seven-riding>>$2', expected: 2 },
      { srcmatchgroup: remainingSizeSix, to: '$1<<case 6 7>>', expected: 1 }
    ],
    'Gwylan Ritual Sex Gwylan Doggy': [
      { srcmatch: sceneSwitch, to: '$1<<case 7>><<deadwood-reblooms-size-seven-doggy>>$2', expected: 2 },
      { srcmatchgroup: remainingSizeSix, to: '$1<<case 6 7>>', expected: 1 }
    ],
    'Gwylan Ritual Sex Gwylan Riding Nopen': [{ srcmatchgroup: sceneSwitch, to: '$1<<case 7>><<deadwood-reblooms-size-seven-grind>>$2', expected: 1 }],
    'Gwylan Ritual Inspect': [{ srcmatchgroup: remainingSizeSix, to: '$1<<case 6 7>>', expected: 1 }],
    'School Infirmary Robin CD Penetrate': [{ srcmatchgroup: sceneSwitch, to: '$1<<case 7>><<deadwood-reblooms-size-seven-robin>>$2', expected: 1 }],
    'Livestock Penis': [
      { srcmatch: sceneSwitch, to: '$1<<case 6 7>>', expected: 2 },
      { srcmatchgroup: remainingSizeSix, to: '$1<<case 7>><<deadwood-reblooms-size-seven-livestock>>$2', expected: 1 }
    ],
    'Livestock Job Harper 3 Obey': [{ srcmatchgroup: remainingSizeSix, to: '$1<<case 6 7>>', expected: 1 }]
  };

  // 保留原版大尺寸台词与触发条件；这里只让第 7 档进入已有分支。
  const large = { srcmatchgroup: /\$player\.penissize is 6\b/g, to: '$player.penissize gte 6' };
  for (const [passage, expected] of [
    ['Widgets Home Events', 1],
    ['Widgets Changing Room', 2],
    ['Widgets School Events', 1],
    ['Widgets Events Swimming', 1]
  ] as const)
    widgetPassage[passage] = [{ ...large, expected }];

  for (const [passage, expected] of [
    ['Bath', 1],
    ['Bath Ask', 1],
    ['Farm Shower', 2],
    ['Swimming Lesson Naked Backstroke', 1],
    ['School Detention', 2],
    ['Avery Office Warming Paperwork 3', 4]
  ] as const)
    locationPassage[passage] = [{ ...large, expected }];

  maplebirch.tool.inject({ widgetPassage, locationPassage });
}
