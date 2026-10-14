const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const migrate = require('../src/module/Finance/Legacy.ts').default;

global.clone = structuredClone;
const copy = structuredClone;
const sourceRoot = path.join(__dirname, '../src/module');
const financeSource = fs.readFileSync(path.join(sourceRoot, 'Finance.ts'), 'utf8');
const equal = (actual, expected) => assert.deepEqual(copy(actual), copy(expected));

// Read trusted source defaults so migration fixtures track the shipped schema.
function objectExpression(source, start) {
  start = source.indexOf('{', start);
  assert(start >= 0);
  let depth = 0,
    quote = null,
    escaped = false;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
    } else if (char === "'" || char === '"' || char === '`') quote = char;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unterminated source default expression');
}
function defaults(source, marker, bindings = {}) {
  const position = source.indexOf(marker);
  assert(position >= 0, marker);
  return copy(vm.runInNewContext(`(${objectExpression(source, source.indexOf('=', position))})`, bindings));
}
function classDefaults(name, bindings) {
  return defaults(fs.readFileSync(path.join(sourceRoot, `Finance/${name}.ts`), 'utf8'), 'static readonly defaults', bindings);
}
const estateDefaults = classDefaults('RealEstate', {
  PropertyLife: { defaults: classDefaults('PropertyLife') },
  PropertyBanquet: { defaults: classDefaults('PropertyBanquet') },
  PropertyOutings: { defaults: classDefaults('PropertyOutings') }
});
const financeDefaults = defaults(financeSource, 'const DEFAULT_FINANCE_STATE', {
  RealEstate: { defaults: estateDefaults },
  MarginTrading: { defaults: classDefaults('MarginTrading') },
  Newspaper: { defaults: classDefaults('Newspaper') },
  Orphanage: { defaults: classDefaults('Orphanage') },
  Recognition: { defaults: classDefaults('Recognition') },
  Company: { defaults: { name: null, office: false, completed: 0, contract: null } },
  Industry: { defaults: { selected: 0, factories: [], distribution: {}, purchase_week: -1 } },
  Donations: { defaults: { total: { school: 0 }, receipts: [] } }
});

function fixture() {
  const current = copy(financeDefaults);
  current.brokerage.holdings = { AVY: 0, NEW: 0 };
  current.brokerage.costs = { AVY: 0, NEW: 0 };
  const oldBank = copy(current.bank);
  delete oldBank.loan_project;
  Object.assign(oldBank, {
    opened: true,
    opened_day: 40,
    debit_card: true,
    credit_card: true,
    payment_method: 'debit',
    balance: 11_667_707_451_500,
    peak_balance: 11_667_707_451_500,
    bailey_knows_account: true,
    credit_debt: 90000,
    credit_due_day: 143,
    credit_missed_payments: 1,
    bank_interest_last_day: 138,
    loan_debt: 250000,
    loan_payment: 35000,
    loan_rate: 0.0175,
    loan_term: 30,
    loan_due_day: 160,
    loan_next_payment_day: 144,
    loan_interest_last_day: 137,
    loan_missed_payments: 2,
    atm_withdrawn: 3000,
    atm_week: 19
  });
  // v1.4.4 brokerage had only opened, cash and holdings; market had no history or supply.
  const legacy = {
    finance: {
      bank: oldBank,
      brokerage: { opened: true, cash: 1_995_550_000, holdings: { AVY: 100, RMY: 100, OBC: 100, HSF: 100, MER: 100, HSC: 100, DSP: 100, ELK: 200, RETIRED: 31 } },
      market: { seed: 7131, day: 139, prices: { AVY: 831400, RETIRED: 42 }, previous_prices: { AVY: 830000 }, farm_stage: 12, pending_farm_moves: { RMY: -0.1 } }
    },
    real_estate: {
      owned: { flat: true },
      visiting: null,
      floor: 1,
      last_managed_day: 139,
      mortgage: {
        property_id: 'flat',
        outstanding: 400000,
        arrears: 1000,
        weekly_payment: 12000,
        next_payment_day: 145,
        last_interest_day: 139,
        last_day: 139,
        maturity_day: 220,
        stage: 'current',
        notice_day: null,
        frozen_day: null,
        bailey_pending: false,
        fight_used: false
      },
      management: {
        flat: { condition: 87, renovation: 0, rented: true, lease_end_day: 170, auction_day: null, next_settlement_day: 145, bed_id: 'double', wardrobe_id: 'basic', furnishings: { bed: 'double' } }
      },
      residents: { flat: ['Robin'] },
      household_message: null,
      meeting_resident: null,
      daily_evening: [],
      daily_night_wake: false,
      glide_scared_day: -1,
      last_auction: { property_id: 'cottage', kind: 'voluntary', proceeds: 500000, debt: 400000, surplus: 100000, day: 130 }
    },
    adrian: { last_offence: 'queue', visits: 9, career: 2, lastVisit: 139, lastChat: 138, accountDiscussed: true, homeDiscussed: true, careerReadyDay: 145, businessDay: 139, businessDays: 3 },
    unrelated: { preserved: true }
  };
  return { current, legacy };
}

test('first upgrade migrates large amounts, shares, liabilities and cursors exactly', () => {
  const { current, legacy } = fixture(),
    beforeCurrent = copy(current),
    beforeLegacy = copy(legacy);
  const result = migrate(current, legacy, 140);
  assert.notEqual(result, current);
  for (const [field, value] of Object.entries(legacy.finance.bank)) equal(result.bank[field], value);
  assert.equal(result.bank.balance, 11_667_707_451_500);
  assert.equal(result.brokerage.cash, 1_995_550_000);
  for (const [symbol, shares] of Object.entries(legacy.finance.brokerage.holdings)) assert.equal(result.brokerage.holdings[symbol], shares);
  assert.equal(result.brokerage.holdings.NEW, 0);
  assert.equal(result.bank.loan_project, null);
  assert.equal(result.legacy_vanilla_plus_migrated, true);
  equal(current, beforeCurrent);
  equal(legacy, beforeLegacy);
});
test('automatic quote and date initialization do not prevent migration', () => {
  const { current, legacy } = fixture();
  Object.assign(current.market, {
    day: 140,
    seed: 9999,
    prices: { NEW: 50000 },
    previous_prices: { NEW: 48000 },
    shares: { NEW: { total: 10000, listed: 1000 } },
    history: [{ day: 140, prices: { NEW: 50000 } }]
  });
  Object.assign(current.bank, { bank_interest_last_day: 140, loan_interest_last_day: 140, atm_week: 20 });
  current.brokerage.dividend_day = 139;
  current.real_estate.last_managed_day = 140;
  const result = migrate(current, legacy, 140);
  assert.equal(result.bank.balance, legacy.finance.bank.balance);
  assert.equal(result.bank.bank_interest_last_day, 138);
  assert.equal(result.market.seed, 7131);
  assert.equal(result.market.day, 139);
  assert.equal(result.market.prices.NEW, 50000);
  assert.equal(result.market.prices.RETIRED, 42);
  assert.equal(result.market.previous_prices.NEW, 48000);
  equal(result.market.shares, current.market.shares);
  equal(result.market.history, []);
  assert.equal(result.real_estate.last_managed_day, 139);
});
test('new brokerage defaults survive and historical dividends are not paid again', () => {
  const { current, legacy } = fixture(),
    result = migrate(current, legacy, 140);
  for (const field of ['costs', 'unsettled', 'realised', 'dividends', 'margin']) equal(result.brokerage[field], current.brokerage[field]);
  assert.equal(result.brokerage.dividend_day, 140);
  legacy.finance.brokerage.opened = false;
  assert.equal(migrate(current, legacy, 140).brokerage.dividend_day, -1);
});
test('legacy mortgage and property records gain required fields without losing debt', () => {
  const { current, legacy } = fixture(),
    result = migrate(current, legacy, 140),
    estate = result.real_estate;
  for (const [field, value] of Object.entries(legacy.real_estate.mortgage)) equal(estate.mortgage[field], value);
  assert.equal(estate.mortgage.purpose, 'purchase');
  assert.equal(estate.mortgage.weekly_rate, 0.0035);
  for (const [field, value] of Object.entries(legacy.real_estate.management.flat)) equal(estate.management.flat[field], value);
  equal(estate.management.flat.upgrades, []);
  equal(estate.management.flat.affection_days, {});
  assert.equal(estate.management.flat.rest_day, -1);
  assert.equal(estate.management.flat.vacancy_until, 0);
  assert.equal(estate.management.flat.rental_issue, null);
  assert.equal(estate.last_auction.shortfall, 0);
  equal(estate.life, current.real_estate.life);
  equal(estate.banquet, current.real_estate.banquet);
});
test('existing legacy extension fields, explicit mortgage rate and cursors survive', () => {
  const { current, legacy } = fixture();
  Object.assign(legacy.real_estate.mortgage, { purpose: 'collateral', weekly_rate: 0.012 });
  Object.assign(legacy.real_estate.management.flat, { upgrades: ['pool'], rest_day: 137, affection_days: { Robin: 132 }, vacancy_until: 150, rental_issue: { type: 'leak', rent: 1000, day: 135 } });
  legacy.finance.brokerage.dividend_day = 132;
  const result = migrate(current, legacy, 140);
  equal(result.real_estate.mortgage, legacy.real_estate.mortgage);
  equal(result.real_estate.management.flat, legacy.real_estate.management.flat);
  assert.equal(result.brokerage.dividend_day, 132);
});
test('Adrian camel-case progress maps to current names', () => {
  const { current, legacy } = fixture(),
    result = migrate(current, legacy, 140);
  for (const [old, next] of Object.entries({
    last_offence: 'last_offence',
    visits: 'visits',
    career: 'career',
    lastVisit: 'last_visit',
    lastChat: 'last_chat',
    accountDiscussed: 'account_discussed',
    homeDiscussed: 'home_discussed',
    careerReadyDay: 'career_ready_day',
    businessDay: 'business_day',
    businessDays: 'business_days'
  }))
    assert.equal(result.adrian[next], legacy.adrian[old]);
  assert.equal(result.adrian.service_location, 'financial_centre');
});
test('new-only company, industry, donation and other progress is retained', () => {
  const { current, legacy } = fixture();
  current.company.office = true;
  current.company.name = 'NewCo';
  current.company.completed = 9;
  current.industry.factories.push({ site: 1, owned: 'new', cash: 123400 });
  current.donations.receipts.push({ fund: 'school', amount: 5000, day: 139 });
  const result = migrate(current, legacy, 140);
  for (const field of ['company', 'industry', 'donations', 'newspaper', 'orphanage', 'recognition', 'collection']) equal(result[field], current[field]);
});

const malformedCases = [
  [
    'finance',
    'empty finance object',
    legacy => {
      legacy.finance = {};
    }
  ],
  [
    'finance',
    'NaN bank balance',
    legacy => {
      legacy.finance.bank.balance = NaN;
    }
  ],
  [
    'finance',
    'string bank balance',
    legacy => {
      legacy.finance.bank.balance = '500';
    }
  ],
  [
    'finance',
    'unsafe bank balance',
    legacy => {
      legacy.finance.bank.balance = Number.MAX_SAFE_INTEGER + 1;
    }
  ],
  [
    'finance',
    'negative holding',
    legacy => {
      legacy.finance.brokerage.holdings.AVY = -1;
    }
  ],
  [
    'finance',
    'invalid loan payment',
    legacy => {
      legacy.finance.bank.loan_payment = NaN;
    }
  ],
  [
    'finance',
    'string loan rate',
    legacy => {
      legacy.finance.bank.loan_rate = 'bad';
    }
  ],
  [
    'finance',
    'string loan due day',
    legacy => {
      legacy.finance.bank.loan_due_day = '20';
    }
  ],
  [
    'estate',
    'null management',
    legacy => {
      legacy.real_estate.management = null;
    }
  ],
  [
    'estate',
    'NaN mortgage debt',
    legacy => {
      legacy.real_estate.mortgage.outstanding = NaN;
    }
  ],
  [
    'estate',
    'NaN mortgage rate',
    legacy => {
      legacy.real_estate.mortgage.weekly_rate = NaN;
    }
  ],
  [
    'estate',
    'string mortgage payment day',
    legacy => {
      legacy.real_estate.mortgage.next_payment_day = '20';
    }
  ],
  [
    'adrian',
    'null Adrian',
    legacy => {
      legacy.adrian = null;
    }
  ],
  [
    'adrian',
    'string Adrian',
    legacy => {
      legacy.adrian = 'unusable';
    }
  ],
  [
    'adrian',
    'array Adrian',
    legacy => {
      legacy.adrian = [];
    }
  ],
  [
    'adrian',
    'invalid Adrian visits',
    legacy => {
      legacy.adrian.visits = '9';
    }
  ]
];
for (const [block, reason, damage] of malformedCases)
  test(`malformed ${block} (${reason}) isolates only that block`, () => {
    const { current, legacy } = fixture();
    damage(legacy);
    const beforeCurrent = copy(current),
      beforeLegacy = copy(legacy);
    const result = migrate(current, legacy, 140);
    for (const field of block === 'finance' ? ['bank', 'brokerage', 'market'] : [block === 'estate' ? 'real_estate' : 'adrian']) equal(result[field], beforeCurrent[field]);
    if (block !== 'finance') assert.equal(result.bank.balance, 11_667_707_451_500);
    if (block !== 'estate') assert.equal(result.real_estate.owned.flat, true);
    if (block !== 'adrian') assert.equal(result.adrian.visits, 9);
    assert.equal(result.legacy_vanilla_plus_migrated, true);
    equal(current, beforeCurrent);
    equal(legacy, beforeLegacy);
  });

const usedCases = [
  [
    'finance',
    'opened bank',
    state => {
      state.bank.opened = true;
    }
  ],
  [
    'finance',
    'bank balance',
    state => {
      state.bank.balance = 1;
    }
  ],
  [
    'finance',
    'bank authorization',
    state => {
      state.bank.bailey_knows_account = true;
    }
  ],
  [
    'finance',
    'existing loan',
    state => {
      state.bank.loan_debt = 1;
    }
  ],
  [
    'finance',
    'brokerage holding',
    state => {
      state.brokerage.holdings.AVY = 1;
    }
  ],
  [
    'finance',
    'brokerage costs',
    state => {
      state.brokerage.costs.AVY = 1;
    }
  ],
  [
    'finance',
    'margin history',
    state => {
      state.brokerage.margin.history.push({ day: 140 });
    }
  ],
  [
    'finance',
    'collection',
    state => {
      state.collection.amount = 1;
    }
  ],
  [
    'estate',
    'owned property',
    state => {
      state.real_estate.owned.newFlat = true;
    }
  ],
  [
    'estate',
    'mortgage',
    state => {
      state.real_estate.mortgage = { outstanding: 500 };
    }
  ],
  [
    'estate',
    'resident',
    state => {
      state.real_estate.residents.newFlat = ['Sydney'];
    }
  ],
  [
    'estate',
    'management',
    state => {
      state.real_estate.management.newFlat = { condition: 100 };
    }
  ],
  [
    'adrian',
    'visit',
    state => {
      state.adrian.visits = 1;
    }
  ],
  [
    'adrian',
    'chat',
    state => {
      state.adrian.last_chat = 139;
    }
  ],
  [
    'adrian',
    'business',
    state => {
      state.adrian.business_days = 1;
    }
  ],
  [
    'adrian',
    'offence',
    state => {
      state.adrian.last_offence = 'insult';
    }
  ]
];
for (const [block, reason, mutate] of usedCases)
  test(`skip used ${block} (${reason}) independently and permanently`, () => {
    const { current, legacy } = fixture();
    mutate(current);
    const before = copy(current);
    const result = migrate(current, legacy, 140);
    for (const field of block === 'finance' ? ['bank', 'brokerage', 'market'] : [block === 'estate' ? 'real_estate' : 'adrian']) equal(result[field], before[field]);
    if (block !== 'finance') assert.equal(result.bank.balance, legacy.finance.bank.balance);
    if (block !== 'estate') assert.equal(result.real_estate.owned.flat, true);
    if (block !== 'adrian') assert.equal(result.adrian.visits, 9);
    // Reset the skipped block to defaults; the attempted-upgrade marker must still prevent old progress returning.
    for (const field of block === 'finance' ? ['bank', 'brokerage', 'market'] : [block === 'estate' ? 'real_estate' : 'adrian']) result[field] = copy(financeDefaults[field]);
    const reset = copy(result);
    assert.equal(migrate(result, legacy, 141), result);
    equal(result, reset);
    equal(current, before);
  });
test('repeat loads cannot resurrect spent assets, closed accounts or reset progress', () => {
  const { current, legacy } = fixture();
  const result = migrate(current, legacy, 140);
  result.bank = copy(financeDefaults.bank);
  result.brokerage = copy(financeDefaults.brokerage);
  result.real_estate = copy(financeDefaults.real_estate);
  result.adrian = copy(financeDefaults.adrian);
  const before = copy(result);
  assert.equal(migrate(result, legacy, 200), result);
  equal(result, before);
  assert.equal(result.bank.balance, 0);
  assert.equal(result.bank.opened, false);
  equal(result.brokerage.holdings, {});
});
test('partial legacy blocks migrate independently', () => {
  for (const field of ['finance', 'real_estate', 'adrian']) {
    const { current, legacy } = fixture();
    const result = migrate(current, { [field]: legacy[field] }, 140);
    if (field === 'finance') assert.equal(result.bank.balance, legacy.finance.bank.balance);
    else equal(result.bank, current.bank);
    if (field === 'real_estate') assert.equal(result.real_estate.owned.flat, true);
    else equal(result.real_estate, current.real_estate);
    if (field === 'adrian') assert.equal(result.adrian.visits, 9);
    else equal(result.adrian, current.adrian);
    assert.equal(result.legacy_vanilla_plus_migrated, true);
  }
});
test('new games and unrelated VanillaPlus data receive no migration marker', () => {
  for (const legacy of [undefined, {}, { lock: { beauty: false } }]) {
    const current = copy(financeDefaults),
      before = copy(current);
    assert.equal(migrate(current, legacy, 0), current);
    assert.equal(current.legacy_vanilla_plus_migrated, undefined);
    equal(current, before);
  }
});
test('different saves and legacy source objects share no mutable migration state', () => {
  const one = fixture(),
    two = fixture();
  two.legacy.finance.bank.balance = 500;
  const oneResult = migrate(one.current, one.legacy, 140),
    twoResult = migrate(two.current, two.legacy, 50);
  const legacyBefore = copy(one.legacy);
  assert.equal(twoResult.bank.balance, 500);
  assert.equal(twoResult.brokerage.dividend_day, 50);
  oneResult.bank.balance = 0;
  oneResult.brokerage.holdings.AVY = 0;
  oneResult.real_estate.management.flat.condition = 0;
  oneResult.real_estate.residents.flat.push('Sydney');
  equal(one.legacy, legacyBefore);
  assert.equal(twoResult.brokerage.holdings.AVY, 100);
  assert.equal(twoResult.real_estate.management.flat.condition, 87);
  assert.equal(one.current.legacy_vanilla_plus_migrated, undefined);
});

test('Finance.variable fills defaults before migration and returns migrated state on the first event', () => {
  const { legacy } = fixture(),
    V = { VanillaPlus: legacy },
    calls = [];
  const methodPosition = financeSource.indexOf('protected override variable(): void');
  assert(methodPosition >= 0);
  const methodBody = objectExpression(financeSource, methodPosition);
  const dayPosition = financeSource.indexOf('private static get currentDay(): number');
  assert(dayPosition >= 0);
  const dayBody = objectExpression(financeSource, dayPosition);
  const Module = class {
    variable() {
      calls.push('fill');
      V.Finance ??= copy(financeDefaults);
    }
  };
  const Finance = vm.runInNewContext(`(class Finance extends Module { variable() ${methodBody} static get currentDay() ${dayBody} })`, {
    Module,
    V,
    Time: { days: 140.75 },
    migrateLegacyFinance(state, old, day) {
      calls.push('migrate');
      assert.equal(state.brokerage.margin.next_id, 1);
      assert.equal(day, 140);
      return migrate(state, old, day);
    }
  });
  const instance = new Finance();
  instance.variable();
  equal(calls, ['fill', 'migrate']);
  assert.equal(V.Finance.bank.balance, legacy.finance.bank.balance);
  assert.equal(V.Finance.brokerage.dividend_day, 140);
  const firstState = V.Finance;
  firstState.bank.balance = 0;
  instance.variable();
  assert.equal(V.Finance, firstState);
  assert.equal(V.Finance.bank.balance, 0);
  equal(calls, ['fill', 'migrate', 'fill', 'migrate']);
});
