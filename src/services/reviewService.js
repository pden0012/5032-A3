import { getFunctions, httpsCallable } from 'firebase/functions'
import app from '../config/firebase'

const functions = getFunctions(app)

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

export default { saveReview }


