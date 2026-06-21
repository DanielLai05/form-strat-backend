import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { env } from './env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Lazily-initialized Firebase Admin app, used to verify ID tokens. Optional at
 * boot — protected routes throw a clear 503 until the service account is set.
 */
let app = null;

export const isAuthConfigured = () =>
  Boolean(
    env.firebase.projectId &&
      env.firebase.clientEmail &&
      env.firebase.privateKey
  );

export const getFirebaseAuth = () => {
  if (!isAuthConfigured()) {
    throw new ApiError(
      503,
      'Authentication is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
    );
  }
  if (!app) {
    // firebase-admin v14 uses the modular API (firebase-admin/app, /auth)
    // instead of the old `admin.apps` / `admin.credential` namespace.
    app =
      getApps()[0] ??
      initializeApp({
        credential: cert({
          projectId: env.firebase.projectId,
          clientEmail: env.firebase.clientEmail,
          privateKey: env.firebase.privateKey,
        }),
      });
  }
  return getAuth(app);
};
