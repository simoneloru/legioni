# Distribution

legioni is published on npm as `legioni`.

## Install

```bash
npm install -g legioni
```

Or from source:

```bash
git clone https://github.com/simoneloru/legioni
cd legioni
npm install && npm run build
npm install -g .
```

## Publishing

```bash
npm publish
```

`package.json` has `prepublishOnly` set to `npm run build && npm run typecheck`. The `defaults/` directory is included in the published package so that `legioni init` can scaffold `~/.legioni/` on first run.

## Update mechanism

legioni has no auto-update mechanism. Users run `npm update -g legioni` to pick up new releases.

The team store (`~/.legioni/`) is separate from the legioni binary. Updating legioni does not overwrite your role files. To pick up changes to the default team, use `legioni upgrade-team` which diffs defaults against your store and lets you selectively apply changes.

## Team store persistence

The team store is initialized from the `defaults/` directory bundled with the legioni package. After `legioni init`:

- The team lives in `~/.legioni/`, not in the package
- You own and modify your role definitions
- `legioni upgrade-team` syncs your store with newer defaults when available
