import Module from './Module';

/** 小镇街头的口碑与警方证据分开记录；兰德里交付是本轮接入的声誉来源。 */
export default class StreetLife extends Module {
  public constructor(core: typeof maplebirch) {
    super(core, 'StreetLife', { reputation: 0 });
  }

  public get reputation(): number {
    return Math.clamp(V.StreetLife.reputation + (Number(V.pub_task_stat) || 0) * 5, 0, 100);
  }

  public get available(): boolean {
    return !V.combat && !V.replayScene && !V.statFreeze && !V.possessed && V.exposed <= 0;
  }

  public canUse(hand: 'left' | 'right'): boolean {
    const item = V.worn?.[hand === 'left' ? 'handheld_left' : 'handheld'];
    const target = V.NPCList?.[Number(V[`${hand}target`])];
    return (
      !!this.core.get('StreetLife') &&
      V.combat === 1 &&
      V.enemytype === 'man' &&
      V.enemyhealth > 0 &&
      V.consensual === 0 &&
      !V.replayScene &&
      !V.statFreeze &&
      !V.possessed &&
      V[`${hand}arm`] === 0 &&
      V.orgasmdown < 1 &&
      V.dissociation < 2 &&
      !(V.trance > 0 || V.panicparalysis > 0 || V.panicviolence > 0) &&
      !(V.pain >= 100 && V.willpowerpain === 0) &&
      V.position !== 'stalk' &&
      !V.gloryhole &&
      V.walltype !== 'front' &&
      target?.active === 'active' &&
      target.stance !== 'defeated' &&
      ['street_baton', 'street_knife', 'street_stunner'].includes(item?.variable ?? setup.clothes.handheld[item?.index]?.variable)
    );
  }
}

declare module '@scml-dol-maplebirch/types' {
  interface Extensions {
    readonly StreetLife: StreetLife;
  }
}
