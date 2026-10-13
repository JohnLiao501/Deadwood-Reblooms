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
  maplebirch.tool.addTo('Reputation', 'deadwood-street-reputation');
  maplebirch.tool.addTo('Journal', 'deadwood-street-job-journal');
  maplebirch.tool.addTo('BeforeLinkZone', { widget: 'deadwood-street-shop-link', passage: 'Smuggler Pub' });
  maplebirch.tool.addTo('BeforeLinkZone', { widget: 'deadwood-street-unload', match: / Street$/ });
  maplebirch.tool.inject({
    locationPassage: {
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
