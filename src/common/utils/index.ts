import * as bcrypt from 'bcrypt';

export class PasswordUtil {
  static async hash(password: string, rounds: number = 10): Promise<string> {
    return bcrypt.hash(password, rounds);
  }

  static async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static isStrong(password: string): boolean {
    // Al menos 8 caracteres, 1 mayúscula, 1 minúscula, 1 número
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return strongRegex.test(password);
  }
}

export class DateUtil {
  static getCurrentDate(): Date {
    return new Date();
  }

  static getCurrentDayStart(): Date {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  static getCurrentDayEnd(): Date {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    return now;
  }

  static getFirstDayOfMonth(date: Date = new Date()): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  static getLastDayOfMonth(date: Date = new Date()): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  static daysFromNow(date: Date): number {
    const now = new Date();
    const utc1 = Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const utc2 = Date.UTC(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
  }

  static formatDateDisplay(date: Date): string {
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  static formatDateTimeDisplay(date: Date): string {
    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}

export class NumberUtil {
  static formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  }

  static formatNumber(value: number, decimals: number = 2): string {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  static round(value: number, decimals: number = 2): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  static calculatePercentage(part: number, total: number): number {
    if (total === 0) return 0;
    return (part / total) * 100;
  }
}

export class ValidationUtil {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^(\+\d{1,3})?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
    return phoneRegex.test(phone);
  }

  static isValidCedula(cedula: string): boolean {
    return /^\d{7,10}$/.test(cedula);
  }

  static isValidNIT(nit: string): boolean {
    return /^\d{9}-?\d{1}$/.test(nit);
  }

  static isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }
}
