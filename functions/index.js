/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { setGlobalOptions } = require("firebase-functions");
const { onCall } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

/**
 * saveReview callable function
 * Validates authentication and input fields, writes a review document
 * into Firestore, and returns aggregated statistics (average rating and
 * total count) for the given resource. Designed for direct calls from
 * the web client via Firebase Functions callable API.
 */
exports.saveReview = onCall(async (request) => {
  const ctx = request; // v2 onCall wraps data in request.data and auth in request.auth

  // Authentication check
  if (!ctx.auth || !ctx.auth.uid) {
    logger.warn("Unauthenticated attempt to save review");
    throw new Error("UNAUTHENTICATED");
  }

  const { resourceId, rating } = ctx.data || {};

  // Basic validation
  if (!resourceId || typeof resourceId !== "number") {
    throw new Error("INVALID_ARGUMENT: resourceId must be a number");
  }
  if (
    rating === undefined ||
    typeof rating !== "number" ||
    Number.isNaN(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    throw new Error("INVALID_ARGUMENT: rating must be 1..5");
  }

  const userId = ctx.auth.uid;

  // Upsert review with deterministic document id to avoid composite index
  const reviewsCol = db.collection("reviews");
  const docId = `${resourceId}_${userId}`;
  const now = admin.firestore.FieldValue.serverTimestamp();
  await reviewsCol.doc(docId).set(
    { resourceId, userId, rating, updatedAt: now, createdAt: now },
    { merge: true }
  );

  // Aggregate stats for this resource
  const allForResource = await reviewsCol
    .where("resourceId", "==", resourceId)
    .get();

  let sum = 0;
  let count = 0;
  allForResource.forEach((doc) => {
    const r = doc.data();
    if (typeof r.rating === "number") {
      sum += r.rating;
      count += 1;
    }
  });

  const average = count > 0 ? sum / count : 0;

  return { average, count };
});
