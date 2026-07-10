export function shouldAutoRotate(
  prefersReducedMotion: boolean,
  userIsInteracting: boolean,
  itemCount: number,
): boolean {
  return !prefersReducedMotion && !userIsInteracting && itemCount > 1;
}
