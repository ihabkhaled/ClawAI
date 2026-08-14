// Compatibility entrypoint for developer tooling and documentation that still
// invokes the TypeScript seed path. Production and development both execute the
// same plain-JavaScript implementation, preventing the two seed paths from
// drifting again.
import './seed.js';
