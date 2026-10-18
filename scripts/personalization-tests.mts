/* Tests for plan.ts personalization — different inputs → different outputs */
import { suggestionsFor, defaultTimeBlocks } from "../src/lib/plan.ts";

let pass = 0, fail = 0;
const eq = (a: unknown, b: unknown, name: string) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok) pass++;
  else { fail++; console.error(`FAIL ${name}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
};
const ok_ = (cond: boolean, name: string) => { if (cond) pass++; else { fail++; console.error(`FAIL ${name}`); } };

// 1. School student gets schedule with morning activity adjustment
const schoolEnglish = suggestionsFor(["languages"], "06:30", { lifeStage: "school" });
ok_(schoolEnglish.length > 0, "school student gets suggestions");
ok_(schoolEnglish.some(s => s.titleKey === "sug_english"), "English suggestion included for languages interest");

// 2. Fitness interest adds exercise activity
const fitness = suggestionsFor(["fitness"], "07:00", { lifeStage: "working", workHours: "morning" });
ok_(fitness.some(s => s.titleKey === "sug_exercise"), "working+fitness gets exercise");

// 3. Very little free time limits suggestions
const tiny = suggestionsFor(["languages","fitness","reading","education","career"], "07:00", {
  lifeStage: "school", freeTime: "lt1", maxSuggestions: 4
});
ok_(tiny.length <= 4, "limited free time limits max suggestions");

// 4. Different interests → different suggestions
const langSugs = suggestionsFor(["languages"], "07:00");
const fitSugs = suggestionsFor(["fitness"], "07:00");
ok_(JSON.stringify(langSugs) !== JSON.stringify(fitSugs), "different interests produce different plans");

// 5. Exercise challenge adds fitness even without interest
const withChallenge = suggestionsFor(["reading"], "07:00", { challenges: ["exercise"] });
ok_(withChallenge.some(s => s.titleKey === "sug_exercise"), "exercise challenge adds fitness suggestion");

// 6. Without exercise challenge, reading only gets reading activity
const noChallenge = suggestionsFor(["reading"], "07:00", { challenges: [] });
ok_(!noChallenge.some(s => s.titleKey === "sug_exercise"), "no exercise challenge = no fitness without interest");

// 7. Time blocks: school has busy 08:00-14:00
const schoolBlocks = defaultTimeBlocks("school", null);
ok_(schoolBlocks.some(b => b.type === "busy"), "school has busy blocks");

// 8. Working+morning has busy 08:00-17:00
const workBlocks = defaultTimeBlocks("working", "morning");
const busyWork = workBlocks.find(b => b.type === "busy");
ok_(busyWork?.start === "08:00" && busyWork?.end === "17:00", "working morning busy 08:00-17:00");

// 9. Working+evening has different busy block
const eveningBlocks = defaultTimeBlocks("working", "evening");
const busyEvening = eveningBlocks.find(b => b.type === "busy");
ok_(busyEvening?.start === "16:00", "working evening busy from 16:00");

// 10. Multiple interests → multiple activities
const multi = suggestionsFor(["languages", "fitness", "reading"], "07:00", { lifeStage: "other", freeTime: "4h+" });
ok_(multi.length >= 3, `multiple interests → at least 3 suggestions, got ${multi.length}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
