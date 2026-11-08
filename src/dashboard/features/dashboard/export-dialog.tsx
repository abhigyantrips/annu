import { Modal } from "@/components/modal";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useState } from "react";
export function ExportDialog({
  siteId,
  range: { from, to },
  onClose,
}: {
  siteId: string;
  range: { from: number; to: number };
  onClose: () => void;
}) {
  const [exportKind, setExportKind] = useState("views"),
    [exportFormat, setExportFormat] = useState("csv");
  return (
    <Modal title="Export Data" onClose={() => onClose()}>
      <p className="muted">
        Export raw records for the selected date range. Exports stream in small
        batches.
      </p>
      <div className="grid gap-2">
        <span className="text-sm font-medium">Records</span>
        <SelectField
          label="Records"
          value={exportKind}
          onValueChange={setExportKind}
          options={[
            { value: "views", label: "Pages Viewed and Reading Times" },
            { value: "visits", label: "Visits, Entry Sources, and Location" },
            { value: "clicks", label: "Outgoing Clicks" },
            { value: "vitals", label: "Performance Samples" },
          ]}
        />
      </div>
      <div className="grid gap-2">
        <span className="text-sm font-medium">Format</span>
        <SelectField
          label="Format"
          value={exportFormat}
          onValueChange={setExportFormat}
          options={[
            { value: "csv", label: "CSV" },
            { value: "json", label: "JSON" },
          ]}
        />
      </div>
      <div className="form-actions">
        <Button
          variant="default"
          nativeButton={false}
          render={
            <a
              download
              href={`/api/sites/${siteId}/export?from=${from}&to=${to}&kind=${exportKind}&format=${exportFormat}`}
            />
          }
          onClick={() => onClose()}
        >
          <Download size={15} />
          Download Export
        </Button>
      </div>
    </Modal>
  );
}
