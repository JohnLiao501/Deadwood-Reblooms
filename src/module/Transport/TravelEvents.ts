// ./src/module/Transport/TravelEvents.ts

import type Transport from '../Transport';

export interface RoadsideEvent {
  kind: 'breakdown' | 'bags' | 'roadblock' | 'traffic' | 'puncture' | 'load' | 'molestation';
  resolved: boolean;
  action?: 'help' | 'tools';
  point?: string;
  started?: boolean;
  roll?: number;
  combat?: 'pending' | 'active' | 'finished';
  caught?: boolean;
  outcome?:
    | 'wait'
    | 'escape'
    | 'scraped'
    | 'observe'
    | 'force'
    | 'paid'
    | 'stolen'
    | 'fixed'
    | 'limped'
    | 'collected'
    | 'walk'
    | 'defended'
    | 'rescued'
    | 'warned'
    | 'dismissed'
    | 'repelled'
    | 'assaulted';
}

export type RoadAction = 'wait' | 'escape' | 'observe' | 'force' | 'pay' | 'yield' | 'fight' | 'warn' | 'eject' | 'fix' | 'limp' | 'walk';

export default class TravelEvents {
  public constructor(private readonly transport: Transport) {}

  public roll(destination: string, minutes: number, commute: boolean): RoadsideEvent | undefined {
    if (commute || minutes < 5 || this.transport.state.event_day === Math.floor(Time.days)) return;
    const from = this.transport.point!;
    const country = [from, destination].some(point => point === 'farmland' || /^farmroad[1-6]$/.test(point));
    const town = this.transport.catalog.routes.some(route => route.id === destination && route.terrain === 'road');
    if (!town && !country) return;
    if ([from, destination].some(point => /^(?:forest|moor):/.test(point))) return;
    const rand = this.transport.core.get('DeadwoodReblooms')!.rand;
    const chance = Math.min(country ? 28 : 12, minutes) + (Time.dayState === 'night' ? 8 : 0) + (Weather.isSnow || Weather.precipitation === 'rain' ? 6 : 0);
    if (rand.int(99) >= chance) return;
    this.transport.state.event_day = Math.floor(Time.days);
    const kinds: RoadsideEvent['kind'][] = ['traffic', 'load', 'puncture'];
    const passenger = this.transport.taxi.state.job;
    if (passenger?.phase === 'riding') {
      kinds.push('molestation');
      if (passenger.event === 'drunk') kinds.push('molestation');
    }
    if (country || (Time.dayState === 'night' && [from, destination].some(point => ['harvest', 'elk'].includes(point)))) kinds.push('roadblock');
    if ((this.transport.vehicle?.condition ?? 100) < 40) kinds.push('puncture', 'puncture');
    if (!this.transport.taxi.active && Time.dayState === 'day' && !Weather.isSnow && Weather.precipitation !== 'rain') kinds.push('breakdown', 'bags');
    const kind = kinds[rand.int(kinds.length - 1)];
    if (['breakdown', 'bags'].includes(kind)) return { kind, resolved: false };
    const position = (point: string) => (point === 'farmland' ? 160 : (this.transport.catalog.roads.find(road => road.id === point)?.position ?? 0));
    const middle = (position(from) + position(destination)) / 2;
    const point = country ? [...this.transport.catalog.roads].sort((a, b) => Math.abs(a.position - middle) - Math.abs(b.position - middle))[0].id : from;
    return { kind, point, roll: rand.int(99), resolved: false };
  }

  public get pending(): boolean {
    const trip = this.transport.state.trip;
    return !!trip && !trip.settled && !!trip.event?.point && !trip.event.resolved;
  }

  public get atHazard(): boolean {
    const trip = this.transport.state.trip;
    return (
      this.pending &&
      !!trip?.event?.started &&
      !trip.event.combat &&
      this.transport.core.passage.title === 'Deadwood Transport Travel' &&
      this.transport.ready &&
      !V.nextPassageCheck &&
      this.transport.vehicle?.id === trip.vehicle
    );
  }

  public get escapeChance(): number {
    const transport = this.transport;
    const skill = transport.model?.kind === 'bicycle' ? window.currentSkillValue('athletics') : transport.state.driving;
    const fatigue = Math.clamp((V.tiredness ?? 0) / 2000, 0, 1);
    const stress = Math.clamp(V.stress / V.stressmax, 0, 1);
    const nimble = transport.model?.kind !== 'motor_vehicle' ? 8 : (transport.model?.cargo ?? 0) >= 100 ? -10 : 0;
    return Math.round(
      Math.clamp(25 + skill * 0.06 + (transport.vehicle?.condition ?? 0) * 0.1 + nimble - fatigue * 15 - stress * 15 - (Weather.isSnow ? 20 : Weather.precipitation === 'rain' ? 10 : 0), 10, 95)
    );
  }

  public get boundaryChance(): number {
    return Math.round(Math.clamp(30 + window.currentSkillValue('willpower') * 0.04 + window.currentSkillValue('english') * 0.02 - Math.clamp(V.stress / V.stressmax, 0, 1) * 15, 15, 95));
  }

  public can(action: RoadAction): boolean {
    if (!this.atHazard) return false;
    const kind = this.transport.state.trip!.event!.kind;
    const twoWheels = this.transport.model!.kind !== 'motor_vehicle';
    if (kind === 'molestation') return action === 'fight' || action === 'warn' || (action === 'eject' && window.currentSkillValue('physique') >= (V.physiquesize * 4) / 7);
    if (action === 'walk') return true;
    if (kind === 'puncture') {
      const repair = this.transport.model!.kind === 'bicycle' ? 'bicycle' : 'motor';
      return (
        action === 'limp' ||
        (action === 'wait' && V.money >= (repair === 'bicycle' ? 2000 : 5000)) ||
        (action === 'fix' && this.transport.state.repair_tools[repair] && this.transport.state.repair_parts[repair] > 0 && window.currentSkillValue('housekeeping') >= 300)
      );
    }
    if (action === 'wait' || action === 'escape') return true;
    if (action === 'observe') return kind === 'roadblock' && window.currentSkillValue('skulduggery') >= 400;
    if (action === 'force')
      return (
        (kind === 'load' || (kind === 'roadblock' && twoWheels)) &&
        window.currentSkillValue('physique') >= (V.physiquesize * 4) / 7 &&
        (kind === 'load' || window.currentSkillValue('athletics') >= 300)
      );
    if (action === 'pay') return kind === 'roadblock' && V.money >= 5000;
    return (action === 'yield' || action === 'fight') && kind === 'roadblock';
  }

  public resolve(action: RoadAction): boolean {
    if (!this.can(action)) return false;
    const transport = this.transport;
    const trip = transport.state.trip!;
    const event = trip.event!;
    const vehicle = transport.vehicle!;
    if (action === 'fight' || (action === 'escape' && event.kind === 'roadblock' && (event.roll ?? 99) >= this.escapeChance) || (action === 'warn' && (event.roll ?? 99) >= this.boundaryChance)) {
      event.combat = 'pending';
      event.caught = action === 'escape';
      return true;
    }
    event.resolved = true;
    let minutes = 0;
    let effects = '';
    if (action === 'warn') {
      event.outcome = 'warned';
      effects = '<<willpower 1>>';
      minutes = 1;
    } else if (action === 'eject') {
      event.outcome = 'dismissed';
      effects = '<<physique 1>>';
      minutes = 3;
    } else if (action === 'escape') {
      if ((event.roll ?? 99) < this.escapeChance) {
        event.outcome = 'escape';
        effects = transport.model!.kind === 'bicycle' ? '<<athletics 2>><<tiredness 3>>' : '';
        if (transport.model!.kind !== 'bicycle') transport.state.driving = Math.min(1000, transport.state.driving + 3);
      } else {
        event.outcome = 'scraped';
        vehicle.condition = Math.max(0, vehicle.condition - 3);
        minutes = 4;
        effects = '<<stress 6>>' + (transport.model!.kind !== 'motor_vehicle' ? '<<pain 2>>' : '');
      }
    } else if (action === 'yield') event.outcome = 'stolen';
    else if (action === 'walk') event.outcome = 'walk';
    else if (action === 'observe') {
      event.outcome = 'observe';
      minutes = 3;
      effects = '<<skulduggery 1>>';
    } else if (action === 'force') {
      event.outcome = 'force';
      minutes = event.kind === 'load' ? 4 : 1;
      effects = '<<physique 1>><<tiredness 3>>';
    } else if (action === 'pay') {
      event.outcome = 'paid';
      minutes = 2;
      effects = '<<money -5000>><<stress 3>>';
    } else if (action === 'fix') {
      const repair = transport.model!.kind === 'bicycle' ? 'bicycle' : 'motor';
      transport.state.repair_parts[repair]--;
      event.outcome = 'fixed';
      minutes = repair === 'bicycle' ? 15 : 30;
      effects = '<<housekeeping 2>>';
    } else if (action === 'limp') {
      event.outcome = 'limped';
      minutes = 15;
      vehicle.condition = Math.max(0, vehicle.condition - 6);
      effects = '<<stress 3>>';
    } else if (event.kind === 'puncture') {
      event.outcome = 'collected';
      minutes = 30;
      effects = `<<money -${transport.model!.kind === 'bicycle' ? 2000 : 5000}>>`;
    } else {
      event.outcome = 'wait';
      minutes = event.kind === 'roadblock' ? 10 : event.kind === 'load' ? 8 : 4;
    }
    const stop = event.outcome === 'stolen' || event.outcome === 'walk' || event.outcome === 'dismissed';
    if (event.outcome === 'stolen') {
      vehicle.stolen = true;
      effects = '<<stress 12>>';
    }
    this.transport.core.SugarCube.Wikifier.wikifyEval(effects + (minutes ? `<<pass ${minutes}>>` : ''));
    if (transport.state.trip !== trip) return false;
    if (stop || !transport.canDepart || V.nextPassageCheck || transport.core.passage.title !== 'Deadwood Transport Travel') this.stop();
    return true;
  }

  public get combatPending(): boolean {
    return this.pending && this.transport.state.trip!.event!.combat === 'pending';
  }

  public get inCombat(): boolean {
    return this.pending && this.transport.state.trip!.event!.combat === 'active';
  }

  public get combatComplete(): boolean {
    return (
      this.inCombat &&
      !!V.combat &&
      (V.enemyhealth <= 0 ||
        V.enemyarousal >= V.enemyarousalmax ||
        (V.alarm === 1 && V.rescue >= 1) ||
        V.finish === 1 ||
        (this.transport.state.trip!.event!.kind === 'roadblock' && V.pain >= 100 && V.willpowerpain === 0))
    );
  }

  public beginCombat(): boolean {
    const transport = this.transport;
    if (!this.combatPending || transport.core.passage.title !== 'Deadwood Transport Road Fight' || !transport.ready || transport.vehicle?.id !== transport.state.trip!.vehicle) return false;
    // 同行者保留在行程状态中，战斗只载入当前对手。
    transport.core.SugarCube.Wikifier.wikifyEval('<<endevent>>');
    if (transport.state.trip!.event!.kind === 'molestation') {
      transport.taxi.passengerNPC();
      V.outside = 0;
      transport.core.SugarCube.Wikifier.wikifyEval('<<molested>><<neutral 1>><<maninit>><<set $enemytrust -= 100>>');
    } else {
      transport.core.SugarCube.Wikifier.wikifyEval('<<generateNPC 1 a>><<generateNPC 2 a>><<neutral 1>><<maninit>><<set $enemytrust -= 100>><<set $enemyanger += 200>><<npcidlegenitals>>');
    }
    transport.state.trip!.event!.combat = 'active';
    return true;
  }

  public finishCombat(): boolean {
    const transport = this.transport;
    if (transport.core.passage.title !== 'Deadwood Transport Road Fight Finish' || !this.combatComplete) return false;
    const trip = transport.state.trip!;
    const event = trip.event!;
    const satisfied = V.enemyarousal >= V.enemyarousalmax;
    const molestation = event.kind === 'molestation';
    if (satisfied) event.outcome = molestation ? 'assaulted' : 'defended';
    else if (V.enemyhealth <= 0) event.outcome = molestation ? 'repelled' : 'defended';
    else if (V.alarm === 1 && V.rescue >= 1) event.outcome = 'rescued';
    else event.outcome = molestation ? 'assaulted' : 'stolen';
    event.resolved = true;
    event.combat = 'finished';
    if (event.outcome === 'stolen') transport.vehicle!.stolen = true;
    transport.core.SugarCube.Wikifier.wikifyEval(`<<clotheson>><<endcombat>>${event.outcome === 'stolen' ? '<<stress 12>>' : ''}`);
    V.outside = 1;
    if (transport.state.trip === trip && (molestation || event.outcome === 'stolen' || !transport.canDepart || V.nextPassageCheck)) this.stop();
    return true;
  }

  public enterPassage(): void {
    const transport = this.transport;
    // 原版昏迷等分支可能在别处结束战斗，不能把旧行程再次送达。
    if (!this.inCombat || V.combat || /^Deadwood Transport Road Fight(?: Finish)?$/.test(transport.core.passage.title)) return;
    const trip = transport.state.trip!;
    const vehicle = trip.vehicle === transport.taxi.fleet?.id ? transport.taxi.fleet : transport.state.vehicles.find(vehicle => vehicle.id === trip.vehicle);
    if (vehicle && trip.event!.kind === 'roadblock') vehicle.stolen = true;
    trip.event!.resolved = true;
    trip.event!.combat = 'finished';
    trip.event!.outcome = trip.event!.kind === 'roadblock' ? 'stolen' : 'assaulted';
    this.stop(false);
  }

  public stop(resetPhase = true): void {
    const transport = this.transport;
    const trip = transport.state.trip!;
    const phase = V.phase;
    const eventskip = V.eventskip;
    trip.interrupted = true;
    trip.settled = true;
    // 载客途中停驶时，释放订单，不结算未送达的车费。
    if (trip.taxi) transport.taxi.interrupt();
    transport.state.passengers = [];
    transport.state.commute = null;
    if (resetPhase) {
      V.phase = 0;
      V.eventskip = 1;
    } else {
      V.phase = phase;
      V.eventskip = eventskip;
    }
  }

  public get available(): boolean {
    const trip = this.transport.state.trip;
    return (
      this.transport.core.passage.title === 'Deadwood Transport Travel' &&
      this.transport.ready &&
      !!trip?.settled &&
      !trip.interrupted &&
      !V.nextPassageCheck &&
      !!trip.event &&
      !trip.event.resolved &&
      this.transport.vehicle?.id === trip.vehicle &&
      this.transport.vehicle?.point === trip.to
    );
  }

  public get canUseTools(): boolean {
    const state = this.transport.state;
    return this.available && state.trip!.event!.kind === 'breakdown' && state.repair_tools.motor && state.repair_parts.motor > 0 && window.currentSkillValue('housekeeping') >= 300;
  }

  public help(tools = false): boolean {
    if (!this.available || (tools && !this.canUseTools)) return false;
    const trip = this.transport.state.trip!;
    const event = trip.event!;
    event.resolved = true;
    if (tools) this.transport.state.repair_parts.motor--;
    this.transport.core.SugarCube.Wikifier.wikifyEval(`<<pass ${event.kind === 'bags' ? 2 : 5}>>`);
    if (this.transport.core.passage.title !== 'Deadwood Transport Travel' || !this.transport.ready || V.nextPassageCheck || this.transport.state.trip !== trip) return false;
    event.action = tools ? 'tools' : 'help';
    this.transport.core.SugarCube.Wikifier.wikifyEval(`<<stress -${tools ? 2 : 1}>>`);
    return true;
  }
}
