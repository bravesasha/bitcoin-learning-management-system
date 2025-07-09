import { randomUUID } from 'node:crypto';
import { NoSuchKey } from '@blms/s3';
import type { Router } from 'express';

import type { Dependencies } from '#src/dependencies.js';
import { BadRequest } from '#src/errors.js';
import { expressAuthMiddleware } from '#src/middlewares/auth.js';

// In-memory store for temporary download tokens (in production, use Redis)
const downloadTokens = new Map<
  string,
  {
    courseId: string;
    slideId: string;
    language: string;
    expires: number;
    userId: string;
  }
>();

// Clean up expired tokens every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [token, data] of downloadTokens.entries()) {
      if (data.expires < now) {
        downloadTokens.delete(token);
      }
    }
  },
  5 * 60 * 1000,
);

// Stream translated audio files stored in S3 to the client
export const createRestTranslationDownloadRoutes = async (
  dependencies: Dependencies,
  router: Router,
) => {
  // Generate temporary download token for OnlyOffice
  router.post(
    '/translation-downloads/pptx-token',
    expressAuthMiddleware,
    async (req, res, next) => {
      try {
        const { courseId, slideId, language } = req.body;
        const userId = req.session.uid;

        if (!courseId || !slideId || !language) {
          throw new BadRequest('Missing courseId, slideId or language');
        }

        if (!userId) {
          throw new BadRequest('User not authenticated');
        }

        // Generate a temporary token that expires in 10 minutes
        const token = randomUUID();
        const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

        downloadTokens.set(token, {
          courseId,
          slideId,
          language,
          expires,
          userId,
        });

        // Return the temporary download URL
        const downloadUrl = `${req.protocol}://${req.get('host')}/api/translation-downloads/pptx-direct/${token}`;

        res.json({
          downloadUrl,
          expiresAt: new Date(expires).toISOString(),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  // Direct download endpoint using token (no session auth required)
  router.get(
    '/translation-downloads/pptx-direct/:token',
    async (req, res, next) => {
      try {
        const { token } = req.params;

        if (!token) {
          throw new BadRequest('Missing token');
        }

        const tokenData = downloadTokens.get(token);
        if (!tokenData) {
          res.status(404).send('Token not found or expired');
          return;
        }

        if (tokenData.expires < Date.now()) {
          downloadTokens.delete(token);
          res.status(404).send('Token expired');
          return;
        }

        const { courseId, slideId, language } = tokenData;

        // Path format used by the contribute front-end for generated pptx files
        const key = `contribute-detailed/${courseId}/${slideId}/${language}/pptx/${slideId}.pptx`;

        // Try head for headers
        const head = await dependencies.s3.head(key).catch(() => null);

        const stream = await dependencies.s3.getStream(key);

        if (!stream) {
          res.status(404).send('File not found');
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

        // Clean up token after successful download
        downloadTokens.delete(token);

        stream.pipe(res);
      } catch (error) {
        req.log('Error:', error);
        if (error instanceof NoSuchKey) {
          res.status(404).send('File not found');
          return;
        }
        next(error);
      }
    },
  );

  router.get(
    '/translation-downloads/audio/:courseId/:slideId/:language',
    expressAuthMiddleware,
    async (req, res, next) => {
      try {
        const { courseId, slideId, language } = req.params;

        if (!courseId || !slideId || !language) {
          throw new BadRequest('Missing courseId, slideId or language');
        }

        // We support either .mp3 (preferred) or legacy .m4a encodings
        // <courseId>/<slideId>/<lang>/audio/<slideId>.(mp3|m4a)
        const buildKey = (ext: 'mp3' | 'm4a') =>
          `contribute-detailed/${courseId}/${slideId}/${language}/audio/${slideId}.${ext}`;

        let key = buildKey('mp3');
        let head = await dependencies.s3.head(key).catch(() => null);

        // Fallback to .m4a if mp3 is not found
        if (!head) {
          key = buildKey('m4a');
          head = await dependencies.s3.head(key).catch(() => null);
        }

        // File does not exist – 404 early
        if (!head?.contentLength) {
          res.status(404).send('Not found');
          return;
        }

        // Handle HTTP Range requests so the browser can stream / seek within the audio.
        const range = req.headers.range;

        // -----------------------------
        // No range header – stream full file as before
        // -----------------------------
        if (!range) {
          const stream = await dependencies.s3.getStream(key);

          if (!stream) {
            res.status(404).send('Not found');
            return;
          }

          res.setHeader('Content-Type', head?.contentType || 'audio/mp4');
          res.setHeader('Content-Length', String(head.contentLength));
          res.setHeader('Accept-Ranges', 'bytes');

          return void stream.pipe(res);
        }

        // -----------------------------
        // Range header present – parse it and stream partial content
        // -----------------------------
        const byteRange = /bytes=(\d+)-(\d*)/.exec(range);

        if (!byteRange) {
          res.status(416).send('Invalid range');
          return;
        }

        const start = Number(byteRange[1]);
        const endRaw = byteRange[2];
        const end = endRaw ? Number(endRaw) : head.contentLength - 1;

        if (
          Number.isNaN(start) ||
          Number.isNaN(end) ||
          start > end ||
          end >= head.contentLength
        ) {
          res.status(416).send('Requested range not satisfiable');
          return;
        }

        const chunkSize = end - start + 1;

        const stream = await dependencies.s3.getRangeStream(key, start, end);

        if (!stream) {
          res.status(404).send('Not found');
          return;
        }

        res.status(206);
        res.setHeader('Content-Type', head?.contentType || 'audio/mp4');
        res.setHeader('Content-Length', String(chunkSize));
        res.setHeader(
          'Content-Range',
          `bytes ${start}-${end}/${head.contentLength}`,
        );
        res.setHeader('Accept-Ranges', 'bytes');

        stream.pipe(res);
        return;
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
