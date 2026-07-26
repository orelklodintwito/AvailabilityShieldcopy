import ExportReport from "../components/ExportReport.jsx";

export default function ReportsPage({ data, metrics, queue, layer4 }) {
  return <ExportReport data={{ generatedAt: new Date().toISOString(), metrics, queue, layer4, logs: data.logs || [], events: data.events || [], policy: data.policy }} />;
}
