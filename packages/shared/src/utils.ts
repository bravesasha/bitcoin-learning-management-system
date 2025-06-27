export const LANGUAGES_MAP: { [key: string]: string } = {
  cs: 'Čeština',
  de: 'Deutsch',
  en: 'English',
  es: 'Español',
  et: 'Eesti keel',
  fi: 'Suomi',
  fr: 'Français',
  hi: 'हिंदी',
  id: 'Bahasa indonesia',
  it: 'Italiano',
  ja: '日本語',
  nbno: 'Norsk bokmål',
  pl: 'Polski',
  pt: 'Português',
  ru: 'Русский',
  srlatn: 'Srpski',
  sw: 'Kiswahili',
  vi: 'Tiếng Việt',
  zhhans: '简体中文',
  zhhant: '繁體中文',
};

// Course status utilities
export const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'published':
      return 'bg-green-100 text-green-800';
    case 'reviewed':
      return 'bg-blue-100 text-blue-800';
    case 'under_review':
      return 'bg-yellow-100 text-yellow-800';
    case 'ready_for_review':
      return 'bg-purple-100 text-purple-800';
    case 'in_progress':
      return 'bg-orange-100 text-orange-800';
    case 'todo':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getStatusText = (
  status: string,
  t: (key: string) => string,
): string => {
  switch (status) {
    case 'published':
      return t('dashboard.adminPanel.translationPanel.status.published');
    case 'reviewed':
      return t('dashboard.adminPanel.translationPanel.status.reviewed');
    case 'under_review':
      return t('dashboard.adminPanel.translationPanel.status.underReview');
    case 'ready_for_review':
      return t('dashboard.adminPanel.translationPanel.status.readyForReview');
    case 'in_progress':
      return t('dashboard.adminPanel.translationPanel.status.inProgress');
    case 'todo':
      return t('dashboard.adminPanel.translationPanel.status.todo');
    default:
      return t('dashboard.adminPanel.translationPanel.status.todo');
  }
};

export const isLanguageClickable = (status: string): boolean => {
  return ['ready_for_review', 'under_review', 'reviewed', 'published'].includes(
    status,
  );
};

export const getProgressPercentage = (status: string): string => {
  if (status === 'reviewed' || status === 'published') {
    return '100%';
  }
  if (status === 'in_progress') {
    return '50%';
  }
  return '0%';
};
