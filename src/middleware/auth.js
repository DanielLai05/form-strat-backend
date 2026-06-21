import { getFirebaseAuth } from '../config/firebase.js';
import { ApiError } from '../utils/ApiError.js';
import { isProd } from '../config/env.js';

/**
 * Verifies the Firebase ID token in the Authorization header and attaches
 * `req.user = { uid, email }`. Use on any route that needs a signed-in user.
 *
 *   router.get('/', requireAuth, asyncHandler(listForms));
 */
export const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(401, 'Missing or malformed Authorization header');
    }

    // getFirebaseAuth() throws 503 if the service account isn't configured.
    const decoded = await getFirebaseAuth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email || null };
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    // Surface the real Firebase reason server-side (e.g. token expired, clock
    // skew, wrong project). In development also return it as `details` so it's
    // visible in the response; never leak it in production.
    const reason = `${err.code || ''} ${err.message || ''}`.trim();
    console.error('Auth token verification failed:', reason);
    next(
      new ApiError(
        401,
        'Invalid or expired authentication token',
        isProd ? undefined : reason
      )
    );
  }
};
