import "server-only";
import { getFullTimeFixtureList } from "./fixtures";
import { getFootballDataFullTimeMatches } from "./footballDataIo";
import { getPushConfig } from "./pushConfig";
import { sendPushToSubscription } from "./pushService";
import { runFullTimeMonitor } from "./fullTimeMonitor";
import {
  getFullTimeState, saveFullTimeState, claimFullTimePoll, fullTimeAlreadyReserved,
  countFullTimeSubscribers, reserveFullTimeEvent, getFullTimeSubscribers, completeFullTimeEvent,
} from "./fullTimeStore";

export function evaluateFullTime(input: { dryRun: boolean }) {
  return runFullTimeMonitor(input, {
    flags: getPushConfig(), getState: getFullTimeState, getFixtures: getFullTimeFixtureList,
    getMatches: getFootballDataFullTimeMatches, claimPoll: claimFullTimePoll,
    isDuplicate: fullTimeAlreadyReserved, countSubscribers: countFullTimeSubscribers,
    reserve: reserveFullTimeEvent, subscribers: getFullTimeSubscribers,
    send: (subscription, payload) => sendPushToSubscription(subscription, payload, { timeout: 8_000 }),
    saveState: saveFullTimeState, completeEvent: completeFullTimeEvent,
    logDispatch: (fixture, result, delivery) => console.info("full_time_push_dispatch", {
      fixtureId: result.fixtureId, opponent: fixture.opponent, homeAway: fixture.isHome ? "home" : "away",
      homeScore: result.homeScore, awayScore: result.awayScore, competition: fixture.competition,
      successful: delivery.successful, failed: delivery.failed, expired: delivery.expired, unfinished: delivery.unfinished,
    }),
  });
}
