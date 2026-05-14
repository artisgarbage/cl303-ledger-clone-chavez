import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return <MarketingLayout>{children}</MarketingLayout>;
}
