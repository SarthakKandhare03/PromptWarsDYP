/** Anonymous per-device id: lets the server learn reporter reputation and stop double votes, with no account or name. */
const KEY = 'citypulse.uid'
let memo: string | null = null

export function deviceId(): string {
  if (memo) return memo
  try {
    memo = localStorage.getItem(KEY)
    if (!memo) {
      memo = crypto.randomUUID()
      localStorage.setItem(KEY, memo)
    }
  } catch {
    memo = memo ?? crypto.randomUUID()
  }
  return memo
}
