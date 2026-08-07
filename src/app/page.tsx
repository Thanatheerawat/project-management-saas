import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PageContainer } from "@/components/layout/page-container";
import { ThemeToggle } from "@/components/layout/theme-toggle";

// Placeholder shell only — real marketing content is out of scope for
// Project Foundation. This exists to give Navbar/Footer/PageContainer a
// live route today instead of sitting unused until later milestones.
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        brand={<span className="text-foreground text-sm font-bold">Orbit</span>}
        actions={<ThemeToggle />}
      />
      <main className="flex flex-1 items-center">
        <PageContainer className="flex flex-col gap-1 py-24 text-center">
          <h1 className="text-foreground text-xl font-bold">Orbit</h1>
          <p className="text-muted-foreground text-sm">
            Project &amp; issue tracker for software teams — foundation in progress.
          </p>
        </PageContainer>
      </main>
      <Footer />
    </div>
  );
}
