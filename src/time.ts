export default class Time {
  private _date: Date;
  constructor(date = new Date()) {
      // Create a new Date object from the input or use current date if none provided
      this._date = new Date(date);
  }

  // Add hours to the date
  addHours(num: number): Date {
      const newDate = new Date(this._date);
      newDate.setHours(newDate.getHours() + num);
      return newDate;
  }

  // Add minutes to the date
  addMinutes(num: number): Date {
      const newDate = new Date(this._date);
      newDate.setMinutes(newDate.getMinutes() + num);
      return newDate;
  }

  // Add seconds to the date
  addSeconds(num: number): Date {
      const newDate = new Date(this._date);
      newDate.setSeconds(newDate.getSeconds() + num);
      return newDate;
  }

  // Add days to the date
  addDays(num: number): Date {
      const newDate = new Date(this._date);
      newDate.setDate(newDate.getDate() + num);
      return newDate;
  }

  // Add weeks to the date (weeks * 7 days)
  addWeeks(num: number): Date {
      const newDate = new Date(this._date);
      newDate.setDate(newDate.getDate() + (num * 7));
      return newDate;
  }

  // Add months to the date
  addMonths(num: number): Date {
      const newDate = new Date(this._date);
      newDate.setMonth(newDate.getMonth() + num);
      return newDate;
  }

  // Add years to the date
  addYear(num: number): Date {
      const newDate = new Date(this._date);
      newDate.setFullYear(newDate.getFullYear() + num);
      return newDate;
  }

  // Get the current date object
  date(): Date {
      return this._date;
  }

  seconds(): number {
    return this._date.getSeconds();
  }

  minutes(): number {
    return this._date.getSeconds();
  }

  months(): number {
    return this._date.getSeconds();
  }

  weeks(): number {
    return this._date.getSeconds();
  }

  // Format the date as a string
  toString(): string {
      return this._date.toISOString();
  }
}