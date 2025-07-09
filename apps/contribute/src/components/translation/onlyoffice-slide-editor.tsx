import type React from 'react';

interface OnlyOfficeSlideEditorProps {
  /** Absolute or relative URL of the PPTX file to edit */
  fileUrl: string | null;
  /** Optional additional className */
  className?: string;
}

/**
 * Lightweight wrapper around ONLYOFFICE DocumentServer presentation editor.
 *
 * The component renders an <iframe> that loads the presentation editor in **edit** mode.
 * OnlyOffice expects the file to be publicly downloadable from the URL we pass.
 * For local development we just expose our existing backend proxy route `/api/translation-downloads/pptx/...`.
 *
 * NOTE: In production you should secure the DocumentServer with JWT and generate an editorConfig
 * JSON. For the sake of local development we simply point to the public URL.
 */
export const OnlyOfficeSlideEditor: React.FC<OnlyOfficeSlideEditorProps> = ({
  fileUrl,
  className,
}) => {
  if (!fileUrl) {
    return <div className={className}>No slide selected…</div>;
  }

  // Build the editor URL. We assume the DocumentServer is available at http://localhost:8000
  // This mirrors the `onlyoffice` service added to docker-compose (port mapping 8000 -> 80).
  const host = window.location.hostname;
  const protocol = window.location.protocol;
  const editorUrl = `${protocol}//${host}/web-apps/apps/presentationeditor?fileUrl=${encodeURIComponent(
    fileUrl,
  )}&mode=edit&lang=en&theme=theme-light`;

  return (
    <iframe
      title="OnlyOffice Presentation Editor"
      src={editorUrl}
      className={className}
      style={{
        width: '100%',
        height: '600px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
      }}
      allowFullScreen
    />
  );
};
