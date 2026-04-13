"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { pb } from "@/lib/pocketbase";
import { parseCSV, CSVParsedRow, ColumnMapping, detectColumnMappings } from "@/lib/csvParser";
import { Upload } from "lucide-react";
import { toast } from "sonner";

const REQUIRED_FIELDS: (keyof ColumnMapping)[] = ["business_name", "phone"];
const OPTIONAL_FIELDS: (keyof ColumnMapping)[] = [
  "contact_name",
  "city",
  "state",
  "niche",
  "website",
  "notes",
];

export default function UploadPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [csvData, setCsvData] = useState<CSVParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [step, setStep] = useState<"upload" | "mapping" | "preview">("upload");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (!stored) {
      router.push("/login");
      return;
    }
    setUsername(stored);
  }, [router]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const { headers: h, data: d } = parseCSV(text);
        setHeaders(h);
        setCsvData(d);

        // Auto-detect mappings
        const detected = detectColumnMappings(h);
        setMapping(detected);

        setStep("mapping");
      } catch (err) {
        toast.error("Failed to parse CSV: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
  };

  const isMappingValid = () => {
    return REQUIRED_FIELDS.every((field) => mapping[field]);
  };

  const handleContinueToPreview = () => {
    if (!isMappingValid()) {
      toast.error("Please map Business Name and Phone Number");
      return;
    }
    setStep("preview");
  };

  const [eta, setEta] = useState<string>("");

  const handleImport = async () => {
    if (!username) return;

    setLoading(true);
    const total = csvData.length;
    setProgress({ current: 0, total });
    const startTime = Date.now();

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // Pre-fetch existing leads to avoid N duplicate checks
    const existingKeys = new Set<string>();
    try {
      const allExisting = await pb.collection("leads").getFullList({
        filter: `username = "${username}"`,
        fields: "business_name,phone",
      });
      allExisting.forEach((lead: any) => {
        existingKeys.add(`${lead.business_name}|${lead.phone}`);
      });
    } catch (err) {
      console.error("Failed to fetch existing leads:", err);
    }

    // Prepare rows to import
    const rowsToImport: { row: CSVParsedRow; key: string }[] = [];
    for (const row of csvData) {
      const businessName = row[mapping.business_name!];
      const phone = row[mapping.phone!];

      if (!businessName || !phone) {
        skipped++;
        continue;
      }

      const key = `${businessName}|${phone}`;
      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }

      rowsToImport.push({ row, key });
      existingKeys.add(key); // Prevent duplicates within the same CSV
    }

    // Process with concurrency limit (5 parallel requests)
    const CONCURRENCY = 5;
    let processed = 0;

    const processBatch = async (batch: typeof rowsToImport) => {
      const results = await Promise.allSettled(
        batch.map(async ({ row }) => {
          const businessName = row[mapping.business_name!];
          const phone = row[mapping.phone!];

          try {
            await pb.collection("leads").create({
              username,
              business_name: businessName,
              contact_name: mapping.contact_name ? row[mapping.contact_name] : "",
              phone: phone,
              city: mapping.city ? row[mapping.city] : "",
              state: mapping.state ? row[mapping.state] : "",
              niche: mapping.niche ? row[mapping.niche] : "",
              website: mapping.website ? row[mapping.website] : "",
              notes: mapping.notes ? row[mapping.notes] : "",
              status: "not_called",
              call_count: 0,
              verified: false,
              verification_score: 0,
            }, { $autoCancel: false });
            return "imported";
          } catch (err) {
            console.error("Failed to import row:", err);
            return "error";
          }
        })
      );

      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value === "imported") {
          imported++;
        } else {
          errors++;
        }
        processed++;
      });

      // Update progress and ETA
      const current = skipped + processed;
      setProgress({ current, total });

      const elapsedMs = Date.now() - startTime;
      const msPerItem = elapsedMs / processed;
      const remainingItems = rowsToImport.length - processed;
      const remainingMs = msPerItem * remainingItems;
      const remainingSec = Math.ceil(remainingMs / 1000);

      if (remainingSec < 60) {
        setEta(`${remainingSec}s remaining`);
      } else {
        const mins = Math.ceil(remainingSec / 60);
        setEta(`${mins}m remaining`);
      }
    };

    // Process in batches with delay to avoid rate limiting
    for (let i = 0; i < rowsToImport.length; i += CONCURRENCY) {
      const batch = rowsToImport.slice(i, i + CONCURRENCY);
      await processBatch(batch);
      // Small delay between batches to avoid overwhelming the server
      if (i + CONCURRENCY < rowsToImport.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    setLoading(false);
    setEta("");
    toast.success(`Import complete! Imported: ${imported}, Skipped: ${skipped}, Errors: ${errors}`);
    router.push("/dashboard");
  };

  const renderUploadStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Upload CSV</CardTitle>
        <CardDescription>
          Upload your prospect list. We&apos;ll help you map the columns.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload">
            <Button variant="outline" className="cursor-pointer" asChild>
              <span>Choose CSV File</span>
            </Button>
          </label>
          <p className="mt-2 text-sm text-gray-500">
            Or drag and drop your CSV file here
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const renderMappingStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Map Columns</CardTitle>
        <CardDescription>
          Match your CSV columns to our fields. Business Name and Phone are required.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-medium text-sm">Required Fields</h3>
          {REQUIRED_FIELDS.map((field) => (
            <div key={field} className="grid grid-cols-2 gap-4 items-center">
              <label className="text-sm">
                {field.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <Select
                value={mapping[field] || ""}
                onValueChange={(value) => handleMappingChange(field, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {headers.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-medium text-sm">Optional Fields</h3>
          {OPTIONAL_FIELDS.map((field) => (
            <div key={field} className="grid grid-cols-2 gap-4 items-center">
              <label className="text-sm">
                {field.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </label>
              <Select
                value={mapping[field] || "__skip__"}
                onValueChange={(value) => handleMappingChange(field, value === "__skip__" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select column (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__skip__">-- Skip --</SelectItem>
                  {headers.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setStep("upload")}>
          Back
        </Button>
        <Button onClick={handleContinueToPreview} disabled={!isMappingValid()}>
          Continue
        </Button>
      </CardFooter>
    </Card>
  );

  const renderPreviewStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Preview</CardTitle>
        <CardDescription>
          Review the first 5 rows before importing {csvData.length} leads.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {REQUIRED_FIELDS.concat(OPTIONAL_FIELDS.filter((f) => mapping[f])).map((field) => (
                  <th
                    key={field}
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {field.replace("_", " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {csvData.slice(0, 5).map((row, i) => (
                <tr key={i}>
                  {REQUIRED_FIELDS.concat(OPTIONAL_FIELDS.filter((f) => mapping[f])).map((field) => (
                    <td key={field} className="px-4 py-2 text-sm text-gray-900">
                      {row[mapping[field]!] || "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-600">
                Importing {progress.current} of {progress.total}...
              </p>
              {eta && (
                <span className="text-sm font-medium text-indigo-600">
                  {eta}
                </span>
              )}
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setStep("mapping")} disabled={loading}>
          Back
        </Button>
        <Button onClick={handleImport} disabled={loading}>
          {loading ? "Importing..." : `Import ${csvData.length} Leads`}
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Upload Leads</h1>
          <p className="text-zinc-500 mt-1">Import leads from CSV file</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {step === "upload" && renderUploadStep()}
        {step === "mapping" && renderMappingStep()}
        {step === "preview" && renderPreviewStep()}
      </div>
    </div>
  );
}
