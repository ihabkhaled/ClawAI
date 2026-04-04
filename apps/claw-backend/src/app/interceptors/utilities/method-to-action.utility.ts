import { AuditAction } from "../../../common/enums";

export function methodToAction(method: string): AuditAction {
  switch (method) {
    case "POST":
      return AuditAction.CREATE;
    case "PUT":
    case "PATCH":
      return AuditAction.UPDATE;
    case "DELETE":
      return AuditAction.DELETE;
    default:
      return AuditAction.ACCESS;
  }
}
