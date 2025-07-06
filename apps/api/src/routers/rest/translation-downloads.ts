import { NoSuchKey } from '@blms/s3';
import type { Router } from 'express';

import type { Dependencies } from '#src/dependencies.js';
import { BadRequest } from '#src/errors.js';
import { expressAuthMiddleware } from '#src/middlewares/auth.js';

// Stream translated audio files stored in S3 to the client
export const createRestTranslationDownloadRoutes = async (
  dependencies: Dependencies,
  router: Router,
) => {
  router.get(
    '/translation-downloads/audio/:courseId/:slideId/:language',
    expressAuthMiddleware,
    async (req, res, next) => {
      try {
        const { courseId, slideId, language } = req.params;

        if (!courseId || !slideId || !language) {
          throw new BadRequest('Missing courseId, slideId or language');
        }

        // Path format used by the contribute front-end for generated audio files
        // <courseId>/<slideId>/<lang>/audio/<slideId>.m4a
        const key = `contribute-detailed/${courseId}/${slideId}/${language}/audio/${slideId}.m4a`;

        // Attempt to fetch metadata first – lets us set proper headers when available
        const head = await dependencies.s3.head(key).catch(() => null);

        const stream = await dependencies.s3.getStream(key);

        if (!stream) {
          res.status(404).send('Not found');
          return;
        }

        // Relay content-type & length if we have them, else fall back to generic audio
        if (head?.contentType) {
          res.setHeader('Content-Type', head.contentType);
        } else {
          res.setHeader('Content-Type', 'audio/mp4');
        }
        if (head?.contentLength) {
          res.setHeader('Content-Length', String(head.contentLength));
        }

        stream.pipe(res);
      } catch (error) {
        req.log('Error:', error);
        if (error instanceof NoSuchKey) {
          res.status(404).send('Not found');
          return;
        }
        next(error);
      }
    },
  );

  // Stream translated PPTX files stored in S3 to the client
  router.get(
    '/translation-downloads/pptx/:courseId/:slideId/:language',
    expressAuthMiddleware,
    async (req, res, next) => {
      try {
        const { courseId, slideId, language } = req.params;

        if (!courseId || !slideId || !language) {
          throw new BadRequest('Missing courseId, slideId or language');
        }

        // Path format used by the contribute front-end for generated pptx files
        // <courseId>/<slideId>/<lang>/pptx/<slideId>.pptx
        const key = `contribute-detailed/${courseId}/${slideId}/${language}/pptx/${slideId}.pptx`;

        // Try head for headers
        const head = await dependencies.s3.head(key).catch(() => null);

        const stream = await dependencies.s3.getStream(key);

        if (!stream) {
          res.status(404).send('Not found');
          return;
        }

        res.setHeader(
          'Content-Type',
          head?.contentType ||
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        );
        if (head?.contentLength) {
          res.setHeader('Content-Length', String(head.contentLength));
        }

        stream.pipe(res);
      } catch (error) {
        req.log('Error:', error);
        if (error instanceof NoSuchKey) {
          res.status(404).send('Not found');
          return;
        }
        next(error);
      }
    },
  );
};
