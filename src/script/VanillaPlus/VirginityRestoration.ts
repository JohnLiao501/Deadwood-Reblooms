// ./src/script/VanillaPlus/VirginityRestoration.ts

export default function (maplebirch: typeof window.maplebirch) {
  'use strict';

  maplebirch.tool.inject({
    locationPassage: {
      'Hospital Foyer': [{ src: '<<pillicon>>', applybefore: '<<deadwood-reblooms-virginity-restoration-link>>\n\t\t', expected: 1 }]
    }
  });
}
