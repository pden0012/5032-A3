// importing all the Firebase auth functions we need
// this is like getting all the tools from Firebase's toolbox
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
import { auth, db } from '../config/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

// setting up Google as a login provider
// this tells Firebase we want to use Google for signing in
const googleProvider = new GoogleAuthProvider()
// asking for permission to get user's email and basic profile info
googleProvider.addScope('email')
googleProvider.addScope('profile')

// this is our main authentication service class
// it handles all the login and registration stuff for our app
class FirebaseAuthService {
  // this function lets users register with email and password
  // it's like creating a new account the traditional way
  async registerWithEmail(email, password, username, role = 'user') {
    try {
      // create a new user account with Firebase
      // this is where the magic happens - Firebase creates the account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      // update the user's display name so they show up nicely in our app
      // this makes the username appear instead of just the email
      await updateProfile(user, {
        displayName: username
      })
      
      // save user data to Firestore database
      // this creates a user profile in our database for admin panel
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: email,
        username: username,
        role: role,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        provider: 'email',
        emailVerified: user.emailVerified
      })
      
      // also save to localStorage for backward compatibility
      const userData = {
        id: user.uid,
        uid: user.uid,
        email: email,
        username: username,
        role: role,
        createdAt: new Date().toISOString(),
        registeredAt: new Date().toISOString()
      }
      
      // get existing users and add new one
      const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
      existingUsers.push(userData)
      localStorage.setItem('users', JSON.stringify(existingUsers))
      
      // return success message and user info
      // this tells our app that everything worked out fine
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: username,
          photoURL: user.photoURL
        }
      }
    } catch (error) {
      // if something goes wrong, return an error message
      // this helps users understand what happened
      return {
        success: false,
        message: this.getErrorMessage(error.code)
      }
    }
  }

  // this function lets users log in with their email and password
  // it's the standard login that everyone knows
  async loginWithEmail(email, password) {
    try {
      // try to sign in with the provided email and password
      // Firebase checks if these credentials are correct
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      // if we get here, the login was successful
      // return the user info so our app knows who's logged in
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }
      }
    } catch (error) {
      // if login fails, return an error message
      // this could be wrong password, user doesn't exist, etc.
      return {
        success: false,
        message: this.getErrorMessage(error.code)
      }
    }
  }

  // this function handles Google login
  // it opens a popup window for users to sign in with their Google account
  async loginWithGoogle() {
    try {
      // open the Google login popup
      // this is where users click to sign in with Google
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user
      
      // check if this is a new user (first time login)
      // if it's a new user, save their data to Firestore
      if (result._tokenResponse?.isNewUser) {
        const username = user.displayName || user.email?.split('@')[0] || 'Google User'
        const role = user.email?.includes('admin') ? 'admin' : 'user'
        
        // save new user data to Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          username: username,
          role: role,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          provider: 'google',
          emailVerified: user.emailVerified,
          photoURL: user.photoURL
        })
        
        // also save to localStorage for backward compatibility
        const userData = {
          id: user.uid,
          uid: user.uid,
          email: user.email,
          username: username,
          role: role,
          createdAt: new Date().toISOString(),
          registeredAt: new Date().toISOString()
        }
        
        // get existing users and add new one
        const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
        existingUsers.push(userData)
        localStorage.setItem('users', JSON.stringify(existingUsers))
      } else {
        // existing user - update last login time
        await setDoc(doc(db, 'users', user.uid), {
          lastLoginAt: serverTimestamp()
        }, { merge: true })
      }
      
      // if Google login works, return the user info
      // now they're logged in with their Google account
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }
      }
    } catch (error) {
      // if Google login fails, return an error message
      // maybe they closed the popup or something went wrong
      return {
        success: false,
        message: this.getErrorMessage(error.code)
      }
    }
  }

  // this function logs the user out
  // it clears their login session and returns them to logged-out state
  async logout() {
    try {
      // tell Firebase to sign out the current user
      // this clears their authentication
      await signOut(auth)
      return { success: true }
    } catch (error) {
      // if logout fails, return an error message
      // this shouldn't happen often, but just in case
      return {
        success: false,
        message: this.getErrorMessage(error.code)
      }
    }
  }

  // this function watches for changes in authentication state
  // it's like having a security guard that tells us when someone logs in or out
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback)
  }

  // this function gets the current logged-in user
  // it's like asking "who's logged in right now?"
  getCurrentUser() {
    return auth.currentUser
  }

  // this function converts Firebase error codes into user-friendly messages
  // instead of showing technical error codes, we show messages people can understand
  getErrorMessage(errorCode) {
    // check what kind of error happened and return a helpful message
    // this makes the app more user-friendly instead of showing scary technical errors
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'User not found'
      case 'auth/wrong-password':
        return 'Incorrect password'
      case 'auth/email-already-in-use':
        return 'Email is already in use'
      case 'auth/weak-password':
        return 'Password is too weak'
      case 'auth/invalid-email':
        return 'Invalid email format'
      case 'auth/user-disabled':
        return 'User account is disabled'
      case 'auth/too-many-requests':
        return 'Too many requests, please try again later'
      case 'auth/operation-not-allowed':
        return 'Operation not allowed'
      case 'auth/popup-closed-by-user':
        return 'Login popup was closed by the user'
      case 'auth/cancelled-popup-request':
        return 'Login request was cancelled'
      default:
        return 'Authentication failed, please try again'
    }
  }
}

// create an instance of our authentication service
// this is like making a copy of our service that other parts of the app can use
export const firebaseAuthService = new FirebaseAuthService()
