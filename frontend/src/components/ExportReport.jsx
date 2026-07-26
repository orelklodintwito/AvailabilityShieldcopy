import { Download } from "lucide-react";

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toCsv(logs) {
  const columns = ["timestamp", "ip", "method", "endpoint", "statusCode", "durationMs", "decision", "severity"];
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [columns.join(","), ...logs.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\n");
}

export default function ExportReport({ data }) {
  const exportJson = () => {
    downloadFile(
      `availabilityshield-report-${Date.now()}.json`,
      JSON.stringify({ generatedAt: new Date().toISOString(), ...data }, null, 2),
      "application/json"
    );
  };

  const exportCsv = () => {
    downloadFile(
      `availabilityshield-requests-${Date.now()}.csv`,
      toCsv(data.logs || []),
      "text/csv;charset=utf-8"
    );
  };

  const exportPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF();
    const metrics = data.metrics || {};
    const queue = data.queue || {};
    pdf.setFontSize(18);
    pdf.text("AvailabilityShield Report", 14, 18);
    pdf.setFontSize(10);
    pdf.text(`Generated: ${data.generatedAt || new Date().toISOString()}`, 14, 27);
    pdf.text(`Requests: ${metrics.totalRequests || 0}`, 14, 40);
    pdf.text(`Error rate: ${((metrics.errorRate || 0) * 100).toFixed(2)}%`, 14, 48);
    pdf.text(`Average response: ${metrics.averageResponseTime || 0} ms`, 14, 56);
    pdf.text(`Queued: ${queue.totalQueued || 0} | Rejected: ${queue.totalQueueRejected || 0}`, 14, 64);
    pdf.text(`Decisions: ${JSON.stringify(metrics.decisions || {})}`, 14, 74, { maxWidth: 180 });
    pdf.text("Conclusion: AvailabilityShield preserved the protected service while applying policy-driven mitigation.", 14, 92, { maxWidth: 180 });
    pdf.save(`availabilityshield-report-${Date.now()}.pdf`);
  };

  return (
    <section className="panel export-panel full-width">
      <div className="panel-title">
        <div>
          <h2>Export Report</h2>
          <p>Download the current dashboard snapshot for documentation</p>
        </div>
        <Download size={20} />
      </div>

      <div className="export-actions">
        <button type="button" className="secondary-button" onClick={exportJson}>
          <Download size={16} /> Export JSON
        </button>
        <button type="button" className="secondary-button" onClick={exportCsv}>
          <Download size={16} /> Export request CSV
        </button>
        <button type="button" className="secondary-button" onClick={exportPdf}>
          <Download size={16} /> Export PDF
        </button>
      </div>
    </section>
  );
}
