// ./src/script/VanillaPlus/OrphanEvents.ts

export default function OrphanEvents(maplebirch: typeof window.maplebirch): void {
  maplebirch.tool.inject({
    widgetPassage: {
      'Widgets Home Events': [
        {
          src: '\t<<switch random(1, 14)>>',
          to: '\t<<switch random(1, 17)>>',
          expected: 1
        },
        {
          src: '\t\t<<case 14>>',
          applybefore:
            '\t\t<<case 15>>\n' +
            '\t\t\t<<if $fame.sex lte 50 or $fame.rape lte 50 or $fame.bestiality lte 50>>\n' +
            '\t\t\t\t<<deadwood-orphan-event "doctor">>\n' +
            '\t\t\t<<else>>\n' +
            '\t\t\t\t<<deadwood-orphan-skip>>\n' +
            '\t\t\t<</if>>\n' +
            '\t\t<<case 16>>\n' +
            '\t\t\t<<deadwood-orphan-event "judge">>\n' +
            '\t\t<<case 17>>\n' +
            '\t\t\t<<deadwood-orphan-event "masturbation">>\n' +
            '\t\t<<case 18>>\n' +
            '\t\t\t<<deadwood-orphan-event "erection">>\n',
          expected: 1
        }
      ]
    }
  });
}
