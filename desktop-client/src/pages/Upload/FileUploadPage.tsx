import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { apiClient } from "@/services/apiClient";
import { useApiQuery } from "@/hooks/useApiQuery";

type AssetClass = {
  asset_class_id: string;
  class_name: string;
  portfolio_name: string;
};

type AssetClassesResponse = {
  success: boolean;
  asset_classes: AssetClass[];
};

type ValidationResult = {
  success: boolean;
  valid: boolean;
  row_count: number;
  errors: string[];
  warnings: string[];
  preview: any[];
};

type ImportResult = {
  success: boolean;
  message: string;
  imported_count: number;
  failed_count: number;
  imported: any[];
  failed: any[];
};

const FileUploadPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [selectedAssetClass, setSelectedAssetClass] = useState<string>("");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const assetClassesQuery = useApiQuery<AssetClassesResponse>({
    method: "get",
    url: "/asset-classes"
  });

  const assetClasses = assetClassesQuery.data?.asset_classes ?? [];

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setValidationResult(null);
      setImportResult(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"]
    },
    maxFiles: 1
  });

  const handleValidate = async () => {
    if (!file) return;

    setIsValidating(true);
    setValidationResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post("/securities/upload/validate", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setValidationResult(response.data);
    } catch (error: any) {
      alert("Validation failed: " + (error.response?.data?.message || error.message));
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!file || !selectedAssetClass) {
      alert("Please select an asset class before importing.");
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("asset_class_id", selectedAssetClass);

      const response = await apiClient.post("/securities/upload/import", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setImportResult(response.data);

      // Refresh after successful import
      if (response.data.imported_count > 0) {
        setTimeout(() => {
          setFile(null);
          setValidationResult(null);
          setSelectedAssetClass("");
        }, 3000);
      }
    } catch (error: any) {
      alert("Import failed: " + (error.response?.data?.message || error.message));
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setValidationResult(null);
    setImportResult(null);
    setSelectedAssetClass("");
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-100">Security Upload</h1>
        <p className="mt-2 text-sm text-slate-400">
          Upload CSV or Excel files to bulk import securities. Files are validated before import.
        </p>
      </header>

      {/* Asset Class Selection */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <label className="block text-sm font-medium text-slate-300">
          Select Asset Class for Import *
        </label>
        <select
          value={selectedAssetClass}
          onChange={(e) => setSelectedAssetClass(e.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
        >
          <option value="">Choose an asset class...</option>
          {assetClasses.map((ac) => (
            <option key={ac.asset_class_id} value={ac.asset_class_id}>
              {ac.class_name} ({ac.portfolio_name})
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-slate-400">
          Securities will be imported with positions in the selected asset class.
        </p>
      </div>

      {/* File Upload Dropzone */}
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition ${
          isDragActive
            ? "border-blue-500 bg-blue-500/10"
            : file
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-slate-700 bg-slate-900/60 hover:border-slate-600"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-slate-800 p-4">
            <svg
              className="h-8 w-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          {file ? (
            <div>
              <p className="text-lg font-medium text-emerald-200">{file.name}</p>
              <p className="text-sm text-slate-400">{(file.size / 1024).toFixed(2)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium text-slate-200">
                {isDragActive ? "Drop file here..." : "Drag & drop file here"}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                or click to browse (Excel .xlsx, .xls or CSV)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {file && (
        <div className="flex gap-3">
          <button
            onClick={handleValidate}
            disabled={isValidating}
            className="flex-1 rounded-lg border border-blue-500/40 bg-blue-500/10 px-6 py-3 text-sm font-medium text-blue-200 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isValidating ? "Validating..." : "Validate File"}
          </button>
          <button
            onClick={handleImport}
            disabled={!validationResult?.valid || !selectedAssetClass || isImporting}
            className="flex-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-6 py-3 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isImporting ? "Importing..." : "Import Securities"}
          </button>
          <button
            onClick={handleReset}
            className="rounded-lg border border-slate-700 px-6 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-600"
          >
            Reset
          </button>
        </div>
      )}

      {/* Validation Results */}
      {validationResult && (
        <div
          className={`rounded-2xl border p-6 ${
            validationResult.valid
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-rose-500/40 bg-rose-500/5"
          }`}
        >
          <h3 className="text-lg font-semibold text-slate-100">Validation Results</h3>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-slate-300">
              <span className="font-medium">Status:</span>{" "}
              {validationResult.valid ? (
                <span className="text-emerald-200">✓ Valid</span>
              ) : (
                <span className="text-rose-200">✗ Invalid</span>
              )}
            </p>
            <p className="text-sm text-slate-300">
              <span className="font-medium">Rows:</span> {validationResult.row_count}
            </p>
          </div>

          {validationResult.errors.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-rose-200">Errors:</p>
              <ul className="mt-2 space-y-1">
                {validationResult.errors.map((error, idx) => (
                  <li key={idx} className="text-sm text-rose-300">
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {validationResult.warnings.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-amber-200">Warnings:</p>
              <ul className="mt-2 space-y-1">
                {validationResult.warnings.map((warning, idx) => (
                  <li key={idx} className="text-sm text-amber-300">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {validationResult.preview.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-300">Preview (first 3 rows):</p>
              <div className="mt-2 overflow-x-auto rounded-lg border border-slate-700 bg-slate-950">
                <table className="min-w-full text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400">
                    <tr>
                      {Object.keys(validationResult.preview[0] || {}).slice(0, 5).map((key) => (
                        <th key={key} className="px-3 py-2 text-left">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {validationResult.preview.slice(0, 3).map((row, idx) => (
                      <tr key={idx} className="border-t border-slate-800">
                        {Object.values(row).slice(0, 5).map((val: any, i) => (
                          <td key={i} className="px-3 py-2">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Results */}
      {importResult && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-6">
          <h3 className="text-lg font-semibold text-emerald-200">Import Complete!</h3>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-slate-300">
              <span className="font-medium">Imported:</span> {importResult.imported_count} securities
            </p>
            {importResult.failed_count > 0 && (
              <p className="text-sm text-rose-300">
                <span className="font-medium">Failed:</span> {importResult.failed_count} rows
              </p>
            )}
          </div>

          {importResult.failed.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-rose-200">Failed Imports:</p>
              <ul className="mt-2 space-y-1">
                {importResult.failed.map((fail, idx) => (
                  <li key={idx} className="text-sm text-rose-300">
                    • {fail.security_name}: {fail.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUploadPage;
