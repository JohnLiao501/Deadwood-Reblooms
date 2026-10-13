// ./src/module/Finance/PropertyOutings.ts

import type RealEstate from './RealEstate';
import Catalog from '../Transport/Catalog';

export type OutingActivity = 'meal' | 'shopping' | 'walk';
export interface PropertyOutingState {
  plan: {
    name: string;
    property: string;
    day: number;
    hour: number;
    at: number;
    activity: OutingActivity;
    stage: 'booked' | 'out' | 'visit' | 'return' | 'done' | 'cancelled' | 'missed';
    vehicle: number | null;
    enjoyed: boolean;
  } | null;
  visits: Record<string, { property: string; until: number; at: string }>;
  note: { name: string; property: string; day: number; kind: 'ride' | 'outing'; short: boolean; done: boolean } | null;
}

/** 房屋只保存约定和短暂来访；道路、车辆、费用与正文沿用已有模块。 */
export default class PropertyOutings {
  public static readonly defaults: PropertyOutingState = { plan: null, visits: {}, note: null };

  public constructor(
    private readonly estate: RealEstate,
    private readonly core: typeof maplebirch
  ) {}

  public get state(): PropertyOutingState {
    return (V.Finance.real_estate.outings ??= structuredClone(PropertyOutings.defaults));
  }

  public get plan(): PropertyOutingState['plan'] {
    return this.state.plan;
  }

  public preInit(): void {
    this.core.on(':passagestart', () => this.advance());
  }

  public valid(name: string, property: string): boolean {
    const npc = C.npc[name];
    if (V.replayScene || V.statFreeze || npc?.init !== 1 || !['active', 'rescued'].includes(npc.state) || this.estate.residenceOf(name)?.id !== property) return false;
    if (name === 'Robin') return !V.robinmissing && V.robin.timer.hurt === 0 && V.RobinExpansion?.asylum?.status !== 'admitted';
    if (name === 'Sydney') {
      const expansion = this.core.get('Sydney') ? V.SydneyExpansion : undefined;
      const festival = (Time.month === 10 && Time.monthDay === 31) || (Time.month === 12 && Time.monthDay === 25);
      return V.daily.sydney.punish !== 1 && !festival && !(expansion?.estate?.visitDay >= 0 && expansion.estate.visitDay === Time.days);
    }
    return ['Whitney', 'Kylar'].includes(name);
  }

  public get live(): boolean {
    return !!this.plan && ['booked', 'out', 'visit', 'return'].includes(this.plan.stage) && this.valid(this.plan.name, this.plan.property);
  }

  public get travelling(): boolean {
    return this.live && ['out', 'visit', 'return'].includes(this.plan!.stage);
  }

  public get target(): string | null {
    if (!this.travelling || this.plan!.stage === 'visit') return null;
    return this.plan!.stage === 'return' ? 'home:' + this.plan!.property : { meal: 'cliff', shopping: 'high', walk: 'starfish' }[this.plan!.activity];
  }

  public get days(): number[] {
    return Array.from({ length: 7 }, (_, index) => Math.floor(Time.days) + index + 1).filter(day => [1, 7].includes(((Time.weekDay - 1 + day - Math.floor(Time.days)) % 7) + 1));
  }

  public hour(name: string, day: number): number | null {
    const weekDay = ((Time.weekDay - 1 + day - Math.floor(Time.days)) % 7) + 1;
    if (name === 'Robin' && this.core.get('Robin') && V.RobinExpansion?.shop) return 21;
    if (name !== 'Sydney') return 18;
    if ((weekDay === 7 && V.adultshopopeningsydney) || (weekDay === 1 && V.sydney.rank === 'initiate')) return null;
    return weekDay === 7 ? 20 : 19;
  }

  public book(name: string, day: number, activity: OutingActivity): boolean {
    const property = this.estate.current;
    const hour = this.hour(name, day);
    if (
      V.passage !== 'Deadwood Reblooms Property Outing Plan' ||
      !property ||
      this.live ||
      !this.days.includes(day) ||
      hour === null ||
      (hour >= 20 && activity === 'meal') ||
      (hour >= 21 && activity === 'shopping') ||
      !['meal', 'shopping', 'walk'].includes(activity) ||
      !this.estate.residentsHome(property.id).some(resident => resident.id === name) ||
      !this.valid(name, property.id)
    )
      return false;
    const at = Time.date.timeStamp + (day - Math.floor(Time.days)) * 86400 + (hour * 60 - Time.hour * 60 - Time.minute) * 60 - Time.date.second;
    this.state.plan = { name, property: property.id, day, hour, at, activity, stage: 'booked', vehicle: null, enjoyed: false };
    return true;
  }

  public cancel(): boolean {
    if (!this.plan || this.plan.stage !== 'booked') return false;
    this.plan.stage = 'cancelled';
    return true;
  }

  public abandon(): void {
    const plan = this.plan;
    if (!plan || !['out', 'visit', 'return'].includes(plan.stage)) return;
    plan.stage = 'cancelled';
    const transport = this.core.get('Transport');
    if (transport) {
      transport.state.passengers = transport.state.passengers.filter(name => name !== plan.name);
      if (transport.state.trip) transport.state.trip.passengers = transport.state.trip.passengers.filter(name => name !== plan.name);
    }
  }

  public get waiting(): boolean {
    return this.live && this.plan!.stage === 'booked' && Time.date.timeStamp >= this.plan!.at && Time.date.timeStamp < this.plan!.at + 1800;
  }

  public get due(): boolean {
    return this.waiting && this.home(this.plan!.name, this.plan!.property) === true;
  }

  public canLeave(id: string): boolean {
    if (!['Deadwood Reblooms Property Garage', 'Deadwood Transport Menu'].includes(V.passage)) return false;
    const transport = this.core.get('Transport');
    const property = this.estate.properties.find(item => item.id === id);
    if (!transport || !property) return false;
    if (transport.atGarage) return this.estate.current?.id === id;
    const street = property.street === 'Office Lobby' ? 'High Street' : property.street;
    return V.passage === 'Deadwood Transport Menu' && !transport.state.shop && transport.state.return_passage === street && transport.point === Catalog.point(street);
  }

  public begin(vehicleId: number): boolean {
    const plan = this.plan;
    const transport = this.core.get('Transport');
    if (
      !this.due ||
      !transport ||
      !this.canLeave(plan!.property) ||
      transport.taxi.active ||
      transport.state.commute ||
      !transport.ready ||
      V.nextPassageCheck ||
      V.worn.feet.type.includes('shackle') ||
      V.drunk > 0 ||
      V.drugged > 0 ||
      V.stress >= V.stressmax ||
      !transport.state.school.motor_vehicle.licensed
    )
      return false;
    const vehicle = transport.nearby.find(item => item.id === vehicleId);
    const model = Catalog.models.find(item => item.id === vehicle?.model);
    const destination = { meal: 'cliff', shopping: 'high', walk: 'starfish' }[plan!.activity];
    const distance = vehicle ? Catalog.distance(vehicle.point, destination) : null;
    if (
      !vehicle ||
      model?.kind !== 'motor_vehicle' ||
      !model.seats ||
      vehicle.stolen ||
      vehicle.condition <= 0 ||
      (vehicle.arrears ?? 0) > 0 ||
      distance === null ||
      vehicle.fuel < Math.ceil((distance * 2 + 4) * model.fuel_use * 100) / 100 ||
      (plan!.activity === 'walk' && Weather.precipitation !== 'none')
    )
      return false;
    if (plan!.name === 'Sydney' && Time.hour * 60 + Time.minute + 1 + transport.journeyMinutes(model, distance + 2) * 2 + 20 >= 21 * 60) return false;
    if (plan!.activity !== 'walk' && Time.hour * 60 + Time.minute + 1 + transport.journeyMinutes(model, distance + 2) + 20 > (plan!.activity === 'meal' ? 20 : 21) * 60) return false;
    if (V.passage === 'Deadwood Reblooms Property Garage') {
      if (!transport.open(vehicleId)) return false;
    } else {
      transport.state.selected = vehicleId;
      transport.state.trip = null;
    }
    vehicle.garage = null;
    plan!.stage = 'out';
    plan!.vehicle = vehicleId;
    transport.state.passengers = [plan!.name];
    return true;
  }

  public arrive(destination: string): void {
    const plan = this.plan;
    if (!this.travelling || !plan || destination !== this.target) return;
    if (plan.stage === 'out') plan.stage = 'visit';
    else if (plan.stage === 'return' && this.estate.current?.id === plan.property) {
      plan.stage = 'done';
      this.receive(plan.name, plan.property, 'outing');
    }
  }

  public get canStay(): boolean {
    const plan = this.plan;
    const transport = this.core.get('Transport');
    if (!this.travelling || plan!.stage !== 'visit' || !transport?.model || !transport.vehicle) return false;
    if (plan!.name !== 'Sydney') return true;
    const property = this.estate.properties.find(item => item.id === plan!.property);
    const point = property?.street === 'Office Lobby' ? 'high' : property && Catalog.point(property.street);
    const distance = point ? Catalog.distance(transport.vehicle.point, point) : null;
    return distance !== null && Time.hour * 60 + Time.minute + 20 + transport.journeyMinutes(transport.model, distance + 2) < 21 * 60;
  }

  public back(enjoyed = false): boolean {
    const transport = this.core.get('Transport');
    if (
      !this.travelling ||
      !transport ||
      !['Deadwood Reblooms Property Outing', 'Deadwood Transport Travel', 'Deadwood Transport Menu'].includes(V.passage) ||
      !['visit', 'out'].includes(this.plan!.stage) ||
      transport.state.trip?.interrupted ||
      !transport.ready ||
      transport.vehicle?.id !== this.plan!.vehicle ||
      transport.vehicle.stolen
    )
      return false;
    if (enjoyed && !this.canStay) return false;
    if (this.plan!.stage === 'out' && !transport.state.trip?.settled) return false;
    this.plan!.stage = 'return';
    this.plan!.enjoyed = enjoyed;
    transport.state.trip = null;
    transport.state.return_passage = Catalog.passage(transport.vehicle.point);
    return true;
  }

  public receive(name: string, property: string, kind: 'ride' | 'outing'): void {
    if (!this.valid(name, property)) return;
    const end = name === 'Sydney' ? 21 : kind === 'ride' && name === 'Robin' && Time.hour < 16 ? 16 : 24;
    this.state.visits[name] = { property, until: Time.date.timeStamp + Math.max(0, end * 60 - Time.hour * 60 - Time.minute) * 60, at: 'deadwood_home' };
    this.state.note = { name, property, day: Math.floor(Time.days), kind, short: kind === 'outing' && !this.plan?.enjoyed, done: false };
  }

  public drop(name: string, property: string, destination: 'school' | 'temple'): void {
    if (!this.valid(name, property)) return;
    const end = destination === 'temple' ? 7 : name === 'Robin' ? 8 : 9;
    this.state.visits[name] = { property, until: Time.date.timeStamp + Math.max(0, end * 60 - Time.hour * 60 - Time.minute) * 60, at: name === 'Kylar' ? 'front_courtyard' : destination };
  }

  public get note(): PropertyOutingState['note'] {
    const note = this.state.note;
    return note && !note.done && note.property === this.estate.current?.id && note.day === Math.floor(Time.days) && this.home(note.name, note.property) === true ? note : null;
  }

  public finish(): boolean {
    if (V.passage !== 'Deadwood Reblooms Property Return' || !this.note || V.combat || V.possessed || V.nextPassageCheck) return false;
    this.note.done = true;
    return true;
  }

  public home(name: string, property: string): boolean | null {
    const plan = this.plan;
    if (!this.valid(name, property)) return null;
    if (this.travelling && plan!.name === name) return false;
    if (this.state.visits[name]?.property === property && this.state.visits[name].until > Time.date.timeStamp) return this.state.visits[name].at === 'deadwood_home';
    if (plan?.name !== name || plan.property !== property || !this.waiting) return null;
    if (name === 'Robin') return window.getRobinLocation() === 'deadwood_home';
    if (name === 'Kylar') return window.getKylarLocation().area === 'deadwood_home';
    if (name === 'Sydney') {
      window.sydneySchedule?.();
      return T.sydney_location === 'deadwood_home';
    }
    return true;
  }

  /** 在原版函数返回位置前应用约定；囚禁、伤病和节庆安排仍有优先权。 */
  public location(name: string, original: string): string {
    if (!V.Finance?.real_estate) return original;
    const property = this.estate.residenceOf(name)?.id;
    if (!property || !this.valid(name, property)) return original;
    const ride = this.core.get('Transport')?.state.commute;
    if (ride?.boarded && !ride.arrived && ride.npc === name && ride.property === property) return 'deadwood_outing';
    if (this.travelling && this.plan!.name === name) return 'deadwood_outing';
    if (this.state.visits[name]?.property === property && this.state.visits[name].until > Time.date.timeStamp) return this.state.visits[name].at;
    const plan = this.plan;
    if (plan?.name !== name || !this.waiting) return original;
    const free =
      name === 'Robin'
        ? ['orphanage', 'sleep'].includes(original)
        : name === 'Kylar'
          ? original === 'unknown' && Time.hour >= 18
          : original === 'temple' && Time.hour >= 17 && Time.hour <= 20 && !(Time.weekDay === 1 && V.sydney.rank === 'initiate');
    return free ? 'deadwood_home' : original;
  }

  private advance(): void {
    if (!V.Finance?.real_estate || V.replayScene || V.statFreeze) return;
    for (const [name, visit] of Object.entries(this.state.visits)) if (visit.until <= Time.date.timeStamp || !this.valid(name, visit.property)) delete this.state.visits[name];
    const plan = this.plan;
    if (!plan || !['booked', 'out', 'visit', 'return'].includes(plan.stage)) return;
    if (!this.valid(plan.name, plan.property)) {
      this.abandon();
      plan.stage = 'cancelled';
    } else if (Time.date.timeStamp >= plan.at + (plan.stage === 'booked' ? 1800 : 21600)) {
      this.abandon();
      plan.stage = 'missed';
    }
  }

  public clear(property: string): void {
    if (this.plan?.property === property) {
      this.abandon();
      this.plan.stage = 'cancelled';
    }
    if (this.state.note?.property === property) this.state.note = null;
    for (const [name, visit] of Object.entries(this.state.visits)) if (visit.property === property) delete this.state.visits[name];
  }
}
