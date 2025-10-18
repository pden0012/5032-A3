import { getFunctions, httpsCallable } from 'firebase/functions'
import app from '../config/firebase'

const functions = getFunctions(app)
// http base for REST api function (us-central1)
// simple english comment: this is the public url base
const API_BASE = 'https://us-central1-a-333-e9359.cloudfunctions.net/api'

/**
 * saveReview
 * Calls the backend callable function `saveReview` with the given payload
 * and returns an object containing average rating and total count for the
 * specified resource. Throws an error with a concise message when the
 * remote invocation fails or input validation is rejected by the server.
 */
export async function saveReview(resourceId, rating) {
  const callable = httpsCallable(functions, 'saveReview')
  const res = await callable({ resourceId: Number(resourceId), rating: Number(rating) })
  return res.data
}

/**
 * fetchReviews
 * call HTTP function to get all reviews for one resource
 * returns { resourceId, reviews: [], count }
 */
export async function fetchReviews(resourceId) {
  const id = Number(resourceId)
  if (!Number.isFinite(id)) throw new Error('resourceId must be a number')
  const url = `${API_BASE}/reviews?resourceId=${id}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('failed to load reviews')
  const data = await res.json()
  // normalize for nicer UI: shorten uid and format timestamp
  const toDateString = (ts) => {
    try {
      if (!ts) return ''
      if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString()
      if (ts._seconds) return new Date(ts._seconds * 1000).toLocaleString()
      return ''
    } catch { return '' }
  }
  data.reviews = (data.reviews || []).map(r => ({
    ...r,
    userShort: (r.userId || '').slice(0, 6) || '-'
  , time: toDateString(r.createdAt) }))
  return data
}

/**
 * getStats
 * call callable function to get average and count for one resource
 */
export async function getStats(resourceId) {
  const callable = httpsCallable(functions, 'getStats')
  const res = await callable({ resourceId: Number(resourceId) })
  return res.data
}

export default { saveReview, fetchReviews, getStats }


