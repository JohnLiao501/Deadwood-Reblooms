import Module from './Module';
import Jobs from './StreetLife/Jobs';

/** 街头口碑独立于警方证据；原版委托的贡献只读取，不重复增加原版计数。 */
export default class StreetLife extends Module {
  public readonly jobs = new Jobs(this);

  public constructor(core: typeof maplebirch) {
    super(core, 'StreetLife', { reputation: 0, jobs: Jobs.defaults });
  }

  public get reputation(): number {
    return Math.clamp(V.StreetLife.reputation + Math.min(100, (Number(V.pub_task_stat) || 0) * 5), 0, 100);
  }

  public set reputation(value: number) {
    // 存档字段保存相对原版贡献的增减，封顶后仍能正确结算损失。
    V.StreetLife.reputation = Math.clamp(value, 0, 100) - Math.min(100, (Number(V.pub_task_stat) || 0) * 5);
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
