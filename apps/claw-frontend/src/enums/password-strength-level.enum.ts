/** How a candidate password scores against the admin create-user policy. */
export enum PasswordStrengthLevel {
  /** Fails the policy — cannot be submitted. */
  Weak = 'WEAK',
  /** Meets the policy, but only just. */
  Fair = 'FAIR',
  /** Meets the policy with room to spare. */
  Good = 'GOOD',
  /** Meets the policy and is long enough that length alone carries it. */
  Strong = 'STRONG',
}
