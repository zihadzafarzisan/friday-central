import { PreviewProvider } from "@/components/portal-context";
import { previewData } from "@/server/preview-data";
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return <PreviewProvider initial={previewData()}>{children}</PreviewProvider>;
}
