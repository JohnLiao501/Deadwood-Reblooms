export default function StreetLife(maplebirch: typeof window.maplebirch): void {
  const weaponTrait = () => {
    // 原版 clothingtrait 按 type 读取这张表及同名图标；物品标识不能只有 type 而没有说明。
    setup.shopDetails.weapon = {
      name: maplebirch.t('deadwood-reblooms:clothing-type:weapon:name'),
      desc: maplebirch.t('deadwood-reblooms:clothing-type:weapon:description'),
      details: maplebirch.t('deadwood-reblooms:clothing-type:weapon:details')
    };
  };
  maplebirch.tool.onInit(weaponTrait);
  maplebirch.on(':language', weaponTrait);
  // 服装目录独立于模块开关加载，类型说明常驻；玩法只在模块启用时接入。
  if (!maplebirch.get('StreetLife')) return;
  maplebirch.dynamic.regStateEvent('gate', 'deadwood-street-job-board', {
    extra: { passage: ['Deadwood Street Jobs'] },
    cond: () => maplebirch.get('StreetLife')!.jobs.available && V.StreetLife.jobs.day !== Math.floor(Time.days),
    action: () => {
      // 每日首次进入委托页洗牌一次；全部候选保留，临时未解锁不会占住当天名额。
      const state = V.StreetLife.jobs;
      state.day = Math.floor(Time.days);
      state.board = maplebirch.get('StreetLife')!.jobs.terms.jobs.map(item => item.id);
      for (let i = state.board.length - 1; i > 0; i--) {
        const j = random(0, i);
        [state.board[i], state.board[j]] = [state.board[j], state.board[i]];
      }
    }
  });
  maplebirch.tool.addTo('Reputation', 'deadwood-street-reputation');
  maplebirch.tool.addTo('Journal', 'deadwood-street-job-journal');
  maplebirch.tool.addTo('BeforeLinkZone', { widget: 'deadwood-street-shop-link', passage: 'Smuggler Pub' });
  maplebirch.tool.addTo('BeforeLinkZone', { widget: 'deadwood-street-unload', match: / Street$/ });
  maplebirch.tool.inject({
    locationPassage: {
      'Ocean Breeze': [
        {
          // 普通咖啡馆菜单的离店选项前，避开 Sam 剧情及昏倒；营业状态由货物入口重验。
          src: '<<clifficon>>',
          applybefore: "<<deadwood-street-cargo-link 'cafe'>>\n",
          expected: 1
        }
      ],
      Docks: [
        {
          // 码头总览的原版衣物检查前；委托入口排除夜间封锁，不进入潜入事件。
          src: '<<storeon "docks" "check">>',
          applybefore: "<<deadwood-street-cargo-link 'docks'>>\n",
          expected: 1
        }
      ],
      'School Library': [
        {
          // 原版日常自习菜单内，强制争执与昏倒分支不走这里。
          src: '<<projectoptions>>',
          applybefore: "<<deadwood-street-cargo-link 'library'>>\n",
          expected: 1
        }
      ],
      'Town Hall Wait': [
        {
          // 已按原版排队二十分钟、轮到前台办理；保留随后出现的原版委托。
          src: '<<if $hookah_plot is 1>>',
          applybefore: "<<deadwood-street-cargo-link 'townhall'>>\n",
          expected: 1
        }
      ],
      'Tailor Shop': [
        {
          // 普通店员分支的修补选项前，继承裸露、压力、闭店与二十一点清场规则。
          src: '<<if $tailor_cost gte 1',
          applybefore: "<<deadwood-street-cargo-link 'tailor'>>\n",
          expected: 1
        }
      ],
      'Hospital Foyer': [
        {
          // 原版药房入口所在的普通菜单；继承压力、裸露与急救分支，不打断医院事件。
          src: '<<pillicon>>',
          applybefore: "<<deadwood-street-cargo-link 'hospital'>>\n\t\t",
          expected: 1
        }
      ],
      'Industrial Alleyways': [
        {
          // 原版普通探索分支的梯子选项前；不穿过街头遭遇或泳池聚会的强制入口。
          src: '<<laddericon>>',
          applybefore: "<<deadwood-street-cargo-link 'alley'>>\n\t\t",
          expected: 1
        }
      ]
    },
    widgetPassage: {
      'Widgets Pub': [
        {
          // 与原版兰德里选项一同出现；独占的艾弗里与 Wren 介绍段不调用此 widget。
          src: '<<widget "landryoptions">>',
          applyafter: '\n\t<<deadwood-street-landry-link>>',
          expected: 1
        }
      ],
      'Clothing Shop v2 Widgets': [
        {
          // 酒馆夜间仍营业；其它商店的闭店偷窃分支维持原样。
          src: '$shopName isnot "forest"',
          to: '!["forest", "deadwoodStreet"].includes($shopName)',
          expected: 1
        },
        {
          // 与副手功能重复时只禁用手持和试拿，仍允许购买送入衣柜。
          src: '<<shopBuyItemStatus _wardrobeSlots>>',
          applyafter: '\n<<if $shopName is "deadwoodStreet" and !(maplebirch.get("LifeSimulation")?.hands.prepare(_temp_choice, "handheld") ?? true)>><<set _wearingBlocked to true>><</if>>',
          expected: 1
        }
      ]
    }
  });
  for (const hand of ['left', 'right'] as const) {
    maplebirch.combat.CombatAction.reg({
      id: `street-weapon-${hand}`,
      actionType: hand === 'left' ? 'leftaction' : 'rightaction',
      combatType: 'Default',
      cond: () => maplebirch.get('StreetLife')?.canUse(hand) === true,
      display: () => {
        const item = V.worn[hand === 'left' ? 'handheld_left' : 'handheld'];
        const data = setup.clothes.handheld[item.index];
        return lanSwitch(`Use ${data.name}`, `使用${data.cn_name_cap}`);
      },
      value: () => `streetWeapon${hand}`,
      color: 'def',
      effect: `<<deadwood-street-weapon '${hand}'>>`
    });
  }
}
