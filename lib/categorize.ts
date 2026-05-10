import type { Category } from "./anthropic";

// Maps Akahu's personal_finance category names → our 21 categories
export const AKAHU_CATEGORY_MAP: Record<string, Category> = {
  Groceries: "Groceries",
  Supermarkets: "Groceries",
  "Supermarkets & Groceries": "Groceries",
  "Restaurants & Cafes": "Dining & takeaway",
  Restaurants: "Dining & takeaway",
  Cafes: "Dining & takeaway",
  "Fast Food": "Dining & takeaway",
  Takeaways: "Dining & takeaway",
  "Food & Drink": "Dining & takeaway",
  Alcohol: "Alcohol",
  "Alcohol & Bars": "Alcohol",
  "Bars & Clubs": "Alcohol",
  Petrol: "Fuel",
  "Petrol & Gas": "Fuel",
  Fuel: "Fuel",
  "Gas Stations": "Fuel",
  "Public Transport": "Transport",
  Taxis: "Transport",
  "Taxis & Ridesharing": "Transport",
  Ridesharing: "Transport",
  Parking: "Transport",
  Transport: "Transport",
  Transportation: "Transport",
  Shopping: "Shopping",
  Clothing: "Shopping",
  Electronics: "Shopping",
  "Department Stores": "Shopping",
  Retail: "Shopping",
  Health: "Health & medical",
  "Health & Pharmacy": "Health & medical",
  Pharmacy: "Health & medical",
  "Doctors & Dentists": "Health & medical",
  Healthcare: "Health & medical",
  Power: "Utilities",
  Electricity: "Utilities",
  Water: "Utilities",
  Utilities: "Utilities",
  "Bills & Utilities": "Utilities",
  Internet: "Phone & internet",
  Mobile: "Phone & internet",
  Phone: "Phone & internet",
  Telecommunications: "Phone & internet",
  Insurance: "Insurance",
  Streaming: "Subscriptions",
  Subscriptions: "Subscriptions",
  Gaming: "Subscriptions",
  "Home Loan": "Mortgage & loan",
  Mortgage: "Mortgage & loan",
  "Personal Loan": "Mortgage & loan",
  "Car Loan": "Car loan",
  "Vehicle Finance": "Car loan",
  Income: "Income",
  "Wages & Salary": "Income",
  Salary: "Income",
  "Government Benefits": "Income",
  Investments: "Income",
  Transfers: "Transfers to others",
  Transfer: "Transfers to others",
  "Bank Fees": "Fees & fines",
  Fees: "Fees & fines",
  "Government Fees": "Fees & fines",
  Rates: "Rates",
  Travel: "Travel",
  Flights: "Travel",
  Hotels: "Travel",
  Accommodation: "Travel",
};

export function mapAkahuCategory(name: string): Category | null {
  return AKAHU_CATEGORY_MAP[name] ?? null;
}

// Strip common NZ bank description prefixes and trailing location codes
export function normalizeKey(input: string): string {
  return input
    .toLowerCase()
    .replace(
      /^(eftpos\s+|visa purchase\s+|visa\s+|paywave\s+|mastercard\s+|direct debit\s+|direct credit\s+|internet banking transfer (to|from)\s+|internet banking (to|from)\s+|internet trf\s+|auto payment\s+|standing order\s+|online eftpos\s+)/i,
      ""
    )
    .replace(/\s+nz(l)?\s*$/i, "")
    .replace(/\s+[a-z]{3,8}\s+nz(l)?\s*$/i, "") // "AUCKLA NZL", "SYLVIA PA NZL"
    .replace(/['']/g, "")
    .replace(/[^a-z0-9 .]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDomain(url: string): string {
  try {
    const u = url.startsWith("http") ? url : `https://${url}`;
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return url.toLowerCase();
  }
}

export interface TxnSignals {
  merchantName?: string | null;
  description: string;
  merchantWebsite?: string | null;
  amount: number;
}

type RuleDef = {
  patterns: RegExp[];
  websitePatterns?: RegExp[];
  category: Category;
};

// Rules checked in order — first match wins.
// Key ordering: Alcohol before Groceries, Dining before Transport, Subscriptions before Shopping.
const RULES: RuleDef[] = [
  // ── INCOME ────────────────────────────────────────────────────────────────
  {
    patterns: [
      /\b(salary|wages|payroll|pay run|payday)\b/,
      /^(salary|wages)\b/,
      /\b(work and income|winz|msd benefit)\b/,
      /\bstudylink\b/,
      /\b(ird refund|inland revenue refund|tax refund)\b/,
      /\b(acc payment|acc weekly|acc lump)\b/,
      /\b(dividend|interest earned|term deposit matur)\b/,
      // Incoming transfers from others (positive money = someone paid you)
      /\btransfer from\b/,
      /\bpayment from\b/,
      /\bbill payment [a-z]/,  // "Bill Payment JOHN SMITH" incoming
    ],
    category: "Income",
  },

  // ── TRANSFERS TO OTHERS ───────────────────────────────────────────────────
  {
    patterns: [
      /internet banking (transfer )?to\b/,
      /internet trf to\b/,
      /^transfer to\s/,
      /^ib transfer to\b/,
      /^online transfer to\b/,
      /\bauto payment to\b/,
      /\bstanding order to\b/,
      /\bkiwisaver\b/,       // KiwiSaver contributions
      /\bvoluntary kiwisaver\b/,
    ],
    category: "Transfers to others",
  },

  // ── ALCOHOL (before Groceries — catches "Countdown Liquor") ───────────────
  {
    patterns: [
      /\b(liquorland|liquor land)\b/,
      /\b(bottle.?o|the bottle.?o)\b/,
      /\b(super liquor|superliquor)\b/,
      /\b(glengarry|vino fino|liquor king|mount liquor)\b/,
      /\bfirst choice liquor\b/,
      /\b(countdown|pak.?n.?save|new world)\s+liquor\b/,
      // Generic bar/pub/tavern/winery patterns
      /\b(pub|tavern|saloon|taphouse|tap house)\b/,
      /\bwine (bar|cellar|room|shop)\b/,
      /\b(winery|vineyard|cellar door)\b/,
      /\bbrewery\b/,
      /\btaproom\b/,
      /\b(sports bar|cocktail bar|rooftop bar)\b/,
      // Ends with "bar" or "pub" — "The Shoreline Bar", "First Mates Bar"
      /\bbar$/, /\bpub$/,
      // Common NZ bar name patterns
      /\b(first mates|last laugh|ale house|alehouse)\b/,
    ],
    category: "Alcohol",
  },

  // ── GROCERIES ─────────────────────────────────────────────────────────────
  {
    patterns: [
      /\bpak.?n.?save\b/,
      /\bpaknsave\b/,
      /\bcountdown\b/,
      /\bnew world\b/,
      /\b(four square|foursquare)\b/,
      /\b(freshchoice|fresh choice)\b/,
      /\bsuper value\b/,
      /\b(farro fresh|huckleberry)\b/,
      /\bmoore wilsons?\b/,
      /\bwoolworths\b/,
      /\baldi\b/,
      /\bcostco\b/,
      /\bsupervalu\b/,
      /\bnight.?n.?day\b/,  // convenience stores
      /\bbutch(er|ery|ers)\b/,  // Torbay Village Butchery
      /\bdeli\b/,
      /\bgreen.?grocer\b/,
      /\bfarm.?gate\b/,
      /\bco.?op (food|market)\b/,
    ],
    category: "Groceries",
  },

  // ── FUEL ──────────────────────────────────────────────────────────────────
  {
    patterns: [
      /\bz energy\b/,
      /\b(z station|z .*petrol|z .*fuel)\b/,
      /\b(bp connect|bp 2go|bp .*petrol|bp .*service)\b/,
      /\bmobil\b/,
      /\bgull\b/,
      /\bcaltex\b/,
      /\bwaitomo\b/,
      /\ballied petroleum\b/,
      /\bchallenge (fuel|petrol)\b/,
    ],
    websitePatterns: [/z\.co\.nz$/, /bp\.com/],
    category: "Fuel",
  },

  // ── DINING & TAKEAWAY (before Transport — catches Uber Eats before Uber) ──
  {
    patterns: [
      /\b(mcdonald.?s|mcdonalds|maccas)\b/,
      /\bkfc\b/,
      /\b(burger king|hungry jacks)\b/,
      /\bsubway\b/,
      /\b(pizza hut|dominos|domino.?s)\b/,
      /\bhell pizza\b/,
      /\b(uber eats|ubereats)\b/,
      /\bdoordash\b/,
      /\bmenulog\b/,
      /\b(starbucks|columbus coffee|muffin break|esquires|cibo coffee|barista|atomic coffee)\b/,
      /\b(pita pit|gong cha|chatime)\b/,
      /\b(wendy.?s|nandos|mad mex|oporto|carl.?s jr)\b/,
      /\b(cafe|coffee shop|espresso bar|coffee house|coffeehouse)\b/,
      /\b(restaurant|takeaway|takeaways|diner|bistro|eatery)\b/,
      /\b(sushi|noodle canteen|thai (kitchen|restaurant)|indian (kitchen|restaurant))\b/,
      /\bfish.?n.?chips\b/,
      /\b(bakery|bakers?|patisserie)\b/,  // Scratch Bakers, any bakery
      /\bbt lunch\b/,
      /\b(yum cha|dim sum)\b/,
      /\bfood truck\b/,
      /\b(pie shop|piemaker)\b/,
      /\bhokey pokey\b/,
      /\bgelatofi\b/,
      /\b(hannahs|noodlebox|rice rice|mexicali)\b/,
      /\btaco bell\b/,
      /\b(the good food|good george|stonedog)\b/,
      /\bburger\b/,           // Burger Burger, Jax Burger Shack, any burger place
      /\b(shack|kitchen|grill|eatery|canteen)\b/,  // generic food venue words
      /\b(brunch|lunch bar|soup kitchen|food hall)\b/,
      /\bcatering\b/,
      /\b(gelato|icecream|ice cream|froyo|dessert)\b/,
      /\b(brewery|taproom|craft beer|wine bar)\b/,
      /\b(vending|vending direct)\b/,   // vending machine food/drink
      /\bbarista\b/,
      /\b(matakana|farmers market)\b/,  // artisan food producers
      /\b(fork.{0,5}tap|brew.{0,5}tap|tap room|taproom)\b/,  // Fork & Tap, Brew & Tap etc.
    ],
    websitePatterns: [/ubereats\.com/, /doordash\.com/, /menulog\.co\.nz/],
    category: "Dining & takeaway",
  },

  // ── TRANSPORT ─────────────────────────────────────────────────────────────
  {
    patterns: [
      /\buber\b/, // Uber Eats matched above, so this is ride-only
      /\b(ola ride|ola cab|zoomy|indrive)\b/,
      /\bat hop\b/,
      /\b(at metro|auckland transport)\b/,
      /\bmetlink\b/,
      /\bsnapper (card|transit)\b/,
      /\b(wilson parking|wilson car park|impark|parkmate)\b/,
      /\bairport parking\b/,
      /\bvtnz\b/,
      /\b(ritchies|intercity coach|naked bus|go bus)\b/,
    ],
    category: "Transport",
  },

  // ── PHONE & INTERNET ──────────────────────────────────────────────────────
  {
    patterns: [
      /\bspark (nz|digital|broadband|mobile|wireless)?\b/,
      /\bvodafone\b/,
      /\b(one nz|onenz)\b/,
      /\b2degrees\b/,
      /\b(skinny mobile|warehouse mobile)\b/,
      /\b(slingshot|orcon|snap internet|bigpipe|superloop|worldxchange)\b/,
    ],
    websitePatterns: [
      /spark\.co\.nz$/,
      /vodafone\.co\.nz$/,
      /2degrees\.co\.nz$/,
      /onenz\.co\.nz$/,
      /slingshot\.co\.nz$/,
    ],
    category: "Phone & internet",
  },

  // ── UTILITIES ─────────────────────────────────────────────────────────────
  {
    patterns: [
      /\bcontact energy\b/,
      /\bgenesis energy\b/,
      /\bmercury energy\b/,
      /\bmeridian energy\b/,
      /\b(flick electric|nova energy|ecotricity|trustpower|todd energy)\b/,
      /\bwatercare\b/,
      /\b(aurora energy|top energy|alpine energy|mainpower)\b/,
      /\bvector (lines|gas|network)?\b/,
    ],
    category: "Utilities",
  },

  // ── INSURANCE ─────────────────────────────────────────────────────────────
  {
    patterns: [
      /\b(ami insurance|aa insurance|state insurance|tower insurance|vero insurance)\b/,
      /\b(partners life|fidelity life|asteron|aia |cigna|chubb|allianz|qbe)\b/,
      /\b(nib health|southern cross health)\b/,
      /insurance (premium|payment|debit)\b/,
    ],
    category: "Insurance",
  },

  // ── SUBSCRIPTIONS (before Shopping — catches Apple, Adobe, etc.) ──────────
  {
    patterns: [
      /\bnetflix\b/,
      /\bspotify\b/,
      /\b(itunes|app store|icloud|apple music|apple tv\+?|apple one)\b/,
      /\b(google play|google one|youtube premium|google storage)\b/,
      /\b(amazon prime|prime video)\b/,
      /\b(disney\+|disneyplus|disney plus)\b/,
      /\bneon\b/,  // Neon TV streaming (NZ)
      /\b(sky tv|sky go|sky sport now|skysport)\b/,
      /\b(microsoft 365|office 365|ms 365)\b/,
      /\b(adobe|creative cloud)\b/,
      /\b(dropbox|notion|github|openai|chatgpt|cursor\.sh)\b/,
      /\b(canva|figma|grammarly)\b/,
      /\b(nz herald digital|stuff premium|herald premium)\b/,
      /\b(paramount\+|paramount plus|binge|britbox)\b/,
    ],
    websitePatterns: [
      /netflix\.com/,
      /spotify\.com/,
      /apple\.com/,
      /google\.com/,
      /amazon\.(com|co\.uk)/,
      /disneyplus\.com/,
      /adobe\.com/,
      /dropbox\.com/,
      /github\.com/,
    ],
    category: "Subscriptions",
  },

  // ── HEALTH & MEDICAL ──────────────────────────────────────────────────────
  {
    patterns: [
      /\b(chemist warehouse|unichem|life pharmacy|green cross pharmacy|healthpost)\b/,
      /\bpharmacy\b/,
      /\b(dentist|dental clinic|orthodontist)\b/,
      /\b(medical cent(re|er)|general practice|gp clinic|family doctor)\b/,
      /\b(specsavers|optometrist|eye care)\b/,
      /\b(physiotherapy|physio clinic|chiropractic|osteopath)\b/,
      /\bhospital\b/,
      /\b(pilates|reformer|yoga|crossfit|f45|les mills)\b/,
      /\b(gym|fitness center|fitness centre|personal train)\b/,
      /\b(massage|remedial|physio)\b/,
    ],
    category: "Health & medical",
  },

  // ── SHOPPING ──────────────────────────────────────────────────────────────
  {
    patterns: [
      /\b(kmart|k-mart)\b/,
      /\bthe warehouse\b/,
      /\bbriscoes\b/,
      /\bfarmers\b/,
      /\b(rebel sport|torpedo7?|kathmandu|macpac|bivouac)\b/,
      /\bbunnings\b/,
      /\b(pb ?tech)\b/,
      /\b(harvey norman|noel leeming|jb hi.?fi)\b/,
      /\b(cotton on|glassons|hallensteins|postie)\b/,
      /\b(mighty ?ape)\b/,
      /\b(whitcoulls|paper plus|warehouse stationery)\b/,
      /\b(mitre ?10|placemakers|carters building)\b/,
      /\b(smiths city|shoe warehouse|number one shoes)\b/,
      /\bamazon\b/,
      /\bali ?express\b/,
      /\btrade ?me\b/,
      /\bugg\b/,   // UGG boots / clothing
    ],
    websitePatterns: [/amazon\.com/, /aliexpress\.com/, /trademe\.co\.nz/, /mightyape\.co\.nz/],
    category: "Shopping",
  },

  // ── TRAVEL ────────────────────────────────────────────────────────────────
  {
    patterns: [
      /\b(air new zealand|airnz|air nz)\b/,
      /\b(jetstar|qantas|singapore airlines|emirates|cathay pacific)\b/,
      /\b(booking\.com|airbnb|expedia|hotels\.com|wotif|trivago|agoda)\b/,
      /\bgrabaseat\b/,
    ],
    websitePatterns: [/airnewzealand\.com/, /jetstar\.com/, /airbnb\.com/, /booking\.com/],
    category: "Travel",
  },

  // ── RATES ─────────────────────────────────────────────────────────────────
  {
    patterns: [
      /\b(auckland council|wellington city council|christchurch city council)\b/,
      /\b(hamilton city council|tauranga city council|dunedin city council)\b/,
      /\b(palmerston north city council|hutt city council|kapiti coast district)\b/,
      /\b(selwyn district|waimakariri district|queenstown.?lakes district)\b/,
      /\bcouncil rates\b/,
      /\brates payment\b/,
    ],
    category: "Rates",
  },

  // ── MORTGAGE & LOAN ───────────────────────────────────────────────────────
  {
    patterns: [
      /\bmortgage\b/,
      /\bhome loan\b/,
      /\b(mortgage repayment|mortgage payment)\b/,
      /\bnzhl\b/,
      /\b(liberty financial|resimac|pepper money|sbs bank home)\b/,
      /\b(anz|bnz|asb|westpac|kiwibank|sbs|co.?op bank)\s+(home loan|home lending|mortgage)\b/,
      /\bhome lending\b/,
    ],
    category: "Mortgage & loan",
  },

  // ── CAR LOAN ──────────────────────────────────────────────────────────────
  {
    patterns: [
      /\b(mtf finance|geneva finance|avanti finance)\b/,
      /\btoyota finance\b/,
      /\bmaxxia\b/,
      /\bcar loan\b/,
    ],
    category: "Car loan",
  },

  // ── DAYCARE ───────────────────────────────────────────────────────────────
  {
    patterns: [
      /\b(daycare|day care|childcare|child care)\b/,
      /\b(kindy|kindergarten)\b/,
      /\b(early childhood|early learning|ece )\b/,
      /\b(before school care|after school care|cr[eè]che)\b/,
    ],
    category: "Daycare",
  },

  // ── GOLF ──────────────────────────────────────────────────────────────────
  {
    patterns: [
      /\bgolf\b/,  // Golf HQ, golf club, golf course, any golf transaction
      /\b(par golf|driving range|pro shop)\b/,
    ],
    category: "Golf",
  },

  // ── FEES & FINES ──────────────────────────────────────────────────────────
  {
    patterns: [
      /\b(parking fine|parking infringement|traffic infringement)\b/,
      /\bwaka kotahi\b/,
      /\b(bank fee|account fee|overdrawn fee|dishonour fee|unarranged)\b/,
      /\blate (payment |)fee\b/,
      /\bnzta (fee|licensing|fine)\b/,
      /\bird (payment|debt|repayment)\b/,  // IRD tax payments
      /\binland revenue\b/,
      /\bstudent loan (repayment|payment)\b/,
    ],
    category: "Fees & fines",
  },

  // ── SAVINGS / INVESTMENTS ──────────────────────────────────────────────────
  // Catch term deposits, savings account transfers etc. before they hit Misc
  {
    patterns: [
      /\bterm deposit\b/,
      /\b(savings account|notice saver|rapid save|serious saver|online saver)\b/,
      /\b(sharesies|hatch invest|invest now|kernel wealth|simplicity|superlife)\b/,
      /\b(asx|nzx)\b/,
    ],
    category: "Transfers to others",
  },
];

// Detects "Firstname Lastname" merchant names (e.g. "Porter James", "Freida Margolis")
// that indicate a market stall / small vendor rather than a company.
// Two capitalised words, no digits, not a known non-person phrase.
const PERSON_NAME_RE = /^[A-Z][a-z]{1,14} [A-Z][a-z]{1,14}$/;
const NOT_A_PERSON = /\b(holdings|limited|ltd|cafe|bar|kitchen|shop|store|salon|studio|clinic|group|services|solutions|trust|church|school|college|university|centre|center|market|farms?)\b/i;

function looksLikePersonName(name: string | null | undefined): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  return PERSON_NAME_RE.test(trimmed) && !NOT_A_PERSON.test(trimmed);
}

export function applyRules(signals: TxnSignals): Category | null {
  const merchantNorm = signals.merchantName
    ? normalizeKey(signals.merchantName)
    : "";
  const descNorm = normalizeKey(signals.description);
  const combined = `${merchantNorm} ${descNorm}`.trim();
  // Also test raw (lowercase) to catch patterns that normalizeKey strips,
  // e.g. "INTERNET BANKING TO" prefix is removed by normalizeKey but we
  // need it to detect transfers.
  const rawMerchant = (signals.merchantName ?? "").toLowerCase();
  const rawDesc = signals.description.toLowerCase();
  const rawCombined = `${rawMerchant} ${rawDesc}`.trim();
  const website = signals.merchantWebsite
    ? extractDomain(signals.merchantWebsite)
    : "";

  for (const rule of RULES) {
    const hit =
      rule.patterns.some((p) => p.test(combined) || p.test(rawCombined)) ||
      (rule.websitePatterns?.some((p) => p.test(website)) ?? false);
    if (hit) return rule.category;
  }

  // Person-name heuristic: "Firstname Lastname" merchants are almost always
  // market stalls or small cafés (small amounts) or peer transfers (large amounts)
  if (looksLikePersonName(signals.merchantName)) {
    return Math.abs(signals.amount) < 100 ? "Dining & takeaway" : "Transfers to others";
  }

  return null;
}
