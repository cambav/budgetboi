// Run with: npx tsx scripts/test-categorize.ts
import { applyRules, normalizeKey } from "../lib/categorize";

// Representative sample of merchants that typically end up as Misc.
// Add any merchants from your actual transactions you want to check.
const TEST_MERCHANTS: Array<{
  merchantName: string | null;
  description: string;
  amount: number;
  merchantWebsite?: string;
}> = [
  // Your specific examples
  { merchantName: "Porter James",              description: "EFTPOS PORTER JAMES AUCKLAND",   amount: -28 },
  { merchantName: "First Mates Last Laugh",    description: "VISA FIRST MATES LAST LAUGH",    amount: -45 },
  // Bars / pubs
  { merchantName: "The Shoreline Bar",         description: "EFTPOS SHORELINE BAR",           amount: -22 },
  { merchantName: "Cassette Nine",             description: "EFTPOS CASSETTE NINE AUCKLAND",  amount: -18 },
  { merchantName: "The Lumsden Arms Tavern",   description: "EFTPOS LUMSDEN ARMS TAVERN",     amount: -30 },
  { merchantName: "Gin Gin Bar & Restaurant",  description: "VISA GIN GIN BAR",               amount: -55 },
  { merchantName: "Vultures Lane",             description: "EFTPOS VULTURES LANE",           amount: -24 },
  { merchantName: "Fork & Tap",                description: "EFTPOS FORK AND TAP",            amount: -38 },
  // Restaurants / cafes with non-obvious names
  { merchantName: "Scratch Bakers",            description: "EFTPOS SCRATCH BAKERS",          amount: -12 },
  { merchantName: "Burger Burger",             description: "EFTPOS BURGER BURGER",           amount: -22 },
  { merchantName: "Hello Mister",              description: "VISA HELLO MISTER AUCKLAND",     amount: -32 },
  { merchantName: "Bestie Cafe",               description: "EFTPOS BESTIE CAFE",             amount: -14 },
  { merchantName: "Torbay Village Butchery",   description: "EFTPOS TORBAY VILLAGE BUTCHE",   amount: -48 },
  { merchantName: "Golf HQ",                   description: "VISA GOLF HQ AUCKLAND",          amount: -120 },
  { merchantName: "Your Reformer NZ",          description: "VISA YOUR REFORMER NZ",          amount: -55 },
  // Subscriptions
  { merchantName: "Neon",                      description: "VISA NEON SUBSCRIPTION",         amount: -14.99 },
  // Transfers
  { merchantName: null,                        description: "INTERNET BANKING TO JOHN SMITH", amount: -200 },
  { merchantName: null,                        description: "TRANSFER FROM SARAH JONES",      amount: 500 },
  // Income
  { merchantName: null,                        description: "INTERNET BANKING TRANSFER FROM EMPLOYER LTD", amount: 2800 },
  // Person-name vendors (market stalls)
  { merchantName: "Freida Margolis",           description: "EFTPOS FREIDA MARGOLIS",         amount: -18 },
  { merchantName: "James Whitfield",           description: "EFTPOS JAMES WHITFIELD",         amount: -42 },
  { merchantName: "Emma Clarke",              description: "EFTPOS EMMA CLARKE",             amount: -380 },
  // UGG (clothing)
  { merchantName: "UGG",                       description: "VISA UGG AUSTRALIA",             amount: -180 },
  // Misc that should stay Misc
  { merchantName: "Widget Services Ltd",       description: "INTERNET BANKING TO WIDGET SERVICES LTD", amount: -99 },
];

const WIDTH = 34;
let caught = 0;
let stillMisc = 0;

console.log("\n" + "─".repeat(72));
console.log(" MERCHANT".padEnd(WIDTH) + " RESULT");
console.log("─".repeat(72));

for (const m of TEST_MERCHANTS) {
  const result = applyRules({
    merchantName: m.merchantName,
    description: m.description,
    merchantWebsite: m.merchantWebsite,
    amount: m.amount,
  });

  const display = (m.merchantName ?? m.description).slice(0, WIDTH - 2).padEnd(WIDTH);
  const label = result ?? "Misc ✗";
  const marker = result ? "✓" : "·";
  console.log(` ${marker} ${display} ${label}`);
  if (result) caught++; else stillMisc++;
}

console.log("─".repeat(72));
console.log(` Rules caught: ${caught}/${TEST_MERCHANTS.length}  |  Still needs AI/web-search: ${stillMisc}`);
console.log();

// Also show normalizeKey output for a few problem merchants
console.log("normalizeKey checks:");
const checks = [
  "INTERNET BANKING TO JOHN SMITH",
  "TRANSFER FROM SARAH JONES",
  "EFTPOS PORTER JAMES AUCKLAND NZL",
  "VISA PURCHASE FIRST MATES LAST LAUGH",
];
for (const s of checks) {
  console.log(`  "${s}" → "${normalizeKey(s)}"`);
}
console.log();
