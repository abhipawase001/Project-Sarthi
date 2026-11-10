import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildLiveFleet, estimateLiveEtaMinutes, isFreshLivePosition, type LivePosition } from "@/lib/live-fleet";

const now = Date.parse("2026-11-07T12:00:00.000Z");
const registry = [
  { reg_no: "MH17-REAL-0001", route: "R1", capacity: 42, status: "active" },
  { reg_no: "MH17-REAL-0002", route: "R1", capacity: 42, status: "active" },
  { reg_no: "MH17-REAL-0003", route: "R1", capacity: 42, status: "maintenance" },
];
const position = (busId: string, ageMs: number): LivePosition => ({
  bus_id: busId,
  route: "R1",
  lat: 19.57,
  lng: 74.22,
  speed: 24,
  heading: 45,
  occupancy: "medium",
  observed_at: new Date(now - ageMs).toISOString(),
  accuracy_m: 8,
});

describe("live fleet", () => {
  it("shows only active registered buses with fresh GPS positions", () => {
    const buses = buildLiveFleet(registry, [position("MH17-REAL-0001", 10_000), position("MH17-REAL-0002", 61_000), position("MH17-UNKNOWN-0000", 10_000), position("MH17-REAL-0003", 10_000)], now);
    assert.deepEqual(buses.map((bus) => bus.id), ["MH17-REAL-0001"]);
    assert.equal(buses[0]?.live, true);
  });

  it("rejects expired, future-dated, and malformed fixes", () => {
    assert.equal(isFreshLivePosition(position("MH17-REAL-0001", 60_001), now), false);
    assert.equal(isFreshLivePosition(position("MH17-REAL-0001", -30_001), now), false);
    assert.equal(isFreshLivePosition({ ...position("MH17-REAL-0001", 0), observed_at: "not-a-date" }, now), false);
  });

  it("returns an ETA only for a supported stop and a moving live bus", () => {
    const eta = estimateLiveEtaMinutes(19.57, 74.22, 24, "s3", "R1");
    assert.equal(eta, 5);
    assert.equal(estimateLiveEtaMinutes(19.57, 74.22, 24, "s5", "R1"), null);
    assert.equal(estimateLiveEtaMinutes(19.57, 74.22, 0, "s3", "R1"), null);
  });
});