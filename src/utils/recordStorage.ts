function nowIso() {
  return new Date().toISOString()
}

export function createTimestamps() {
  const ts = nowIso()
  return { createdAt: ts, updatedAt: ts }
}

export function touchRecord<T extends { updatedAt: string }>(record: T): T {
  return { ...record, updatedAt: nowIso() }
}
