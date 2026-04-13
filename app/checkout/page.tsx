import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import CheckoutForm from "@/components/CheckoutForm";

export default async function CheckoutPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/login?redirect_url=/checkout");
  }

  return <CheckoutForm />;
}
