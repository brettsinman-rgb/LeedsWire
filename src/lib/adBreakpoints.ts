export const MOBILE_AD_MAX_WIDTH = 639;
export const MOBILE_AD_MEDIA_QUERY = `(max-width: ${MOBILE_AD_MAX_WIDTH}px)`;

export function isMobileAdWidth(viewportWidth: number) {
  return viewportWidth <= MOBILE_AD_MAX_WIDTH;
}
