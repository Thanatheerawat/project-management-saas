import { PageContainer } from "@/components/layout/page-container";

export function Footer() {
  return (
    <footer className="border-border border-t py-6">
      <PageContainer className="text-muted-foreground text-sm">
        © {new Date().getFullYear()} Orbit
      </PageContainer>
    </footer>
  );
}
