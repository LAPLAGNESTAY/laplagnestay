import assert from "node:assert/strict";
import test from "node:test";
import { readCalendar, snapshot } from "../scripts/sync.mjs";

const ical = (event = "") => "BEGIN:VCALENDAR\r\nVERSION:2.0\r\n" + event + "END:VCALENDAR\r\n";
const event = "BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261112\r\nDTEND;VALUE=DATE:20261114\r\nSUMMARY:Client privé\r\nDESCRIPTION:Contact privé\r\nEND:VEVENT\r\n";

test("lit uniquement les dates et traite le départ comme borne exclusive", () => {
  assert.deepEqual(readCalendar(ical(event)), [["2026-11-12", "2026-11-14"]]);
  assert.deepEqual(readCalendar(ical()), []);
});
test("rejette les données ambiguës ou invalides", () => {
  assert.throws(() => readCalendar(ical(event.replace("20261114", "20261131"))));
  assert.throws(() => readCalendar(ical(event.replace("END:VEVENT", "RRULE:FREQ=DAILY\r\nEND:VEVENT"))));
  assert.throws(() => readCalendar(ical(event.replace("20261114", "20261114T090000Z"))));
  assert.throws(() => readCalendar("<html>"));
});
test("isole Hameaux, fusionne Aspen et utilise la date de Paris", () => {
  const payload = snapshot({
    "studio-plagnevillages": [["2026-11-15", "2026-11-16"]],
    "studio-aspen": readCalendar(ical(event)),
    "appart-aspen": [["2026-11-14", "2026-11-16"]],
    "coloc1-aspen": [],
    "coloc2-aspen": []
  }, new Date("2026-11-12T23:30:00Z"));
  assert.equal(payload.from, "2026-11-13");
  assert.deepEqual(payload.offers["studio-plagnevillages"], [["2026-11-15", "2026-11-16"]]);
  for (const id of ["studio-aspen", "appart-aspen", "coloc1-aspen", "coloc2-aspen"]) {
    assert.deepEqual(payload.offers[id], [["2026-11-13", "2026-11-16"]]);
  }
  assert.doesNotMatch(JSON.stringify(payload), /Client|Contact|SUMMARY|DESCRIPTION/);
});
