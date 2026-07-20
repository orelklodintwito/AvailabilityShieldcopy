import React from "react";
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
      </div>
    </section>
  );
}
