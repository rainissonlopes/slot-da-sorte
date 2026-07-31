import { auditMissingImages, writeMissingImagesReport } from "./missing-images.mjs";

try {
  const report = await auditMissingImages();
  const paths = writeMissingImagesReport(report);
  console.log(JSON.stringify({ summary: report.summary, pending: report.pending, reports: paths }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
