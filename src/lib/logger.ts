// System diagnostic and activity logger for Vitrino

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  category: 'database' | 'auth' | 'storage' | 'system';
  message: string;
  details?: unknown;
}

const LOGS_KEY = 'vitrino_system_logs';
const MAX_LOGS = 150;

let memoryLogs: LogEntry[] = [];

// Initialize logs from localStorage if available
try {
  const saved = localStorage.getItem(LOGS_KEY);
  if (saved) {
    memoryLogs = JSON.parse(saved);
  }
} catch {
  memoryLogs = [];
}

export function addLog(
  level: LogEntry['level'],
  category: LogEntry['category'],
  message: string,
  details?: unknown
): LogEntry {
  const entry: LogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    details: details ? (typeof details === 'object' ? JSON.parse(JSON.stringify(details)) : String(details)) : undefined,
  };

  memoryLogs.unshift(entry);
  if (memoryLogs.length > MAX_LOGS) {
    memoryLogs = memoryLogs.slice(0, MAX_LOGS);
  }

  try {
    localStorage.setItem(LOGS_KEY, JSON.stringify(memoryLogs));
  } catch {
    // ignore
  }

  // Also print clean console output
  const prefix = `[Vitrino ${category.toUpperCase()}]`;
  if (level === 'error') console.error(prefix, message, details || '');
  else if (level === 'warn') console.warn(prefix, message, details || '');
  else console.log(prefix, message, details || '');

  return entry;
}

export function getSystemLogs(): LogEntry[] {
  return [...memoryLogs];
}

export function clearSystemLogs(): void {
  memoryLogs = [];
  try {
    localStorage.removeItem(LOGS_KEY);
  } catch {
    // ignore
  }
}
