// Resolves the i18n key for the PlanForm submit button, avoiding a nested
// ternary inside the TSX (banned by no-nested-ternary).
export function resolvePlanSubmitLabelKey(isSubmitting: boolean, isEdit: boolean): string {
  if (isSubmitting) {
    return 'adminPlans.form.submitting';
  }
  return isEdit ? 'adminPlans.form.submitUpdate' : 'adminPlans.form.submitCreate';
}
