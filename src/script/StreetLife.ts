import Detective from './StreetLife/Detective';

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
  Detective(maplebirch);
  maplebirch.tool.addTo('BeforeLinkZone', { widget: 'deadwood-street-detective-link', passage: 'Police Station' });
  maplebirch.tool.addTo('Journal', 'deadwood-street-bounty-journal');
  maplebirch.tool.addTo('Journal', 'deadwood-street-ammunition-journal');
  maplebirch.dynamic.regStateEvent('gate', 'deadwood-street-fight-interrupted', {
    cond: () => {
      if (!V.StreetLife?.bounties) return false;
      const work = maplebirch.get('StreetLife')!.bounties;
      return (!!work.fight?.combatStarted && !V.combat) || (maplebirch.passage.title === 'Police Cell' && !!work.state.active);
    },
    action: () => {
      const work = maplebirch.get('StreetLife')!.bounties;
      if (maplebirch.passage.title === 'Police Cell' && work.state.active) {
        const job = work.state.active;
        if (V.NPCList[0]?.per === job.key) maplebirch.SugarCube.Wikifier.wikifyEval('<<endevent>>');
        if (V.per_npc[job.key]) maplebirch.SugarCube.Wikifier.wikifyEval(`<<clearNPC '${job.key}'>>`);
        work.state.last = { id: job.id, outcome: 'interrupted', fee: 0 };
        work.state.active = null;
      }
      const fight = work.fight!;
      if (!fight) return;
      fight.combatStarted = false;
      if (work.fightingHunter) {
        if (V.NPCList[0]?.per === fight.key) maplebirch.SugarCube.Wikifier.wikifyEval('<<endevent>>');
        if (V.per_npc[fight.key]) maplebirch.SugarCube.Wikifier.wikifyEval(`<<clearNPC '${fight.key}'>>`);
        work.state.hunter = null;
      } else {
        work.state.active!.stage = 'failed';
        work.state.active!.vehicle = null;
      }
    }
  });
  maplebirch.dynamic.regStateEvent('append', 'deadwood-street-bounty-hunter', {
    extra: { match: / Street$/ },
    // 原文及普通街道菜单已完成，才能拦路；强制事件没有当页 Bus 链接。
    cond: () => {
      const bounty = maplebirch.get('StreetLife')!.bounties;
      return (
        bounty.available &&
        Array.isArray(V.link_table) &&
        V.link_table.some(entry => entry.includes('|Bus]]')) &&
        (bounty.state.hunter ? bounty.state.hunter.stage === 'approach' && bounty.state.hunter.source === maplebirch.passage.title : bounty.state.hunterDay !== Math.floor(Time.days))
      );
    },
    action: () => maplebirch.get('StreetLife')!.bounties.checkHunter(),
    output: 'deadwood-street-hunter-entry'
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
        return data.streetWeapon ? lanSwitch(`Fire ${data.name}`, `使用${data.cn_name_cap}开火`) : lanSwitch(`Use ${data.name}`, `使用${data.cn_name_cap}`);
      },
      value: () => `streetWeapon${hand}`,
      color: 'def',
      difficulty: () => {
        const firearm = setup.clothes.handheld[V.worn[hand === 'left' ? 'handheld_left' : 'handheld'].index].streetWeapon;
        if (!firearm) return '';
        const rounds = V.StreetLife.ammo[firearm.ammo];
        const shots = Math.min(firearm.shots, rounds);
        return lanSwitch(`${rounds} rounds remaining · Fires ${shots} round${shots === 1 ? '' : 's'}`, `剩余 ${rounds} 发 · 本次耗弹 ${shots} 发`);
      },
      effect: `<<deadwood-street-weapon '${hand}'>>`
    });
  }
}
