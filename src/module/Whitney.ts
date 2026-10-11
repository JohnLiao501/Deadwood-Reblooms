// ./src/module/Whitney.ts

import Achievements from './Achievements';
import Module from './Module';
import { DEFAULT_WHITNEY_EXPANSION_STATE } from './constants';

class Whitney extends Module {
  public constructor(core: typeof maplebirch) {
    super(core, 'WhitneyExpansion', DEFAULT_WHITNEY_EXPANSION_STATE);
  }

  public override preInit(): void {
    super.preInit();
    Achievements.add(this.core, 'Whitney');
    this.core.npc.Pregnancy.add('Whitney', { canBePregnant: true });
  }
}

declare module '@scml-dol-maplebirch/types' {
  interface Extensions {
    readonly Whitney: Whitney;
  }
}

export default Whitney;
