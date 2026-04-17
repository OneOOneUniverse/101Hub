import ReferralDashboard from "@/components/ReferralDashboard";

export const metadata = {
  title: "Referral Program | 101 Hub",
  description: "Earn points by referring friends. Unlock exclusive discounts and free shipping.",
};

export default function ReferralPage() {
  return (
    <div className="py-6">
      <ReferralDashboard />
    </div>
  );
}
