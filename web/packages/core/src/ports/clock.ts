/** Time, behind a port, so session expiry is testable without waiting 14 days. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};
