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
import { auth } from '../config/firebase'

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
  async registerWithEmail(email, password, username) {
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
        return '用户不存在'
      case 'auth/wrong-password':
        return '密码错误'
      case 'auth/email-already-in-use':
        return '邮箱已被使用'
      case 'auth/weak-password':
        return '密码强度不够'
      case 'auth/invalid-email':
        return '邮箱格式无效'
      case 'auth/user-disabled':
        return '用户已被禁用'
      case 'auth/too-many-requests':
        return '请求过于频繁，请稍后再试'
      case 'auth/operation-not-allowed':
        return '操作不被允许'
      case 'auth/popup-closed-by-user':
        return '登录窗口被用户关闭'
      case 'auth/cancelled-popup-request':
        return '登录请求被取消'
      default:
        return '认证失败，请重试'
    }
  }
}

// create an instance of our authentication service
// this is like making a copy of our service that other parts of the app can use
export const firebaseAuthService = new FirebaseAuthService()
