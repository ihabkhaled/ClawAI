/** " 2" for a role id like "author-2", "" when the id carries no number (judge, critic). */
export function threadRoleNumber(roleId: string): string {
  const match = /-(\d+)$/u.exec(roleId);
  return match?.[1] === undefined ? '' : ` ${match[1]}`;
}
