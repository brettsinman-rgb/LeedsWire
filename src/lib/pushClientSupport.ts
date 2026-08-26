type BrowserCapabilities = {
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  isIos: boolean;
  isStandalone: boolean;
};

export function supportsPushPrompt(capabilities: BrowserCapabilities) {
  if (!capabilities.hasServiceWorker || !capabilities.hasPushManager || !capabilities.hasNotification) return false;
  return !capabilities.isIos || capabilities.isStandalone;
}
