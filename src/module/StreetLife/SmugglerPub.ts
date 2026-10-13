import type StreetLife from '../StreetLife';

const actions = {
  tea: { minutes: 5, cost: 200 },
  rest: { minutes: 15, cost: 0 },
  board: { minutes: 5, cost: 0 },
  listen: { minutes: 10, cost: 0 },
  work: { minutes: 15, cost: 0 }
};
export type PubAction = keyof typeof actions;
interface PubState {
  workDay: number;
  listenDay: number;
  restAt: number;
  teaDay: number;
  teaCount: number;
  last: { action: PubAction; at: number; outcome: 'done' | 'interrupted' } | null;
}

/** 酒馆小事只在点击时推进；日限额随存档保存，正文和侧栏读取不结算。 */
export default class SmugglerPub {
  public static readonly defaults: PubState = { workDay: -1, listenDay: -1, restAt: -3600, teaDay: -1, teaCount: 0, last: null };
  public readonly actions = actions;
  public constructor(private readonly street: StreetLife) {}

  public get state(): PubState {
    return V.StreetLife.smuggler_pub;
  }
  public get picture(): boolean {
    const passage = this.street.core.passage.title;
    return (
      /^Smuggler Pub(?: |$)/.test(passage) ||
      [
        'Deadwood Smuggler Pub',
        'Deadwood Street Weapon Shop',
        'Deadwood Street Heist Plan',
        'Deadwood Street Heist Preparation',
        'Deadwood Street Heist Candidate',
        'Deadwood Street Heist Debrief',
        'Deadwood Street Mickey'
      ].includes(passage) ||
      (passage === 'Deadwood Street Cargo' && V.StreetLife.jobs.site === 'smuggler')
    );
  }
  public get available(): boolean {
    return (
      V.location === 'underground' &&
      V.smuggler_pub_known === 1 &&
      ['Smuggler Pub', 'Deadwood Smuggler Pub'].includes(this.street.core.passage.title) &&
      this.street.available &&
      !this.street.heist.inAction &&
      !this.street.bounties.busy &&
      !V.nextPassage &&
      !V.nextPassageCheck &&
      !(V.temple_spear_mission >= 1 && !V.smuggler_pub_zephyr) &&
      !(C.npc.Wren.love >= 40 && !V.smuggler_pub_wren)
    );
  }
  public can(action: PubAction): boolean {
    if (!this.available || !Object.hasOwn(actions, action) || V.money < actions[action].cost) return false;
    if (action === 'tea') return !V.worn.face.type.includes('gag') && (this.state.teaDay !== Math.floor(Time.days) || this.state.teaCount < 3) && !window.pcAreArmsBound('both');
    if (action === 'rest') return Time.date.timeStamp >= this.state.restAt + 3600;
    if (action === 'listen') return this.state.listenDay !== Math.floor(Time.days);
    if (action === 'work') return this.state.workDay !== Math.floor(Time.days) && !window.pcAreArmsBound('both') && V.tiredness < 1800;
    return true;
  }
  public act(action: PubAction, offeredAt: number): boolean {
    if (this.street.core.passage.title !== 'Deadwood Smuggler Pub' || offeredAt !== Time.date.timeStamp || !this.can(action)) return false;
    const at = Time.date.timeStamp;
    const day = Math.floor(Time.days);
    // 先登记这次行动，拒绝迟到的点击；强制转场时不再发放恢复、工资或技能。
    if (action === 'work') this.state.workDay = day;
    if (action === 'listen') this.state.listenDay = day;
    if (action === 'rest') this.state.restAt = at;
    if (action === 'tea') {
      if (this.state.teaDay !== day) this.state.teaCount = 0;
      this.state.teaDay = day;
      this.state.teaCount++;
      this.street.core.SugarCube.Wikifier.wikifyEval(`<<money ${-actions.tea.cost}>>`);
    }
    const last: NonNullable<PubState['last']> = { action, at, outcome: 'interrupted' };
    this.state.last = last;
    this.street.core.SugarCube.Wikifier.wikifyEval(`<<pass ${actions[action].minutes}>>`);
    if (!this.available || this.street.core.passage.title !== 'Deadwood Smuggler Pub' || this.state.last !== last) return false;
    last.outcome = 'done';
    switch (action) {
      case 'tea':
        this.street.core.SugarCube.Wikifier.wikifyEval('<<stress -8>><<tiredness -10>>');
        break;
      case 'rest':
        this.street.core.SugarCube.Wikifier.wikifyEval('<<stress -12>><<tiredness -30>>');
        break;
      case 'work':
        this.street.core.SugarCube.Wikifier.wikifyEval('<<money 400>><<housekeeping 1>><<tiredness 2>>');
        break;
    }
    return true;
  }
}
