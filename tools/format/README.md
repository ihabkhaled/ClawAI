# Formatting debt ratchet

`npm run format:check` checks every tracked Prettier-supported file while allowing
only the exact normalized hashes recorded in `baseline.json`. A new unformatted
file, or an edit to a baseline file that remains unformatted, fails the gate.
Formatting an existing baseline file passes immediately.

The baseline is generated data. Never edit it by hand.

- `npm run format:baseline` safely prunes entries whose debt was resolved. It
  cannot add or update an entry, so it cannot bless new formatting debt.
- `npm run format:baseline -- --bootstrap` establishes the initial baseline and
  refuses to overwrite an existing one. It is a one-time migration command, not
  part of routine development.

Line endings are normalized before comparing and hashing. This makes the gate
identical on Windows checkouts using `core.autocrlf` and Linux CI while Prettier
continues to enforce every content-formatting rule.
