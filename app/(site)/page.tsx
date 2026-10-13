import { CategoriesSection } from "@/components/competitions/categories-section";
import { ExplorerSection } from "@/components/competitions/explorer-section";
import { HeroSection } from "@/components/hero/hero-section";
import { parseExplorerParams } from "@/lib/competitions/explorer-params";

export default async function HomePage(props: PageProps<"/">) {
  const filters = parseExplorerParams(await props.searchParams);

  return (
    <main id="main">
      <HeroSection />
      <ExplorerSection filters={filters} />
      <CategoriesSection />
    </main>
  );
}
