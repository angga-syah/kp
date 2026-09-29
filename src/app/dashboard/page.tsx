import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { roleHome } from "@/lib/roles";

export default async function Dashboard() {
  const p = await getProfile();
  redirect(p ? roleHome[p.role] : "/masuk");
}
