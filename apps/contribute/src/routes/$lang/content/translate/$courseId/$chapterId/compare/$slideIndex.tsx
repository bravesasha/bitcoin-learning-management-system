import { Button } from '@blms/ui';
import { Link, createFileRoute } from '@tanstack/react-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import BreadcrumbArrowIcon from '#src/assets/icons/breadcrumb_navigation_arrow_orange.svg';
import DroplistArrowIcon from '#src/assets/icons/droplist_arrow_balck.svg';

import { PageLayout } from '#src/components/page-layout.tsx';
import { OnlyOfficeSlideEditor } from '#src/components/translation/onlyoffice-slide-editor.tsx';
import { getLanguageName } from '#src/utils/i18n.ts';
import { trpcClient } from '#src/utils/trpc.ts';

export const Route = createFileRoute(
  '/$lang/content/translate/$courseId/$chapterId/compare/$slideIndex',
)({
  component: CompareSlidePage,
});

// ------------------
// Local Types – duplicated from parent translation page for convenience
// ------------------
interface ChapterTranslationContext {
  courseId: string;
  courseIndex: string;
  courseName: string;
  partId: string;
  partIndex: number;
  partTitle: string;
  chapterId: string;
  chapterIndex: number;
  chapterTitle: string;
  translationStatus: string;
  chapterTranslationStatus: string;
}

interface CourseTranslationSlide {
  courseId: string;
  language: string;
  partId: string;
  chapterId: string;
  slideId: string;
  slideNumber?: number;
  pptValidated?: boolean;
  transcriptionValidated?: boolean;
  audioValidated?: boolean;
  pptResourcePath: string | null;
  audioResourcePath: string | null;
  originalContent: string | null;
  translatedContent: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ChapterTranslationData {
  context: ChapterTranslationContext;
  slides: CourseTranslationSlide[];
}

function CompareSlidePage() {
  const { t } = useTranslation();
  const { courseId, chapterId, slideIndex, lang } = Route.useParams();

  const [chapterData, setChapterData] = useState<ChapterTranslationData | null>(
    null,
  );
  const [courseData, setCourseData] = useState<any>(null);
  const [totalChapters, setTotalChapters] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'presentation' | 'transcription'>(
    'presentation',
  );
  const [selectedOriginalLanguage, setSelectedOriginalLanguage] =
    useState<string>('');
  // NEW STATE: list of available languages fetched from backend
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);

  const numericSlideIndex = Number(slideIndex);
  const targetLanguage = Route.useSearch()?.targetLanguage || 'fr';

  // ------------------------------
  // Fetch languages available for this course (course_translations table)
  // ------------------------------
  useEffect(() => {
    const fetchAvailableLanguages = async () => {
      try {
        // Prefer public endpoint (works for any user)
        let resp: any;
        try {
          resp = await (
            trpcClient as any
          ).content.getCourseLanguagesPublic.query({ id: courseId });
        } catch (e: any) {
          // If public endpoint unavailable (older backend) or we are admin using secured route
          resp = await (trpcClient as any).content.getCourseLanguages?.query?.({
            id: courseId,
          });
        }
        if (resp?.languages?.length) {
          // Always ensure the course original language is present in the dropdown
          const originalLang = courseData?.originalLanguage ?? 'en';
          const codesSet = new Set<string>(
            resp.languages.map((l: any) => l.code),
          );
          codesSet.add(originalLang);
          const codes = Array.from(codesSet);
          setAvailableLanguages(codes);
          // If no language is selected yet, default to English if present, otherwise first language.
          if (!selectedOriginalLanguage) {
            const defaultLang = codes.includes('en') ? 'en' : codes[0];
            setSelectedOriginalLanguage(defaultLang);
          }
          return;
        }
      } catch (err) {
        // Not authorized or endpoint unavailable – log and continue with fallback
        console.warn('Could not fetch course languages, falling back', err);
      }

      // Fallback: use original language + English (if available)
      const originalLanguageCode = courseData?.originalLanguage ?? 'en';
      const hasEnglishVersion = originalLanguageCode.toLowerCase() !== 'en';
      const fallbackLanguages = hasEnglishVersion
        ? [originalLanguageCode, 'en']
        : [originalLanguageCode];
      setAvailableLanguages(fallbackLanguages);
      if (!selectedOriginalLanguage) {
        setSelectedOriginalLanguage(
          hasEnglishVersion ? 'en' : originalLanguageCode,
        );
      }
    };

    fetchAvailableLanguages();
    // We deliberately exclude courseData from deps to avoid double-call; courseId is sufficient.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [chapterResp, courseResp] = await Promise.all([
          trpcClient.content.getCourseTranslationSlides.query({
            courseId,
            language: targetLanguage,
            chapterId,
          }),
          trpcClient.content.getCourse.query({
            language: 'en',
            id: courseId,
          }),
        ]);

        setChapterData(chapterResp);
        setCourseData(courseResp);

        if (courseResp?.parts) {
          const chaptersCount = courseResp.parts.reduce(
            (total: number, part: any) => total + (part.chapters?.length || 0),
            0,
          );
          setTotalChapters(chaptersCount);
        }
      } catch (err) {
        console.error('Error fetching compare page data', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, chapterId, targetLanguage]);

  // Compute derived values once we have data
  const currentSlide = chapterData?.slides?.[numericSlideIndex];

  // Compute file base name (same logic as parent page)
  const fileBaseName = React.useMemo(() => {
    if (!chapterData || !currentSlide) return '';
    const partIdx = chapterData.context.partIndex;
    const chapIdx = chapterData.context.chapterIndex;
    const slideIdx = currentSlide.slideNumber ?? numericSlideIndex;
    return `${partIdx}.${chapIdx}_${slideIdx}`;
  }, [chapterData, currentSlide, numericSlideIndex]);

  // Original language handling
  const originalLanguageCode = courseData?.originalLanguage ?? 'en';
  const hasEnglishVersion = originalLanguageCode.toLowerCase() !== 'en';

  // Available languages for dropdown (original + English if different)
  // Remove previous availableLanguages memoization and related hasEnglishVersion logic if present

  // Initialize selected language when data loads
  React.useEffect(() => {
    if (courseData && !selectedOriginalLanguage) {
      // Default to English if available, otherwise use original language
      const defaultLanguage = hasEnglishVersion ? 'en' : originalLanguageCode;
      setSelectedOriginalLanguage(defaultLanguage);
    }
  }, [
    courseData,
    originalLanguageCode,
    selectedOriginalLanguage,
    hasEnglishVersion,
  ]);

  const originalLanguage =
    selectedOriginalLanguage ||
    (hasEnglishVersion ? 'en' : originalLanguageCode);
  const originalLanguageName = getLanguageName(originalLanguage);
  const targetLanguageName = getLanguageName(targetLanguage);

  // Overall chapter index for progress (copied logic)
  const overallChapterNumber = React.useMemo(() => {
    if (!courseData) return 0;
    const chaptersInCourse = courseData.parts.flatMap(
      (part: any) => part.chapters,
    );
    const index = chaptersInCourse.findIndex(
      (ch: any) => ch.chapterId === chapterId,
    );
    return index >= 0 ? index + 1 : 0;
  }, [courseData, chapterId]);

  const partEndIndexes = React.useMemo(() => {
    if (!courseData) return [] as number[];
    let cumulative = 0;
    return courseData.parts.map((part: any) => {
      cumulative += part.chapters?.length || 0;
      return cumulative - 1;
    });
  }, [courseData]);

  if (loading) {
    return (
      <PageLayout
        title=""
        variant="light"
        footerVariant="light"
        className="flex justify-center items-center min-h-screen"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        <div className="mt-4 text-gray-600">Loading compare view…</div>
      </PageLayout>
    );
  }

  if (error || !chapterData || !currentSlide) {
    return (
      <PageLayout
        title="Error"
        variant="light"
        footerVariant="light"
        className="flex justify-center items-center min-h-screen"
      >
        <div className="text-center">
          <div className="text-red-600 mb-4">
            Error: {error ?? 'Data not found'}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
          >
            Retry
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      variant="light"
      footerVariant="light"
      maxWidth="max-w-7xl"
      paddingXClasses="px-4 md:px-8"
    >
      {/* Header Section – copied from translation page for consistency */}
      <div className="text-center mb-10 mt-10">
        <p className="text-orange-500 text-base font-medium mb-2">
          {t('translate.bridgingLanguageGaps', {
            defaultValue: 'Bridging language gaps, one video at a time',
          })}
        </p>
        <h1 className="text-3xl font-bold mb-4 text-gray-900">
          {t('translate.bitcoinTranslationCommunity', {
            defaultValue: 'Bitcoin Proofreading Community',
          })}
        </h1>
        <p className="text-gray-600 max-w-3xl mx-auto mb-8">
          {t('translate.joinOurProofreaders', {
            defaultValue:
              'Join our proofreading team to make Bitcoin education accessible worldwide. You can help more people engage with the ecosystem and find their path to freedom!',
          })}
        </p>
      </div>

      {/* Navigation and Course Header */}
      <div className="flex flex-col gap-10 mb-10">
        <div className="flex items-center gap-1 text-base">
          <img src={BreadcrumbArrowIcon} alt="" className="w-[8px] h-[12px]" />
          <Link
            to="/$lang/content/translate/$courseId/$chapterId"
            params={{ lang, courseId, chapterId }}
            className="text-orange-500 hover:text-orange-600 font-medium"
          >
            {`${chapterData.context.partIndex}.${chapterData.context.chapterIndex} ${chapterData.context.chapterTitle}`}
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div
            className="text-gray-700 px-3 py-1 rounded text-sm font-medium"
            style={{ backgroundColor: '#E5E5E5' }}
          >
            {chapterData.context.courseIndex?.toUpperCase()}
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">
            {chapterData.context.courseName}
          </h2>
          <span className="ml-auto text-sm font-medium text-gray-900 text-right">
            {`${chapterData.context.partIndex}.${chapterData.context.chapterIndex} ${chapterData.context.chapterTitle}`}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-8">
        <button
          type="button"
          onClick={() => setActiveTab('presentation')}
          className={`px-4 py-2 text-sm font-medium relative ${
            activeTab === 'presentation'
              ? 'text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('translate.coursePresentation', {
            defaultValue: 'Course presentation',
          })}
          {activeTab === 'presentation' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('transcription')}
          className={`px-4 py-2 text-sm font-medium relative ${
            activeTab === 'transcription'
              ? 'text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('translate.transcription', { defaultValue: 'Transcription' })}
          {activeTab === 'transcription' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex flex-col gap-12">
        {/* Course Presentation Tab Content - Always rendered but hidden when not active */}
        <div
          className={`flex flex-col gap-12 ${activeTab === 'presentation' ? 'block' : 'hidden'}`}
        >
          {/* Original (top) */}
          <div>
            <div
              style={{
                backgroundColor: '#F5F5F5',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0px 1px 1px 0px #00000040',
              }}
            >
              {/* Language Selection Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-[10px]">
                  <span
                    className="text-[18px] font-semibold text-gray-900"
                    style={{ fontFamily: 'Rubik, sans-serif' }}
                  >
                    {t('translate.language', { defaultValue: 'Language' })}
                  </span>
                  {/* Custom select with dropdown arrow */}
                  <div className="relative">
                    <select
                      value={selectedOriginalLanguage}
                      onChange={(e) =>
                        setSelectedOriginalLanguage(e.target.value)
                      }
                      className="appearance-none bg-white border border-[#CCCCCC] rounded-[10px] text-sm text-orange-500 w-[225px] h-[34px] pl-8 pr-3 py-1"
                    >
                      {availableLanguages.map((lang) => (
                        <option key={lang} value={lang}>
                          {getLanguageName(lang)}
                        </option>
                      ))}
                    </select>
                    {/* Black arrow icon */}
                    <img
                      src={DroplistArrowIcon}
                      alt="Dropdown arrow"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-[11px] h-[7px]"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <OnlyOfficeSlideEditor
                  key={`original-${selectedOriginalLanguage}-${currentSlide?.slideId ?? ''}`}
                  fileUrl={
                    currentSlide
                      ? `/api/translation-downloads/pptx/${courseId}/${originalLanguage}/${currentSlide.partId}/${chapterId}/${currentSlide.slideId}/${fileBaseName}`
                      : null
                  }
                  className="w-full"
                  courseId={courseId}
                  partId={currentSlide?.partId}
                  chapterId={chapterId}
                  slideId={currentSlide?.slideId}
                  fileName={fileBaseName}
                  language={originalLanguage}
                />
              </div>
            </div>
          </div>

          {/* Proofread (bottom) */}
          <div>
            <div
              style={{
                backgroundColor: '#F5F5F5',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0px 1px 1px 0px #00000040',
              }}
            >
              {/* Language info header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-[10px]">
                  <span
                    className="text-[18px] font-semibold text-gray-900"
                    style={{ fontFamily: 'Rubik, sans-serif' }}
                  >
                    {t('translate.language', { defaultValue: 'Language' })}
                  </span>
                  <span
                    className="text-orange-500 text-[18px]"
                    style={{ fontFamily: 'Rubik, sans-serif' }}
                  >
                    {targetLanguageName}
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <OnlyOfficeSlideEditor
                  key={`proofread-${targetLanguage}-${currentSlide?.slideId ?? ''}`}
                  fileUrl={
                    currentSlide
                      ? `/api/translation-downloads/pptx/${courseId}/${targetLanguage}/${currentSlide.partId}/${chapterId}/${currentSlide.slideId}/${fileBaseName}-proofread`
                      : null
                  }
                  className="w-full"
                  courseId={courseId}
                  partId={currentSlide?.partId}
                  chapterId={chapterId}
                  slideId={currentSlide?.slideId}
                  fileName={`${fileBaseName}-proofread`}
                  language={targetLanguage}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Transcription Tab Content - Always rendered but hidden when not active */}
        <div
          className={`flex flex-col gap-12 ${activeTab === 'transcription' ? 'block' : 'hidden'}`}
        >
          {/* Original Transcription */}
          <div>
            <h3 className="mb-4 text-gray-900 font-semibold text-[20px]">
              {t('translate.originalTranscription', {
                defaultValue: 'Original transcription',
              })}{' '}
              – {originalLanguageName}
            </h3>
            <div className="bg-gray-50 border rounded-lg p-4 min-h-[200px]">
              <div className="text-gray-700 whitespace-pre-wrap">
                {currentSlide?.originalContent ||
                  t('translate.noTranscriptionAvailable', {
                    defaultValue: 'No transcription available',
                  })}
              </div>
            </div>
          </div>

          {/* Translated Transcription */}
          <div>
            <h3 className="mb-4 text-gray-900 font-semibold text-[20px]">
              {t('translate.translatedTranscription', {
                defaultValue: 'Translated transcription',
              })}{' '}
              – {targetLanguageName}
            </h3>
            <div className="bg-gray-50 border rounded-lg p-4 min-h-[200px]">
              <div className="text-gray-700 whitespace-pre-wrap">
                {currentSlide?.translatedContent ||
                  t('translate.noTranslationAvailable', {
                    defaultValue: 'No translation available',
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Go Back Button */}
      <div className="flex justify-end mt-12">
        <Link
          to="/$lang/content/translate/$courseId/$chapterId"
          params={{ lang, courseId, chapterId }}
        >
          <Button
            variant="primary"
            size="m"
            className="flex gap-[10px] text-[18px] leading-[18px] font-medium"
          >
            {t('translate.goBack', { defaultValue: 'Go back' })} ←
          </Button>
        </Link>
      </div>
    </PageLayout>
  );
}
