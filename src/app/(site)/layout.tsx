import { SiteHeader } from "@/components/layout/site-header";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
