// ./src/script/NamedNPCSidebarPortrait/Grant.ts

import { register } from './NPCOutfitSets/Clothes';

export default function GrantPortrait(maplebirch: typeof window.maplebirch): void {
  maplebirch.tool.onInit(() => {
    const wardrobe = maplebirch.npc.Clothes.wardrobe;
    wardrobe.base('Grant', clothes => wardrobe.put(clothes, C.npc.Grant?.gender === 'm' ? 'male_underwear' : 'female_underwear'));
    wardrobe.wear('Grant', '*', 'business_suit_male', () => C.npc.Grant?.gender === 'm');
    wardrobe.wear('Grant', '*', 'business_suit_female', () => C.npc.Grant?.gender !== 'm');

    maplebirch.get('MoreLoveInterestsAndNPCAvatars')?.add('Grant', {
      folder: 'grant',
      states: { default: 'default' },
      stateResolver: npc => (npc.skincolour === 'black' ? 'dark' : 'default')
    });
  });
  register(maplebirch, 'Grant', ['business_suit_male', 'business_suit_female']);
}
