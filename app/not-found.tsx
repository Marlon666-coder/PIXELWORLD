import { LostLevel } from "@/components/layout/lost-level";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <LostLevel title="LEVEL NOT FOUND" message="This part of the pixel universe hasn't been built (yet)." />
      <SiteFooter />
    </>
  );
}
