import { ref, readonly } from 'vue'

// this function sets up users data when the app starts
// checks if there are any saved users in the browser storage
// if no saved users exist, creates some default test users to work with
const initializeUsers = () => {
  const storedUsers = localStorage.getItem('users')
  if (storedUsers) {
    return JSON.parse(storedUsers)
  } else {
    // default users for testing (passwords should be encrypted in real projects)
    // these are just simple demo passwords for learning how authentication works
    return [
      {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123', // simple password for demo
        role: 'admin',
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        username: 'demo',
        email: 'demo@example.com',
        password: 'demo123', // simple password for demo
        role: 'user',
        createdAt: new Date().toISOString()
      }
    ]
  }
}

// this is the fake user database for testing with localStorage persistence
// stores all users in this reactive array and saves them to browser storage
// whenever users are added or changed, automatically saves to localStorage
const users = ref(initializeUsers())

// this function saves users to localStorage whenever the users array changes
// converts the users array to JSON string and stores it in browser storage
// this way user data stays even when the page is refreshed
const saveUsersToStorage = () => {
  localStorage.setItem('users', JSON.stringify(users.value))
}

// these variables keep track of who is currently logged in
// currentUser stores the logged-in user's information
// isAuthenticated tells if someone is logged in or not
const currentUser = ref(null)
const isAuthenticated = ref(false)

// this is the main authentication service object
// contains all the functions needed for user authentication
// handles user registration, login, logout, and checking login status
export const authService = {
  // this function handles user registration
  // when someone wants to create a new account, this function does the work
  // checks if the username or email already exists, then creates the account
  async register(userData) {
    try {
      // check if username or email already exists
      // looks through all existing users to see if someone already has this username or email
      const existingUser = users.value.find(user => 
        user.username === userData.username || user.email === userData.email
      )
      
      if (existingUser) {
        throw new Error('Username or email already exists')
      }
      
      // create new user object
      // generates a new ID and uses the selected role
      const newUser = {
        id: users.value.length + 1,
        username: userData.username,
        email: userData.email,
        password: userData.password, // in real project, password should be encrypted
        role: userData.role || 'user', // use selected role or default to 'user'
        createdAt: new Date().toISOString()
      }
      
      users.value.push(newUser)
      
      // save updated users to localStorage
      // ensures the new user is persisted to browser storage
      saveUsersToStorage()
      
      // automatically login after registration
      // calls the login function to authenticate the new user
      return await this.login(userData.username, userData.password)
      
    } catch (error) {
      return { success: false, message: error.message }
    }
  },
  
  // this function handles user login
  // authenticates a user by checking username and password
  // if successful, sets the user as logged in and saves to localStorage
  async login(username, password) {
    try {
      // find user with matching username and password
      // searches through the users array to find a matching user
      const user = users.value.find(u => 
        u.username === username && u.password === password
      )
      
      if (!user) {
        throw new Error('Invalid username or password')
      }
      
      // set login state
      // creates a user object without the password for security
      currentUser.value = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
      isAuthenticated.value = true
      
      // save to local storage for persistence
      // allows the user to stay logged in after page refresh
      localStorage.setItem('currentUser', JSON.stringify(currentUser.value))
      localStorage.setItem('isAuthenticated', 'true')
      
      // trigger auth state change event
      // 触发认证状态变化事件
      this.triggerAuthStateChange()
      
      return { success: true, message: 'Login successful', user: currentUser.value }
    } catch (error) {
      return { success: false, message: error.message }
    }
  },
  
  // this function handles user logout
  // logs out the current user and clears all stored data
  // resets the authentication state and removes data from localStorage
  logout() {
    currentUser.value = null
    isAuthenticated.value = false
    
    // clear local storage
    // removes all stored user data from the browser
    localStorage.removeItem('currentUser')
    localStorage.removeItem('isAuthenticated')
    
    // trigger auth state change event
    // 触发认证状态变化事件
    this.triggerAuthStateChange()
  },
  
  // this function checks authentication status from local storage
  // checks if there is a stored user in localStorage
  // called when the app starts to restore login state
  checkAuthStatus() {
    const storedUser = localStorage.getItem('currentUser')
    const storedAuth = localStorage.getItem('isAuthenticated')
    
    if (storedUser && storedAuth === 'true') {
      currentUser.value = JSON.parse(storedUser)
      isAuthenticated.value = true
    }
  },
  
  // this function returns the current logged-in user object
  getCurrentUser() {
    return currentUser.value
  },
  
  // this function returns true if the user is currently authenticated
  isLoggedIn() {
    return isAuthenticated.value
  },
  
  // these functions provide reactive access to auth state
  // 这些函数提供对认证状态的响应式访问
  get currentUserReactive() {
    return currentUser.value
  },
  
  get isAuthenticatedReactive() {
    return isAuthenticated.value
  },
  
  // function to trigger auth state change event
  // 触发认证状态变化事件的函数
  triggerAuthStateChange() {
    console.log('Triggering auth state change event...') // debug log
    window.dispatchEvent(new CustomEvent('authStateChanged'))
  },
  
  // this function checks if the current user has a specific role
  // useful for role-based access control
  hasRole(role) {
    return currentUser.value && currentUser.value.role === role
  },
  
  // this function specifically checks if the current user is an admin
  // convenience function for admin-only features
  isAdmin() {
    return this.hasRole('admin')
  }
}

// this function provides reactive authentication state to Vue components
// returns readonly versions of the state to prevent direct mutation
export const useAuth = () => {
  return {
    currentUser: readonly(currentUser),
    isAuthenticated: readonly(isAuthenticated),
    authService
  }
}
