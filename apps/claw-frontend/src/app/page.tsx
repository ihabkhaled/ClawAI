import { redirect } from "next/navigation";

import { ROUTES } from "@/constants";

export default function HomePage() {
  redirect(ROUTES.CHAT);
}
