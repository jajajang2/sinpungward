import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/** DOM 노드를 고해상도 캔버스로 캡쳐 (선명한 PDF/PNG 내보내기용 공용 설정) */
export async function captureNode(node: HTMLElement): Promise<HTMLCanvasElement> {
  return html2canvas(node, {
    scale: Math.max(4, window.devicePixelRatio * 2),
    backgroundColor: "#ffffff",
    useCORS: true,
    windowWidth: node.scrollWidth,
  });
}

export async function exportNodeAsPng(node: HTMLElement, filename: string) {
  const canvas = await captureNode(node);
  const dataUrl = canvas.toDataURL("image/png", 1.0);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export async function exportNodeAsPdf(
  node: HTMLElement,
  filename: string,
  orientation: "landscape" | "portrait",
  format: "a3" | "a4" = "a4"
) {
  const canvas = await captureNode(node);
  const imgData = canvas.toDataURL("image/png", 1.0);

  const pdf = new jsPDF({ orientation, unit: "mm", format, compress: false });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const maxW = pageWidth - margin * 2;
  const maxH = pageHeight - margin * 2;
  const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
  const imgW = canvas.width * ratio;
  const imgH = canvas.height * ratio;
  const x = (pageWidth - imgW) / 2;
  const y = (pageHeight - imgH) / 2;

  pdf.addImage(imgData, "PNG", x, y, imgW, imgH, undefined, "NONE");
  pdf.save(filename);
}
