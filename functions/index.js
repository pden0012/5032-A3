/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { setGlobalOptions } = require("firebase-functions");
const { onCall, onRequest } = require("firebase-functions/v2/https");
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

/**
 * api (HTTP) function
 * GET /api/reviews?resourceId=:id
 * return all reviews for one resource
 * use simple CORS so browser can call it
 */
exports.api = onRequest(async (req, res) => {
  // basic CORS headers
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  // only allow GET for this route
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  // simple path router: handle /reviews only
  if (req.path !== "/reviews") {
    res.status(404).json({ error: "Not Found" });
    return;
  }

  const idRaw = req.query.resourceId;
  const resourceId = Number(idRaw);
  if (!Number.isFinite(resourceId)) {
    res.status(400).json({ error: "resourceId must be a number" });
    return;
  }

  try {
    const snap = await db
      .collection("reviews")
      .where("resourceId", "==", resourceId)
      .get();

    // build plain array of reviews
    const reviews = [];
    snap.forEach((d) => {
      const v = d.data();
      reviews.push({
        id: d.id,
        resourceId: v.resourceId,
        userId: v.userId || null,
        rating: v.rating || null,
        createdAt: v.createdAt || null,
        updatedAt: v.updatedAt || null,
      });
    });

    res.status(200).json({ resourceId, reviews, count: reviews.length });
  } catch (e) {
    logger.error("api /reviews error", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * getStats callable function
 * simple stats for reviews data
 * if resourceId is given, return stats for that resource only
 * else return global stats for all reviews
 */
exports.getStats = onCall(async (request) => {
  const ctx = request;
  if (!ctx.auth || !ctx.auth.uid) {
    throw new Error("UNAUTHENTICATED");
  }

  const { resourceId } = ctx.data || {};
  const reviewsCol = db.collection("reviews");

  // when resourceId pass in, do focused query
  if (typeof resourceId === "number") {
    const snap = await reviewsCol.where("resourceId", "==", resourceId).get();
    let sum = 0;
    let count = 0;
    const users = new Set();
    snap.forEach((d) => {
      const v = d.data();
      if (typeof v.rating === "number") {
        sum += v.rating;
        count += 1;
      }
      if (v.userId) users.add(v.userId);
    });
    const average = count > 0 ? sum / count : 0;
    return { scope: "resource", resourceId, average, count, uniqueUsers: users.size };
  }

  // else build simple global stats
  const all = await reviewsCol.get();
  let sum = 0;
  let count = 0;
  const users = new Set();
  const resources = new Set();
  all.forEach((d) => {
    const v = d.data();
    if (typeof v.rating === "number") {
      sum += v.rating;
      count += 1;
    }
    if (v.userId) users.add(v.userId);
    if (typeof v.resourceId !== "undefined") resources.add(v.resourceId);
  });
  const average = count > 0 ? sum / count : 0;
  return {
    scope: "global",
    reviewsCount: count,
    averageRating: average,
    uniqueUsers: users.size,
    uniqueResources: resources.size,
  };
});

