// ./src/script/LifeSimulation/PartnerMedicine.ts

export default function PartnerMedicine(maplebirch: typeof window.maplebirch): void {
  // 跟随原版自由交谈分支，原地展开，并明确指定正在交谈的恋人。
  maplebirch.tool.inject({
    widgetPassage: {
      'Widgets Robin': [{ src: '<<robinbully>>', applybefore: '<<deadwood-partner-medicine-links "Robin">>\n\t\t', expected: 1 }],
      'Widgets Kylar': [{ src: '<<if _lewdIdea>>', applybefore: '<<if $bus is "kylarmanor">><<deadwood-partner-medicine-links "Kylar">><</if>>\n\t\t', expected: 1 }],
      'Widgets Whitney': [{ src: '<<if !_noOptions>>', applyafter: '\n\t\t\t<<if $location is "flats">><<deadwood-partner-medicine-links "Whitney">><</if>>', expected: 1 }],
      'Widgets Sydney': [{ src: '<<widget "sydneyOptionsTalk">>', applyafter: '\n\t<<if $location is "temple">><<deadwood-partner-medicine-links "Sydney">><</if>>', expected: 1 }],
      'Farm Widgets': [{ src: '<<widget "farm_cottage_tv_options">>', applyafter: '\n\t<<deadwood-partner-medicine-links "Alex">>', expected: 1 }]
    },
    locationPassage: {
      'Mansion Talk': [
        {
          srcmatch: /<<socialiseicon>><<link \[\[[^\]\n]+\|Mansion Talk Chat]]>>/,
          applybefore: '<<deadwood-partner-medicine-links "Avery">>\n\t',
          expected: 1
        }
      ]
    }
  });
}
