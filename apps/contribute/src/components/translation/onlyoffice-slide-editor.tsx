import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

interface OnlyOfficeSlideEditorProps {
  /** Absolute or relative URL of the PPTX file to edit */
  fileUrl: string | null;
  /** Optional additional className */
  className?: string;
  /** Callback when document is modified */
  onDocumentModified?: () => void;
  /** Course ID for manual saving */
  courseId?: string;
  /** Part ID for manual saving */
  partId?: string;
  /** Chapter ID for manual saving */
  chapterId?: string;
  /** Slide ID for manual saving */
  slideId?: string;
  /** Base file name (e.g., 1.1_0) without extension */
  fileName?: string;
  /** Language for manual saving */
  language?: string;
}

export interface OnlyOfficeSlideEditorRef {
  /** Save the current document content */
  saveDocument: () => Promise<void>;
}

/**
 * OnlyOffice Document Server presentation editor component.
 *
 * This component uses the OnlyOffice JavaScript API to properly initialize
 * the presentation editor with the correct configuration.
 */
export const OnlyOfficeSlideEditor = forwardRef<
  OnlyOfficeSlideEditorRef,
  OnlyOfficeSlideEditorProps
>(
  (
    {
      fileUrl,
      className,
      onDocumentModified,
      courseId,
      partId,
      chapterId,
      slideId,
      language,
      fileName,
    },
    ref,
  ) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const editorInstanceRef = useRef<any>(null);
    // Store the generated document key so we can reuse it when triggering forcesave
    const documentKeyRef = useRef<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Expose saveDocument method to parent component
    useImperativeHandle(ref, () => ({
      saveDocument: async () => {
        if (
          !editorInstanceRef.current ||
          !courseId ||
          !partId ||
          !chapterId ||
          !slideId ||
          !language ||
          !fileName
        ) {
          console.error(
            'Editor not initialized or missing required parameters',
          );
          return;
        }

        try {
          console.log('Initiating manual save for:', {
            courseId,
            slideId,
            language,
          });

          // Set saving state
          setIsSaving(true);

          // Use our API proxy to trigger OnlyOffice forcesave (avoids CORS issues)
          const documentKey = documentKeyRef.current;
          if (!documentKey) {
            console.error(
              'Document key not available – editor may not have initialised yet',
            );
            return;
          }
          const commandUrl = '/api/translation-downloads/pptx-forcesave';

          const commandBody = {
            documentKey,
            courseId,
            partId,
            chapterId,
            slideId,
            language,
            fileName,
          };

          console.log('Sending forcesave command via proxy:', commandBody);

          const response = await fetch(commandUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(commandBody),
            credentials: 'include', // Include session cookies for authentication
          });

          const result = await response.json();
          console.log('Forcesave command result:', result);

          if (result.error === 0) {
            console.log(
              'Manual save requested successfully - waiting for callback...',
            );

            // Wait a reasonable time for the callback to complete, then reset state
            setTimeout(() => {
              setIsSaving(false);
              console.log('Manual save process completed');
            }, 5000); // 5 second timeout
          } else {
            console.error('Forcesave command failed:', result);
            setIsSaving(false);
          }
        } catch (error) {
          console.error('Error during manual save:', error);
          setIsSaving(false);
        }
      },
    }));

    useEffect(() => {
      if (!fileUrl || !editorRef.current) {
        return;
      }

      // Generate a short-lived download URL for OnlyOffice via token endpoint
      const initializeEditor = async () => {
        try {
          if (
            !courseId ||
            !partId ||
            !chapterId ||
            !slideId ||
            !language ||
            !fileName
          ) {
            console.error(
              'Missing path parameters for OnlyOffice initialization',
            );
            return;
          }

          // Determine API host for callback URLs inside the OnlyOffice container
          //  - For the browser we can safely rely on a relative path for the token request
          //  - For the OnlyOffice callback we still need a host reachable from the container
          const isHybridDev =
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';
          const apiHost = isHybridDev
            ? 'host.docker.internal:3000'
            : 'api:3000';

          // Request a short download token (reduces URL length) – call the API through the same
          // origin as the frontend to avoid DNS resolution issues in the browser.
          const tokenResp = await fetch(
            '/api/translation-downloads/pptx-token',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                courseId,
                partId,
                chapterId,
                slideId,
                language,
                fileName,
              }),
            },
          );

          if (!tokenResp.ok) {
            console.error('Failed to obtain OnlyOffice download token');
            return;
          }

          const { downloadUrl } = await tokenResp.json();

          // Ensure the download URL is reachable from inside the OnlyOffice container.
          // When the frontend runs on localhost the API host seen by the container should be
          // `host.docker.internal` (macOS/Windows) or the docker-compose service name `api`.
          // We already computed `apiHost` based on the running environment.

          let absoluteFileUrl: string = downloadUrl as string;
          if (isHybridDev) {
            // Replace "localhost:3000" (or 127.0.0.1) with a host resolvable inside Docker
            absoluteFileUrl = absoluteFileUrl
              .replace('localhost:3000', apiHost)
              .replace('127.0.0.1:3000', apiHost);
          }

          // Generate a unique document key (OnlyOffice uses this for document identification)
          const documentKey = btoa(absoluteFileUrl).replace(
            /[^a-zA-Z0-9]/g,
            '',
          );
          documentKeyRef.current = documentKey;

          // OnlyOffice configuration
          const config: any = {
            document: {
              fileType: 'pptx',
              key: documentKey,
              title: 'Slide.pptx',
              url: absoluteFileUrl,
              permissions: {
                comment: true,
                download: true,
                edit: true,
                fillForms: true,
                modifyFilter: true,
                modifyContentControl: true,
                review: true,
                chat: false,
                reviewGroups: [''],
                userInfoGroups: [''],
                protect: false,
              },
              info: {
                favorite: false,
                folder: '',
                owner: 'Translator',
                sharingSettings: [],
                uploaded: new Date().toISOString(),
              },
            },
            documentType: 'slide',
            editorConfig: {
              mode: 'edit',
              lang: 'en',
              // Add callback URL for manual saves
              ...(courseId &&
                partId &&
                chapterId &&
                slideId &&
                language &&
                fileName && {
                  callbackUrl: `${window.location.protocol}//${apiHost}/api/translation-downloads/pptx-callback?courseId=${courseId}&partId=${partId}&chapterId=${chapterId}&slideId=${slideId}&language=${language}&fileName=${fileName}`,
                }),
              coEditing: {
                mode: 'fast',
                change: false, // Disable change tracking
              },
              user: {
                id: 'user-1',
                name: 'Translator',
              },
              customization: {
                autosave: false, // Disable auto-save completely
                forcesave: false, // Disable force save
                commentAuthorOnly: false,
                comments: true,
                compactToolbar: false,
                compatibleFeatures: false,
                customer: {
                  address: '',
                  info: '',
                  logo: '',
                  mail: '',
                  name: '',
                  phone: '',
                  www: '',
                },
                feedback: {
                  url: '',
                  visible: false,
                },
                goback: {
                  url: '',
                  text: '',
                },
                hideRightMenu: false,
                hideRulers: false,
                integrationMode: 'embed',
                macros: false,
                macrosMode: 'warn',
                mentionShare: false,
                plugins: true,
                toolbarHideFileName: false,
                toolbarNoTabs: false,
                unit: 'cm',
                zoom: 100,
                features: {
                  spellcheck: true,
                },
                anonymous: {
                  request: false,
                  label: 'Anonymous',
                },
                reviewDisplay: 'original',
                trackChanges: false,
                hideNotes: false,
                uiTheme: 'theme-classic-light',
                toolbar: {
                  file: {
                    save: false, // Hide save button - we handle saving manually
                    print: false, // Hide print button
                  },
                },
              },
            },
            height: '600px',
            width: '100%',
            events: {
              onAppReady: () => {
                console.log('OnlyOffice editor is ready');
              },
              onDocumentStateChange: (event: any) => {
                console.log('Document state changed:', event);
                // Notify parent component when document is modified
                if (onDocumentModified) {
                  onDocumentModified();
                }
              },
              onError: (event: any) => {
                console.error('OnlyOffice error:', event);
                if (event.data?.error) {
                  console.error('Error details:', event.data.error);
                }
              },
              onRequestRestore: () => {
                console.log('OnlyOffice requesting document restore');
                return false; // Prevent default restore behavior
              },
              onRequestSaveAs: (event: any) => {
                console.log('OnlyOffice requesting save as');
                return false; // Prevent default save as behavior
              },
              onDownloadAs: (event: any) => {
                console.log('OnlyOffice downloading document');
                return false; // Prevent default download behavior
              },
              onRequestSave: () => {
                console.log('OnlyOffice requesting save');
                return false; // Prevent default save behavior
              },
              onRequestClose: () => {
                console.log('OnlyOffice requesting close');
                return false; // Prevent default close behavior
              },
            },
            token: '', // No JWT token for development
          };

          // Load OnlyOffice API script if not already loaded
          if (!(window as any).DocsAPI) {
            const script = document.createElement('script');
            script.src = 'http://localhost/web-apps/apps/api/documents/api.js';
            script.onload = () => {
              // Initialize OnlyOffice editor
              if ((window as any).DocsAPI) {
                editorInstanceRef.current = new (
                  window as any
                ).DocsAPI.DocEditor(editorRef.current!.id, config);
              }
            };
            script.onerror = () => {
              console.error('Failed to load OnlyOffice API script');
              if (editorRef.current) {
                editorRef.current.innerHTML =
                  '<div style="padding: 20px; color: red;">Failed to load OnlyOffice API. Please check if OnlyOffice server is running.</div>';
              }
            };
            document.head.appendChild(script);
          } else {
            // OnlyOffice API already loaded, initialize directly
            editorInstanceRef.current = new (window as any).DocsAPI.DocEditor(
              editorRef.current!.id,
              config,
            );
          }
        } catch (error) {
          console.error('Error initializing OnlyOffice editor:', error);
          if (editorRef.current) {
            editorRef.current.innerHTML =
              '<div style="padding: 20px; color: red;">Error loading editor. Please try again.</div>';
          }
        }
      };

      // Initialize the editor
      initializeEditor();

      // Cleanup function
      return () => {
        // OnlyOffice doesn't provide a direct cleanup method, but we can clear the container
        if (editorRef.current) {
          editorRef.current.innerHTML = '';
        }
      };
    }, [fileUrl, courseId, partId, chapterId, slideId, language, fileName]);

    if (!fileUrl) {
      return <div className={className}>No slide selected…</div>;
    }

    return (
      <div
        ref={editorRef}
        id={`onlyoffice-editor-${Date.now()}`}
        className={className}
        style={{
          width: '100%',
          height: '600px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
        }}
      />
    );
  },
);
