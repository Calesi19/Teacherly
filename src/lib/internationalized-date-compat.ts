export type DateValue = {
  toString(): string;
};

class SimpleDateValue implements DateValue {
  constructor(private readonly isoDate: string) {}

  toString() {
    return this.isoDate;
  }
}

export function parseDate(value: string): DateValue {
  return new SimpleDateValue(value);
}
