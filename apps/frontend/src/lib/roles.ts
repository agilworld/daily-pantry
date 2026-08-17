// Human-readable labels for role names.
export function roleLabel(roleName: string | null | undefined): string {
  switch (roleName) {
    case "employee":
      return "Employee";
    case "seller":
      return "Seller";
    case "office_boy":
      return "Office Boy";
    case "manager":
      return "Manager";
    default:
      return roleName ? roleName.replace(/_/g, " ") : "";
  }
}
