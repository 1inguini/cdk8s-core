import { Duration } from './duration';

/**
 * Represents a schedule
 *
 * Note that rates cannot be defined in fractions of minutes.
 */
export abstract class Schedule {
  /**
   * Construct a schedule from a literal schedule expression
   *
   * @param expression The expression to use. Must be in a format of 'value unit'
   */
  public static expression(expression: string): Schedule {
    return new LiteralSchedule(expression);
  }

  /**
   * Construct a schedule from an interval and a time unit
   *
   * Rates may be defined with any unit of time, but when converted into minutes, the duration must be a positive whole number of minutes.
   */
  public static rate(duration: Duration): Schedule {
    if (duration.toMinutes() === 0) {
      throw new Error('Duration cannot be 0');
    }

    let rate = maybeRate(duration.toDays({ integral: false }), 'day');
    if (rate === undefined) { rate = maybeRate(duration.toHours({ integral: false }), 'hour'); }
    if (rate === undefined) { rate = makeRate(duration.toMinutes({ integral: true }), 'minute'); }
    return new LiteralSchedule(rate);
  }

  /**
   * Create a schedule from a set of cron fields
   */
  public static cron(options: CronOptions): Schedule {
    if (options.weekDay !== undefined && options.day !== undefined) {
      throw new Error('Cannot supply both \'day\' and \'weekDay\', use at most one');
    }

    const minute = fallback(options.minute, '*');
    const hour = fallback(options.hour, '*');
    const month = fallback(options.month, '*');
    const year = fallback(options.year, '*');

    // Weekday defaults to '?' if not supplied. If it is supplied, day must become '?'
    const day = fallback(options.day, options.weekDay !== undefined ? '?' : '*');
    const weekDay = fallback(options.weekDay, '?');

    return new class extends Schedule {
      public readonly expressionString: string = `cron(${minute} ${hour} ${day} ${month} ${weekDay} ${year})`;
      public _bind() {
        return new LiteralSchedule(this.expressionString);
      }
    };
  }

  /**
   * Retrieve the expression for this schedule
   */
  public abstract readonly expressionString: string;

  protected constructor() {}

  /**
   *
   * @internal
   */
  public abstract _bind(): void;
}

/**
 * Options to configure a cron expression
 *
 * All fields are strings so you can use complex expressions. Absence of
 * a field implies '*' or '?', whichever one is appropriate.
 */
export interface CronOptions {
  /**
   * The minute to run this rule at
   *
   * @default - Every minute
   */
  readonly minute?: string;

  /**
   * The hour to run this rule at
   *
   * @default - Every hour
   */
  readonly hour?: string;

  /**
   * The day of the month to run this rule at
   *
   * @default - Every day of the month
   */
  readonly day?: string;

  /**
   * The month to run this rule at
   *
   * @default - Every month
   */
  readonly month?: string;

  /**
   * The year to run this rule at
   *
   * @default - Every year
   */
  readonly year?: string;

  /**
   * The day of the week to run this rule at
   *
   * @default - Any day of the week
   */
  readonly weekDay?: string;
}

class LiteralSchedule extends Schedule {
  constructor(public readonly expressionString: string) {
    super();
  }

  public _bind() {}
}

function fallback<T>(x: T | undefined, def: T): T {
  return x ?? def;
}

/**
 * Return the rate if the rate is whole number
 */
function maybeRate(interval: number, singular: string) {
  if (interval === 0 || !Number.isInteger(interval)) { return undefined; }
  return makeRate(interval, singular);
}

/**
 * Return 'rate(${interval} ${singular}(s))` for the interval
 */
function makeRate(interval: number, singular: string) {
  return interval === 1 ? `rate(1 ${singular})` : `rate(${interval} ${singular}s)`;
}