import type React from 'react';
import { useEffect, useState } from 'react';

interface PptLinkProps {
  courseId: string;
  slideId: string;
  language: string;
  onValidate: () => void;
  validated: boolean;
  onSaveChanges: () => void;
  hasUnsavedChanges: boolean;
}

// Build the API URL that proxies the PPTX through the backend instead of exposing the raw S3 bucket.
const buildPptxApiUrl = (
  courseId: string,
  slideId: string,
  lang: string,
): string => {
  return `/api/translation-downloads/pptx/${courseId}/${slideId}/${lang}`;
};

export const PptLinkSection: React.FC<PptLinkProps> = ({
  courseId,
  slideId,
  language,
  onValidate,
  validated,
  onSaveChanges,
  hasUnsavedChanges,
}) => {
  const [exists, setExists] = useState<boolean | null>(null);

  const url = buildPptxApiUrl(courseId, slideId, language);

  useEffect(() => {
    let cancelled = false;
    setExists(null);
    fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } })
      .then((res) => !cancelled && setExists(res.ok))
      .catch(() => !cancelled && setExists(false));
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <>
      {/* PPTX Link or status */}
      {exists === null && (
        <p className="mb-4 text-sm text-gray-500">Checking PPTX resource…</p>
      )}
      {exists === true && (
        <div className="mb-4 flex flex-col items-start gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-500 underline text-sm"
          >
            {`${slideId}.pptx`}
          </a>
          {/* Temporary download link for testing */}
          <a
            href={url}
            download={`${slideId}.pptx`}
            className="text-sm text-orange-600 underline hover:text-orange-500"
          >
            Download PPTX
          </a>
        </div>
      )}
      {exists === false && (
        <p className="mb-4 text-sm text-gray-500">PPTX resource not found.</p>
      )}

      {/* Action Buttons (save & validate) */}
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={onSaveChanges}
          disabled={!hasUnsavedChanges}
          className="bg-orange-500 text-white px-6 py-2 rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save changes
        </button>
        <button
          type="button"
          onClick={onValidate}
          className="flex items-center gap-3 cursor-pointer bg-transparent border-0 p-0"
        >
          <div
            className={`w-6 h-6 border-2 rounded-[4px] flex items-center justify-center ${
              validated
                ? 'bg-orange-500 border-orange-500'
                : 'bg-transparent border-gray-400'
            }`}
          >
            {validated && <span className="text-white text-sm">✓</span>}
          </div>
          <span className="text-gray-900 font-medium">
            Validate presentation PPT
          </span>
        </button>
      </div>
    </>
  );
};
