import AppDownloadSection from "@/components/AppDownloadSection";

export const metadata = {
  title: "Download 101 Hub App - Mobile App for iOS & Android",
  description: "Download 101 Hub mobile app for iOS and Android. Get instant order updates, offline browsing, and push notifications. No app store needed!",
};

export default function AppDownloadPage() {
  return (
    <div className="space-y-8 py-8">
      <AppDownloadSection />
    </div>
  );
}
