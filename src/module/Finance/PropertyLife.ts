// ./src/module/Finance/PropertyLife.ts

import type RealEstate from './RealEstate';
import type { StaffRole } from './PropertyStaff';

type Activity = 'meal' | 'tea' | 'tidy' | 'music' | 'film' | 'wine';

export interface PropertyLifeState {
  days: Record<string, number>;
  scene: { property_id: string; action: Activity; partner: string | null; quality: number; first: boolean; item: string | null; origin: string; floor: number } | null;
  daily_day: number;
  daily: {
    day: number;
    property: string;
    kind: 'resident' | 'staff' | 'house';
    variant: number;
    partner: string | null;
    role: StaffRole | null;
    choice: 'join' | 'help' | 'read' | 'leave' | null;
  } | null;
}

const rooms = ['Home', 'Landing', 'Lounge', 'Kitchen', 'Reception Room', 'Wine Cellar', 'Screening Room'].map(room => `Deadwood Reblooms Property ${room}`);
const minutes: Record<Activity, number> = { meal: 20, tea: 15, tidy: 20, music: 20, film: 45, wine: 20 };

/** 保存居家活动与当天机会，原版食物、技能与时间由点击回调结算。 */
export default class PropertyLife {
  public static readonly defaults: PropertyLifeState = { days: {}, scene: null, daily_day: -1, daily: null };

  public constructor(
    private readonly estate: RealEstate,
    private readonly core: typeof maplebirch
  ) {}

  private get state(): PropertyLifeState {
    const state = (V.Finance.real_estate.life ??= structuredClone(PropertyLife.defaults));
    state.daily_day ??= -1;
    state.daily ??= null;
    return state;
  }

  public preInit(): void {
    this.core.on(':passagestart', () => {
      if (this.core.passage.title === 'Deadwood Reblooms Property Home') this.arrive();
    });
  }

  public get daily(): PropertyLifeState['daily'] {
    return this.state.daily;
  }

  public get pending(): boolean {
    const daily = this.daily;
    const property = this.estate.current;
    if (!daily || daily.choice || !property || daily.property !== property.id || daily.day !== Math.floor(Time.days) || !this.core.get('Finance')?.company.available) return false;
    if (this.estate.managementFor(property.id).auction_day !== null) return false;
    if (daily.kind === 'staff') return !!daily.role && this.estate.staff.active(daily.role) && !!V.per_npc?.[this.estate.staff.key(daily.role)];
    if (daily.kind === 'resident') return !!daily.partner && this.estate.residentsHome(property.id).some(resident => resident.id === daily.partner) && this.free(daily.partner, 10);
    return true;
  }

  public arrive(): void {
    const property = this.estate.current;
    if (!property || !this.core.get('Finance')?.company.available || this.estate.managementFor(property.id).auction_day !== null || this.state.daily_day >= Math.floor(Time.days)) return;
    const residents = this.estate.household.home.filter(resident => (Time.hour >= 21 || (Time.hour >= 5 && Time.hour < 7)) && this.free(resident.id, 10));
    const roles = this.estate.staff.roles.filter(role => this.estate.staff.active(role) && V.per_npc?.[this.estate.staff.key(role)]);
    const kinds: Array<'resident' | 'staff' | 'house'> = ['house'];
    if (residents.length) kinds.push('resident');
    if (roles.length) kinds.push('staff');
    const pick = this.core.SugarCube.Scripting.evalJavaScript('random') as (min: number, max: number) => number;
    const kind = kinds[pick(0, kinds.length - 1)];
    this.state.daily_day = Math.floor(Time.days);
    this.state.daily = {
      day: this.state.daily_day,
      property: property.id,
      kind,
      variant: pick(0, 2),
      partner: kind === 'resident' ? residents[pick(0, residents.length - 1)].id : null,
      role: kind === 'staff' ? roles[pick(0, roles.length - 1)] : null,
      choice: null
    };
  }

  public finish(choice: NonNullable<PropertyLifeState['daily']>['choice']): boolean {
    if (!this.pending || !choice || !['join', 'help', 'read', 'leave'].includes(choice)) return false;
    if (choice !== 'leave' && choice !== ({ resident: 'join', staff: 'read', house: 'help' } as const)[this.daily!.kind]) return false;
    this.daily!.choice = choice;
    return true;
  }

  private free(name: string, duration: number): boolean {
    const end = name === 'Sydney' ? 6 : 7;
    return Time.hour >= end || Time.hour * 60 + Time.minute + duration <= end * 60;
  }

  public get scene(): PropertyLifeState['scene'] {
    return this.state.scene;
  }

  public ready(action: Activity): boolean {
    const property = this.estate.current;
    if (!property || !rooms.includes(V.passage) || V.replayScene || V.statFreeze || V.combat || window.pcAreArmsBound('both') || this.estate.managementFor(property.id).auction_day !== null)
      return false;
    const partner = V.Finance.real_estate.room_companion;
    if (partner && !this.estate.residentsHome(property.id).some(resident => resident.id === partner)) return false;
    if (partner && !this.free(partner, minutes[action])) return false;
    if (['meal', 'tea'].includes(action) && !partner) return false;
    if (action === 'film') return this.estate.facilities.some(room => room.id === 'cinema');
    if (action === 'wine') return this.estate.facilities.some(room => room.id === 'wine_cellar');
    return ['meal', 'tea', 'tidy', 'music'].includes(action);
  }

  public begin(action: Activity, item: string | null = null): boolean {
    this.state.scene = null;
    if (!this.ready(action)) return false;
    if (['meal', 'tea', 'wine'].includes(action)) {
      const food = item ? setup.foodstuff[item] : undefined;
      if (!food || (V.foodstuff[item!]?.amount ?? 0) < (action === 'wine' ? 1 : 2)) return false;
      if (food.food?.tags?.includes('tainted') || (action === 'tea' && food.food?.tags?.includes('alcohol'))) return false;
      if (action === 'wine' ? !['red_wine', 'white_wine'].includes(item!) : food.category !== 'dish' || (food.food?.tags?.includes('drink') ?? false) !== (action === 'tea')) return false;
    }
    const property = this.estate.current!;
    const partner = V.Finance.real_estate.room_companion;
    const key = `${partner ?? 'pc'}:${action}`;
    const first = this.state.days[key] !== Time.days;
    this.state.days[key] = Time.days;
    const supported = this.estate.staff.active(action === 'tidy' ? 'housekeeper' : 'cook') && ['meal', 'tea', 'tidy'].includes(action);
    this.state.scene = {
      property_id: property.id,
      action,
      partner,
      quality: Math.min(2, Number(this.estate.managementFor(property.id).condition >= 60) + Number(supported)),
      first,
      item,
      origin: V.passage,
      floor: this.estate.currentFloor
    };
    return true;
  }

  public clear(id: string): void {
    if (this.state.scene?.property_id === id) this.state.scene = null;
    if (this.state.daily?.property === id) this.state.daily = null;
  }
}
