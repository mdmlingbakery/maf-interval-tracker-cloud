// Unit test for yesterdaysCronLandedToday(): extracts the function text from tracker.js (never requires it).
const fs = require('fs'); const path = require('path'); const os = require('os');
const src = fs.readFileSync(process.argv[2], 'utf8').replace(/\r\n/g, '\n');
const start = src.indexOf('function yesterdaysCronLandedToday');
const end = src.indexOf('\n}\n', start) + 3;
if (start < 0 || end < 3) { console.error('function not found'); process.exit(2); }
const SGT_OFFSET_H = 8;
const fn = new Function('fs', 'SGT_OFFSET_H', 'process', src.slice(start, end) + '\nreturn yesterdaysCronLandedToday;')(fs, SGT_OFFSET_H, process);
const evFile = path.join(os.tmpdir(), 'lagskip-ev.json');
const at = (hhmm) => Math.floor(hhmm / 100) * 60 + (hhmm % 100);
const cases = [
  // [event, cron, nowSGT, expectSkip, label]
  ['schedule', '30 12 * * *', 746, true, '2300 cron (20:30 SGT) landing 07:46 next day = 17 Nov run'],
  ['schedule', '20 3 * * *', 2, true, '1400 cron (11:20) landing 00:02'],
  ['schedule', '40 2 * * *', 530, true, 'relay 10:40 cron landing 05:30 next day'],
  ['schedule', '30 12 * * *', 2045, false, '2300 cron on time-ish 20:45'],
  ['schedule', '40 22 * * *', 645, false, 'relay 06:40 cron landing 06:45 same day'],
  ['schedule', '50 23 * * *', 750, false, 'exact cron minute'],
  ['workflow_dispatch', '', 746, false, 'manual dispatch keeps loud abort'],
  [undefined, '30 12 * * *', 746, false, 'laptop (no GITHUB_EVENT_NAME)'],
  ['schedule', '*/5 * * * *', 100, false, 'non-daily cron keeps loud abort'],
  ['schedule', null, 100, false, 'missing schedule field'],
];
let fail = 0;
for (const [ev, cron, now, expect, label] of cases) {
  if (ev === undefined) delete process.env.GITHUB_EVENT_NAME; else process.env.GITHUB_EVENT_NAME = ev;
  fs.writeFileSync(evFile, JSON.stringify(cron === null ? {} : { schedule: cron }));
  process.env.GITHUB_EVENT_PATH = evFile;
  const got = !!fn(at(now));
  const ok = got === expect; if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  skip=${got}  ${label}`);
}
process.env.GITHUB_EVENT_NAME = 'schedule'; process.env.GITHUB_EVENT_PATH = path.join(os.tmpdir(), 'no-such-file.json');
const bad = fn(at(100)); console.log(`${bad === null ? 'PASS' : 'FAIL'}  unreadable event file -> no skip`); if (bad !== null) fail++;
console.log(fail ? `${fail} FAILED` : 'ALL PASS'); process.exit(fail ? 1 : 0);
