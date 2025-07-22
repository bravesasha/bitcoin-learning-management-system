import { sql } from '@blms/database';
import type { Dependencies } from '../../dependencies.js';

/**
 * Service to get available languages for PPTX files for a specific slide
 */
export const createGetPptxAvailableLanguages = ({ s3 }: Dependencies) => {
  return async (
    courseId: string,
    partId: string,
    chapterId: string,
    slideId: string,
  ): Promise<string[]> => {
    try {
      // List every object in the course folder and extract language codes
      const prefix = `contribute/${courseId}/`;
      const keys = await (s3 as any).list(prefix);

      // Regex to capture the language code from object keys that belong to the requested slide
      const regex = new RegExp(
        `^contribute/${courseId}/([^/]+)/${partId}/${chapterId}/${slideId}/pptx/`,
      );

      const languages = new Set<string>();
      for (const key of keys) {
        const match = key.match(regex);
        if (match) {
          languages.add(match[1]);
        }
      }

      return Array.from(languages);
    } catch (error) {
      console.error('Error fetching PPTX availability:', error);
      return [];
    }
  };
};

/**
 * Service to get available languages for transcript content for a specific slide
 */
export const createGetTranscriptAvailableLanguages = ({
  postgres,
}: Dependencies) => {
  return async (
    courseId: string,
    partId: string,
    chapterId: string,
    slideId: string,
  ): Promise<string[]> => {
    try {
      const rows = await postgres.exec(sql`
        SELECT DISTINCT language
        FROM content.course_translation_slides
        WHERE course_id = ${courseId}
          AND part_id = ${partId}
          AND chapter_id = ${chapterId}
          AND slide_id = ${slideId}
          AND translated_content IS NOT NULL
          AND translated_content <> ''
      `);

      return rows.map((r: any) => r.language);
    } catch (error) {
      console.error('Error fetching transcript availability:', error);
      return [];
    }
  };
};

/**
 * Service to check if a file exists in S3 with fallback options
 */
export const createCheckFileExistence = ({ s3 }: Dependencies) => {
  return async (
    primaryKey: string,
    fallbackKey?: string,
  ): Promise<{ exists: boolean; key: string; metadata: any }> => {
    try {
      let head = await s3.head(primaryKey).catch(() => null);
      let actualKey = primaryKey;

      if (!head && fallbackKey) {
        head = await s3.head(fallbackKey).catch(() => null);
        actualKey = fallbackKey;
      }

      return {
        exists: !!head,
        key: actualKey,
        metadata: head,
      };
    } catch (error) {
      console.error('Error checking file existence:', error);
      return { exists: false, key: primaryKey, metadata: null };
    }
  };
};
