import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, AlertCircle } from 'lucide-react';

export default function FileDropzone({ onFileSelect, disabled }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const validateAndProcessFile = (file) => {
    setErrorMsg(null);
    if (!file) return;

    const validTypes = ['.csv', '.xlsx'];
    const fileName = file.name.toLowerCase();
    const isValidType = validTypes.some(ext => fileName.endsWith(ext));

    if (!isValidType) {
      setErrorMsg('Unsupported file format. Please upload a CSV (.csv) or Excel (.xlsx) file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 10 MB limit.');
      return;
    }

    onFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-10 rounded-2xl border-2 border-dashed
                   transition-all cursor-pointer select-none
                   ${disabled ? 'opacity-50 cursor-not-allowed border-slate-800 bg-slate-900/30' : ''}
                   ${isDragOver
                     ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                     : 'border-slate-700/80 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-900'
                   }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv"
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20
                        flex items-center justify-center mb-4 text-indigo-400">
          <UploadCloud size={32} />
        </div>

        <h3 className="text-base font-semibold text-slate-200 mb-1">
          Upload your data file
        </h3>
        <p className="text-xs text-slate-400 mb-4 text-center max-w-sm">
          Drag & drop your CSV or Excel spreadsheet here, or click to browse.
        </p>

        <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/50 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <FileSpreadsheet size={13} className="text-emerald-400" /> .CSV or .XLSX
          </span>
          <span>•</span>
          <span>Max 10 MB</span>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-fade-in">
          <AlertCircle size={14} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
