import { useTranslation } from 'react-i18next';

import PlanBLogoBlack from '#src/assets/logo/planb_logo_horizontal_black_orangepill_gradient.svg';

interface VideoGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: number;
  onNextChapter: () => void;
  isLastChapter?: boolean;
}

// Static pixel configuration for the icon
const PIXEL_CONFIG = [
  { id: 'pixel-0-0', active: true },
  { id: 'pixel-0-1', active: false },
  { id: 'pixel-0-2', active: false },
  { id: 'pixel-0-3', active: true },
  { id: 'pixel-1-0', active: true },
  { id: 'pixel-1-1', active: false },
  { id: 'pixel-1-2', active: false },
  { id: 'pixel-1-3', active: true },
  { id: 'pixel-2-0', active: true },
  { id: 'pixel-2-1', active: false },
  { id: 'pixel-2-2', active: false },
  { id: 'pixel-2-3', active: true },
  { id: 'pixel-3-0', active: true },
  { id: 'pixel-3-1', active: false },
  { id: 'pixel-3-2', active: false },
  { id: 'pixel-3-3', active: true },
];

export const VideoGenerationModal = ({
  isOpen,
  onClose,
  progress,
  onNextChapter,
  isLastChapter = false,
}: VideoGenerationModalProps) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          type="button"
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          ×
        </button>

        {/* Logo and header */}
        <div className="flex flex-col items-center mb-6">
          <img src={PlanBLogoBlack} alt="Plan B Network" className="h-8 mb-4" />
          <h2 className="text-orange-500 text-lg font-medium mb-2">
            {t('translate.videoGeneration.completed', {
              defaultValue:
                'Great job! Thank you for proofreading this course!',
            })}
          </h2>
        </div>

        {/* Video generation icon and progress */}
        <div className="flex flex-col items-center mb-6">
          {/* Pixelated icon placeholder - matches the design from the image */}
          <div className="mb-4">
            <div className="w-12 h-12 grid grid-cols-4 gap-0.5">
              {PIXEL_CONFIG.map((pixel) => (
                <div
                  key={pixel.id}
                  className={`w-2 h-2 ${
                    pixel.active ? 'bg-orange-500' : 'bg-orange-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Progress text */}
          <p className="text-orange-500 font-medium mb-2">
            {progress}%{' '}
            {t('translate.videoGeneration.progress', {
              defaultValue: 'progress',
            })}
          </p>

          {/* Status message */}
          <p className="text-gray-600 text-center text-sm">
            {t('translate.videoGeneration.completedMessage', {
              defaultValue:
                'No need to wait! Feel free to review the next course now.',
            })}
          </p>
        </div>

        {/* Action button */}
        <div className="flex justify-center">
          <button
            type="button"
            className="bg-orange-500 text-white py-2 px-6 rounded hover:bg-orange-600 transition-colors flex items-center gap-2"
            onClick={onNextChapter}
          >
            {isLastChapter
              ? t('translate.videoGeneration.backToCourse', {
                  defaultValue: 'Back to course',
                })
              : t('translate.videoGeneration.nextChapter', {
                  defaultValue: 'Next chapter',
                })}
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
};
