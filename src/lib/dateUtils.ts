/**
 * Utilitários para formatação e manipulação de datas no fuso horário padrão (America/Sao_Paulo - BRT/BRST).
 */

export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Converte qualquer Date, string ISO ou timestamp para uma string de data local no formato YYYY-MM-DD.
 * Evita o problema do .toISOString().split('T')[0] que utiliza UTC e desloca compras noturnas para o dia seguinte.
 */
export function toLocalDateString(dateInput?: Date | string | number | null, timeZone: string = BRAZIL_TIMEZONE): string {
  if (!dateInput) {
    const d = new Date();
    return formatDateInTimeZone(d, timeZone);
  }

  const dateObj = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
  if (isNaN(dateObj.getTime())) {
    return new Date().toISOString().split('T')[0];
  }

  return formatDateInTimeZone(dateObj, timeZone);
}

function formatDateInTimeZone(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA produz o formato YYYY-MM-DD nativamente
  return formatter.format(date);
}

/**
 * Retorna a data de hoje no formato YYYY-MM-DD (fuso horário Brasil).
 */
export function getTodayLocalDate(timeZone: string = BRAZIL_TIMEZONE): string {
  return toLocalDateString(new Date(), timeZone);
}

/**
 * Retorna a data de N dias atrás no formato YYYY-MM-DD (fuso horário Brasil).
 */
export function getDaysAgoLocalDate(days: number, timeZone: string = BRAZIL_TIMEZONE): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toLocalDateString(d, timeZone);
}
