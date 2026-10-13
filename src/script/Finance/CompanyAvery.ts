// ./src/script/Finance/CompanyAvery.ts

import { holdemView } from '../LifeSimulation/Casino/PokerView';

export default function CompanyAvery(maplebirch: typeof window.maplebirch): void {
  maplebirch.tool.macro.defineS('deadwood-private-cards-table', () => {
    const game = maplebirch.get('Finance')?.company.avery.cards;
    if (game) return holdemView(maplebirch, game, true);
  });
  maplebirch.tool.inject({
    widgetPassage: {
      'Widgets Avery Mansion': [
        {
          // 共用原版庄园日程入口，许可与地牢知识由 Twee 写回原版变量。
          src: '<<averySchedule>>',
          applyafter: '<<deadwood-avery-controller-access>>',
          expected: 1
        }
      ]
    },
    locationPassage: {
      // 保留原版四个价格档，仅让存款参与价格感受，不把贷款、股票市值当现金。
      'Avery Valentines 13': [
        {
          srcmatchgroup: /\$money(?= (?:gte|lt) (?:5000000|500000|50000|25000)\b)/g,
          to: "(maplebirch.get('Finance')?.spendingMoney ?? $money)",
          expected: 4
        }
      ]
    }
  });
  maplebirch.tool.addTo(
    'BeforeLinkZone',
    { widget: 'deadwood-private-cards-guest-link', passage: ['Avery Cards', 'Avery Cards 4'] },
    { widget: 'deadwood-private-cards-boundary-link', passage: ['Avery Cards 8', 'Avery Cards Table Protest'] },
    { widget: 'deadwood-private-cards-link', passage: 'Avery Cards 6' },
    { widget: 'deadwood-avery-site-link', passage: 'Skyscraper' },
    { widget: 'deadwood-avery-ceremony-link', passage: 'Skyscraper Party 11' },
    { widget: 'deadwood-avery-dinner-link', passage: ['Avery Date Order', 'Avery Date Cheap', 'Avery Date Expensive'] }
  );
  maplebirch.tool.addTo('Journal', 'deadwood-avery-journal');
}
