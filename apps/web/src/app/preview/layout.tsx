import { PreviewProvider } from "@/components/portal-context";
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return <PreviewProvider>{children}</PreviewProvider>;
}
