import { getFirebaseAuth } from '../config/firebase.js';
import { ApiError } from '../utils/ApiError.js';

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
    next(new ApiError(401, 'Invalid or expired authentication token'));
  }
};
