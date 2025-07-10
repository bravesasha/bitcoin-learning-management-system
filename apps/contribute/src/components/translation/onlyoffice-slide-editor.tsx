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
  /** Slide ID for manual saving */
  slideId?: string;
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
    { fileUrl, className, onDocumentModified, courseId, slideId, language },
    ref,
  ) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const editorInstanceRef = useRef<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Expose saveDocument method to parent component
    useImperativeHandle(ref, () => ({
      saveDocument: async () => {
        if (!editorInstanceRef.current || !courseId || !slideId || !language) {
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
          const documentKey = btoa(fileUrl!).replace(/[^a-zA-Z0-9]/g, '');
          const commandUrl = '/api/translation-downloads/pptx-forcesave';

          const commandBody = {
            documentKey,
            courseId,
            slideId,
            language,
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

      // Generate a temporary public download URL for OnlyOffice
      const initializeEditor = async () => {
        try {
          // Extract courseId, slideId, language from fileUrl
          // fileUrl format: /api/translation-downloads/pptx/courseId/slideId/language
          const urlParts = fileUrl.split('/');
          const courseId = urlParts[4]; // Fixed: courseId is at index 4
          const slideId = urlParts[5]; // Fixed: slideId is at index 5
          const language = urlParts[6]; // Fixed: language is at index 6

          // Use a public endpoint that OnlyOffice can access without authentication
          // In hybrid dev: OnlyOffice (Docker) → API (host) via host.docker.internal
          // In production: OnlyOffice (Docker) → API (Docker) via service name
          const isHybridDev = window.location.hostname === 'localhost';
          const apiHost = isHybridDev
            ? 'host.docker.internal:3000'
            : 'api:3000';
          const absoluteFileUrl = `${window.location.protocol}//${apiHost}/api/translation-downloads/pptx-public/${courseId}/${slideId}/${language}`;

          // Generate a unique document key (OnlyOffice uses this for document identification)
          const documentKey = btoa(fileUrl).replace(/[^a-zA-Z0-9]/g, '');

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
                slideId &&
                language && {
                  callbackUrl: `${window.location.protocol}//${apiHost}/api/translation-downloads/pptx-callback?courseId=${courseId}&slideId=${slideId}&language=${language}`,
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
    }, [fileUrl]);

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
