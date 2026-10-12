// ./src/module/Finance/PropertyStaff.ts

import terms from '../../assets/finance/household.json';
import type Finance from '../Finance';
import type RealEstate from './RealEstate';

export type StaffRole = keyof typeof terms;
export interface PropertyStaffState {
  contracts: Partial<Record<StaffRole, { employed: boolean; paid_until: number }>>;
  report: { day: number; paid: number; missed: StaffRole[]; left: StaffRole[] } | null;
}

/** 按房产预付周薪，沿用房产的日期结算，不建立另一套雇员或债务账户。 */
export default class PropertyStaff {
  public readonly roles = Object.keys(terms) as StaffRole[];
  public readonly terms = terms;

  public constructor(
    private readonly estate: RealEstate,
    private readonly finance: Finance
  ) {}

  public get selected(): StaffRole {
    return V.Finance.real_estate.staff_role ?? 'housekeeper';
  }

  public get book(): boolean {
    const property = this.estate.current;
    return !!property && this.estate.managementFor(property.id).auction_day === null && this.finance.company.available;
  }

  public get state(): PropertyStaffState | undefined {
    return this.estate.current ? this.record(this.estate.current.id) : undefined;
  }

  private record(id: string): PropertyStaffState {
    return (this.estate.managementFor(id).staff ??= { contracts: {}, report: null });
  }

  public available(role: StaffRole): boolean {
    return this.roles.includes(role) && this.book && (role === 'housekeeper' || this.estate.facilities.some(room => room.id === 'staff_room'));
  }

  public active(role: StaffRole): boolean {
    const property = this.estate.current;
    if (
      !property ||
      !this.roles.includes(role) ||
      this.estate.managementFor(property.id).auction_day !== null ||
      (role !== 'housekeeper' && !this.estate.facilities.some(room => room.id === 'staff_room'))
    )
      return false;
    const contract = this.state?.contracts[role];
    return !!contract?.employed && contract.paid_until > Time.days && terms[role].shifts.some(([start, end]) => Time.hour >= start && Time.hour < end);
  }

  public key(role: StaffRole): string {
    return `deadwood_home_${this.estate.current?.id}_${role}`;
  }

  public hire(role: StaffRole): boolean {
    if (!this.available(role) || this.state!.contracts[role]?.employed || !V.per_npc?.[this.key(role)] || this.finance.payFromBankPennies(terms[role].weeklyWage) !== 'ok') return false;
    this.state!.contracts[role] = { employed: true, paid_until: Math.floor(Time.days) + 7 };
    return true;
  }

  public dismiss(role: StaffRole): boolean {
    const contract = this.state?.contracts[role];
    if (!this.book || !contract?.employed) return false;
    contract.employed = false;
    this.forget(this.estate.current!.id, role);
    return true;
  }

  public renew(role: StaffRole): boolean {
    const contract = this.state?.contracts[role];
    if (!this.available(role) || !contract?.employed || contract.paid_until > Time.days || this.finance.payFromBankPennies(terms[role].weeklyWage) !== 'ok') return false;
    contract.paid_until = Math.floor(Time.days) + 7;
    return true;
  }

  public weekly(id: string): number {
    const contracts = this.estate.managementFor(id).staff?.contracts;
    return this.roles.reduce((sum, role) => sum + (contracts?.[role]?.employed ? terms[role].weeklyWage : 0), 0);
  }

  public advance(day: number): void {
    if (!V.Finance?.real_estate || V.replayScene || V.statFreeze || !Number.isInteger(day) || day < 0) return;
    for (const property of this.estate.properties) {
      const management = this.estate.managementFor(property.id);
      if (!management.staff) continue;
      if (!this.estate.owns(property.id) || management.rented || management.auction_day !== null || this.estate.isFrozen(property.id)) {
        this.clear(property.id);
        continue;
      }
      const state = management.staff;
      const report = { day, paid: 0, missed: [] as StaffRole[], left: [] as StaffRole[] };
      for (const role of this.roles) {
        const contract = state.contracts[role];
        if (!contract?.employed || day < contract.paid_until) continue;
        if (day >= contract.paid_until + 7) {
          contract.employed = false;
          this.forget(property.id, role);
          report.left.push(role);
        } else if (this.finance.payFromBankPennies(terms[role].weeklyWage) === 'ok') {
          contract.paid_until = day + 7;
          report.paid += terms[role].weeklyWage;
        } else report.missed.push(role);
      }
      if (report.paid || report.missed.length || report.left.length) state.report = report;
    }
  }

  public clear(id: string): void {
    const state = this.estate.managementFor(id).staff;
    if (!state) return;
    for (const role of this.roles) {
      if (state.contracts[role]) state.contracts[role]!.employed = false;
      this.forget(id, role);
    }
  }

  private forget(id: string, role: StaffRole): void {
    const key = `deadwood_home_${id}_${role}`;
    if (V.per_npc?.[key]) this.finance.core.SugarCube.Wikifier.wikifyEval(`<<clearNPC ${JSON.stringify(key)}>>`);
  }
}
