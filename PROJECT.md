# @peardrive/hypercore — Project Manifest

## Overview
Fork of [holepunchto/hypercore](https://github.com/holepunchto/hypercore) with pruned/lazy-load storage mode.

## Status
- **npm:** `@peardrive/hypercore@pruned`
- **Version:** 11.27.14-pruned.1
- **Upstream:** 11.27.14 (in sync)

## Key Changes from Upstream
1. Added `onBlockMissing` option to constructor
2. Hook fires in `lib/replicator.js` → `_getProof()` before rejecting cleared blocks
3. Callback passed through: `index.js` → `lib/core.js` → replicator access

## Files Modified
- `index.js` — Added `onBlockMissing` option, pass to Core
- `lib/core.js` — Store `onBlockMissing` on Core instance
- `lib/replicator.js` — Call hook in `_getProof()` before returning "not available"
- `package.json` — Renamed to `@peardrive/hypercore`
- `README.md` — Added pruned mode documentation

## Usage
```javascript
const Hypercore = require('@peardrive/hypercore')

const core = new Hypercore(storage, {
  onBlockMissing: async (index, core) => {
    // Called when peer requests a cleared block
    // Restore from original source, then block is served
  }
})
```

## Testing
```bash
cd ~/Apps/hypercore-pruned
npm test                    # Full test suite
npx brittle test/pruned-mode.js  # Pruned mode tests only
```

## Syncing with Upstream
```bash
git fetch upstream
git merge upstream/main
# Resolve conflicts in modified files
npm test
```

## Debugging: Revert to Standard Hypercore
If bugs suspected in our fork:
```json
{
  "dependencies": {
    "hypercore": "^11.27.14"  // Standard, not @peardrive
  }
}
```

## Repository
- **GitHub:** https://github.com/peardrive/hypercore-pruned
- **npm:** https://www.npmjs.com/package/@peardrive/hypercore
- **Local:** `~/Apps/hypercore-pruned`
- **Upstream:** https://github.com/holepunchto/hypercore
