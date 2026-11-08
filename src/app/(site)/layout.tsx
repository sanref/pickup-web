import { LocationDetector } from "@/components/layout/location-detector";
import { SiteHeader } from "@/components/layout/site-header";
import { getSavedLocation } from "@/server/location";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const { asked } = await getSavedLocation();
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <LocationDetector asked={asked} />
    </>
  );
}
