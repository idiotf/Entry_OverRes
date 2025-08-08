const hashTable = new Set<string>

export default function generateHash(length = 32) {
  for (;;) {
    const hash = Array.from(crypto.getRandomValues(new Uint8Array(length))).map(v => '0123456789abcdefghijklmnopqrstuvwxyz'[v % 36]).join('')
    if (hashTable.has(hash)) continue
    hashTable.add(hash)
    return hash
  }
}
