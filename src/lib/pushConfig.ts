import "server-only";
import { envFlag } from "@/lib/pushValidation";

export function getPushConfig() {
  return {
    pushEnabled: envFlag(process.env.LEEDSWIRE_PUSH_ENABLED),
    fullTimePushEnabled: envFlag(process.env.LEEDSWIRE_FULLTIME_PUSH_ENABLED),
    dailyBriefPushEnabled: envFlag(process.env.LEEDSWIRE_DAILY_BRIEF_PUSH_ENABLED),
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY?.trim() ?? "",
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY?.trim() ?? "",
    vapidSubject: process.env.VAPID_SUBJECT?.trim() ?? "",
  };
}

export function hasVapidConfig(config = getPushConfig()) {
  return Boolean(config.vapidPublicKey && config.vapidPrivateKey && config.vapidSubject);
}
