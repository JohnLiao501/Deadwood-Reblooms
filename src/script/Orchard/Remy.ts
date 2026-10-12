// ./src/script/Orchard/Remy.ts

export default function Remy(maplebirch: typeof window.maplebirch): void {
  maplebirch.tool.patch.traits.add({
    title: 'NPC Traits',
    name: () => maplebirch.t('deadwood-reblooms:remy:trait:stockholm:name'),
    colour: 'white',
    has: () => Boolean(maplebirch.get('Orchard')?.remy.state.syndrome),
    text: () => `<span class='red'>${maplebirch.t('deadwood-reblooms:remy:trait:stockholm:text')}</span>`
  });

  maplebirch.tool.inject({
    widgetPassage: {
      'Widgets Named Npcs': [
        {
          srcmatchgroup: /(<<case Remy>>)(\s*(?:Remy|雷米|<<NPC_CN_NAME _npc>>)\s*<<if \$livestock.intro isnot undefined>>[\s\S]*?)(?=<<case Wren>>)/g,
          to: "$1<<if maplebirch.get('Orchard')?.remy.hasBond>><<= maplebirch.auto('Remy')>><<Remyrelationshiptext>><<else>>$2<</if>>\n\t\t",
          expected: 1
        }
      ]
    }
  });
}
