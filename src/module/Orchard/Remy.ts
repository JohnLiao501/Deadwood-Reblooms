// ./src/module/Orchard/Remy.ts

import type Orchard from '../Orchard';

interface RemyPregnancyConversation {
  disclosed: boolean;
  plan: '' | 'discuss_together';
  day: number;
  topics: string[];
  place?: string;
  reflection?: 'care' | 'independent';
  ended_day?: number;
  sample?: boolean;
  tested?: boolean;
}

class Remy {
  public static readonly defaults = {
    visits: 0,
    dates: 0,
    romance: false,
    ended: false,
    last_meeting_day: -1,
    last_daily_day: -1,
    last_gift_type: '',
    gift_from_farm: false,
    gift_followup_day: -1,
    date_kind: 'walk',
    date_topic_day: -1,
    last_talk_day: -1,
    last_gift_day: -1,
    last_date_day: -1,
    pregnancy: {
      records: {} as Record<number, RemyPregnancyConversation>,
      id: -1,
      testId: -1,
      origin: '',
      location: ''
    }
  };

  public constructor(private readonly orchard: Orchard) {}

  public preInit(): void {
    this.orchard.core.npc.Pregnancy.add('Remy', { canBePregnant: true, canImpregnatePlayer: true });
    this.orchard.core.npc.add({ nam: 'Remy' }, { important: true, loveInterest: true, romance: [() => V.Orchard?.remy?.romance === true] });
  }

  public get state(): typeof Remy.defaults {
    return this.orchard.state.remy;
  }

  private get ready(): boolean {
    return !!V.Orchard?.remy && C.npc.Remy?.init === 1 && !V.statFreeze && !V.replayScene && V.combat !== 1 && V.stress < V.stressmax;
  }

  public get available(): boolean {
    return this.ready && V.location === 'riding_school' && V.remySeen?.includes('riding_school') && Time.dayState !== 'night' && Time.hour !== V.closinghour && V.exposed <= 0 && !V.gag;
  }

  public get captive(): boolean {
    return this.ready && this.orchard.core.passage.title === 'Livestock Cell Remy' && !!V.livestock && !V.gag;
  }

  public get farmConflict(): boolean {
    return V.farm_stage >= 7 && !!V.remySeen?.includes('farm');
  }

  public get inLabour(): boolean {
    const records: { carrier: string; deliveredDate: number | null; waterBreaking?: boolean }[] = V.pregnancies ?? [];
    return records.some(record => ['pc', 'Remy'].includes(record.carrier) && record.deliveredDate === null && !!record.waterBreaking);
  }

  public get canTalk(): boolean {
    return (this.available || this.captive) && !this.inLabour && this.state.last_talk_day !== Time.days;
  }

  public get giftTypes(): string[] {
    return Object.keys(setup.foodstuff ?? {}).filter(type => {
      const data = setup.foodstuff[type];
      return (data.category === 'dish' || data.category === 'fruit') && (V.foodstuff?.[type]?.amount ?? 0) > (this.orchard.state.reserve[type as keyof typeof this.orchard.state.reserve] ?? 0);
    });
  }

  public get canGift(): boolean {
    return (
      this.available &&
      !this.inLabour &&
      !window.pcAreArmsBound('both') &&
      this.state.last_gift_day !== Time.days &&
      !V.daily?.giftedFood?.Remy &&
      this.giftTypes.length > 0 &&
      Time.hour * 60 + Time.minute + 5 < V.closinghour * 60
    );
  }

  public preference(type: string): 'favourite' | 'spicy' | 'sour' | 'alcohol' | 'drink' | 'ordinary' {
    if (type === 'scone') return 'favourite';
    if (setup.foodstuff[type]?.food?.tags?.includes('alcohol')) return 'alcohol';
    if (setup.foodstuff[type]?.food?.tags?.includes('spicy')) return 'spicy';
    if (type === 'lemon' || type === 'blood_lemon') return 'sour';
    return setup.foodstuff[type]?.food?.tags?.includes('drink') ? 'drink' : 'ordinary';
  }

  public ownHarvest(type: string): boolean {
    return !!this.orchard.state.unlocked.farm && this.orchard.state.farm.some(tree => tree?.species === type && tree.harvests > 0);
  }

  public giveFood(type: string, fromFarm = false): boolean {
    if (this.orchard.core.passage.title !== 'Deadwood Remy Gift' || !this.canGift || !this.giftTypes.includes(type) || (fromFarm && !this.ownHarvest(type))) return false;
    this.state.last_gift_day = Time.days;
    this.state.last_meeting_day = Time.days;
    this.state.last_gift_type = type;
    this.state.gift_from_farm = fromFarm;
    V.gift = type;
    V.daily.giftedFood ??= {};
    this.orchard.core.SugarCube.Wikifier.wikifyEval('<<give_gift "Remy">>');
    return true;
  }

  public finishGift(): boolean {
    if (this.orchard.core.passage.title !== 'Deadwood Remy Gift' || !this.available || this.state.last_gift_day !== Time.days || this.state.gift_followup_day === Time.days) return false;
    this.state.gift_followup_day = Time.days;
    return true;
  }

  public get stage(): 'new' | 'familiar' | 'courting' | 'partner' | 'close' | 'former' {
    if (this.state.romance) return C.npc.Remy.love >= 50 && this.state.dates >= 5 ? 'close' : 'partner';
    if (this.state.ended) return 'former';
    if (this.state.dates >= 2 && C.npc.Remy.love >= 30) return 'courting';
    return this.state.visits >= 3 ? 'familiar' : 'new';
  }

  public get daysAway(): number {
    const last = Math.max(this.state.last_meeting_day, this.state.last_talk_day, this.state.last_gift_day, this.state.last_date_day);
    return last < 0 ? 0 : Time.days - last;
  }

  public get pregnancyTopic(): 'pc' | 'Remy' | 'children' | null {
    const records: { pregnancyId: number; carrier: string; deliveredDate: number | null }[] = V.pregnancies ?? [];
    const discussed = records.filter(record => this.state.pregnancy.records[record.pregnancyId]?.disclosed && record.carrier !== 'cleared');
    const active = discussed.find(record => record.deliveredDate === null);
    if (active?.carrier === 'pc' || active?.carrier === 'Remy') return active.carrier;
    return discussed.some(record => record.deliveredDate !== null) ? 'children' : null;
  }

  public get canDaily(): boolean {
    return this.available && !this.inLabour && this.state.visits >= 3 && this.state.last_daily_day !== Time.days && Time.hour * 60 + Time.minute + 15 < V.closinghour * 60;
  }

  public daily(action: 'rest' | 'tack' | 'rota' | 'relationship'): boolean {
    if (this.orchard.core.passage.title !== 'Deadwood Remy Daily' || !this.canDaily || !['rest', 'tack', 'rota', 'relationship'].includes(action)) return false;
    if (action === 'tack' && window.pcAreArmsBound('both')) return false;
    if (action === 'relationship' && !this.state.romance && !this.state.ended) return false;
    this.state.last_daily_day = Time.days;
    this.state.last_meeting_day = Time.days;
    return true;
  }

  public get dateOptions(): ('walk' | 'tea' | 'picnic')[] {
    const options: ('walk' | 'tea' | 'picnic')[] = ['tea'];
    if (!['rain', 'snow'].includes(Weather.precipitation) && Time.season !== 'winter') options.push('walk');
    if (options.includes('walk') && this.state.romance && this.state.dates >= 2) options.push('picnic');
    return options;
  }

  public startDate(kind: 'walk' | 'tea' | 'picnic'): boolean {
    if (this.orchard.core.passage.title !== 'Deadwood Remy Dates' || !this.canDate || !this.dateOptions.includes(kind)) return false;
    this.state.date_kind = kind;
    return true;
  }

  public dateTopic(): boolean {
    if (this.orchard.core.passage.title !== 'Deadwood Remy Date' || !this.available || this.state.last_date_day !== Time.days || this.state.date_topic_day === Time.days) return false;
    this.state.date_topic_day = Time.days;
    return true;
  }

  public get canDate(): boolean {
    return (
      this.available && !this.inLabour && !window.pcAreArmsBound('both') && this.state.visits >= 3 && C.npc.Remy.love >= 20 && this.state.last_date_day !== Time.days && Time.hour + 1 < V.closinghour
    );
  }

  public get canCourt(): boolean {
    return this.available && !this.inLabour && !window.pcAreArmsBound('both') && !this.state.romance && this.state.visits >= 5 && this.state.dates >= 2 && C.npc.Remy.love >= 30;
  }

  public act(action: 'talk' | 'confront' | 'gift' | 'date' | 'romance' | 'break'): boolean {
    const passage = this.orchard.core.passage.title;
    if (action === 'break') {
      if ((!this.available || passage !== 'Deadwood Remy Conversation') && !this.captive) return false;
      if (!this.state.romance) return false;
      this.orchard.core.SugarCube.Wikifier.wikifyEval('<<loveInterestRemove "Remy">>');
      this.state.romance = false;
      this.state.ended = true;
      return true;
    }
    if (!this.available) return false;
    if (action === 'talk' || action === 'confront') {
      if (!['Deadwood Remy Talk', 'Deadwood Remy Business'].includes(passage) || !this.canTalk) return false;
      this.state.last_talk_day = Time.days;
      this.state.last_meeting_day = Time.days;
      if (action === 'talk') this.state.visits++;
    } else if (action === 'gift') {
      return this.giveFood('apple');
    } else if (action === 'date') {
      if (passage !== 'Deadwood Remy Date' || !this.canDate) return false;
      this.state.last_date_day = Time.days;
      this.state.dates++;
      this.state.last_meeting_day = Time.days;
    } else if (action === 'romance') {
      if (passage !== 'Deadwood Remy Promise' || !this.canCourt) return false;
      this.state.romance = true;
      this.state.ended = false;
      return true;
    } else return false;
    return true;
  }
}

export default Remy;
