/** Every N uploads earns a points award. Top points holder = "Best AI DJ". */
export const POINTS_EVERY = 7;
export const POINTS_PER_MILESTONE = 100;

export function pointsFor(uploads: number) {
  const milestones = Math.floor(uploads / POINTS_EVERY);
  return {
    uploads,
    milestones,
    points: milestones * POINTS_PER_MILESTONE,
    towardNext: uploads % POINTS_EVERY,
    nextAt: (milestones + 1) * POINTS_EVERY,
  };
}
