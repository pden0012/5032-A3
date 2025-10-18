<template>
  <div class="login">
    <h2>Login</h2>
    
    <!-- error message display -->
    <div v-if="errorMessage" id="error-message" class="error-message" role="alert" aria-live="polite">
      {{ errorMessage }}
    </div>
    
    <!-- success message display -->
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>
    
    <!-- login form -->
    <form @submit.prevent="handleLogin" role="form" aria-label="Login form">
      <div class="form-group">
        <label for="username">Email:</label>
        <input 
          type="text" 
          id="username" 
          v-model="formData.username" 
          required 
        />
      </div>
      
      <div class="form-group">
        <label for="password">Password:</label>
        <input 
          type="password" 
          id="password" 
          v-model="formData.password" 
          required 
        />
      </div>
      
      <button type="submit" :disabled="isLoading" :aria-describedby="errorMessage ? 'error-message' : ''">
        {{ isLoading ? 'Logging in...' : 'Login' }}
      </button>
    </form>
    
    <!-- form divider -->
    <div class="form-divider">
      <span>or</span>
    </div>
    
    <!-- Google login button -->
    <button 
      @click="loginWithGoogle" 
      :disabled="isLoading"
      class="google-btn"
      aria-label="Login with Google account"
    >
      <svg class="google-icon" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Login with Google
    </button>
    
    <!-- navigation links -->
    <div style="text-align: center; margin-top: 1rem;">
      <p>Don't have an account? <router-link to="/register">Register here</router-link></p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '../services/auth'
import { firebaseAuthService } from '../services/firebaseAuth'
import { sanitizeInput } from '../utils/security'

/**
 * login form data structure containing user credentials
 * reactive object that holds username and password inputs
 * used for form submission and validation processes
 */
const formData = ref({
  username: '',
  password: ''
})

/**
 * loading state indicator for login process
 * prevents multiple simultaneous login attempts
 * shows loading spinner or disabled state during authentication
 */
const isLoading = ref(false)

/**
 * error message display for login failures
 * shows authentication errors or validation messages
 * cleared when user starts new login attempt
 */
const errorMessage = ref('')

/**
 * success message display for login completion
 * shows confirmation when login is successful
 * automatically cleared after short delay
 */
const successMessage = ref('')

/**
 * router instance for navigation after successful login
 * used to redirect user to appropriate page after authentication
 * handles navigation state and route transitions
 */
const router = useRouter()

/**
 * handle user login with form validation and authentication
 * processes login form submission with input sanitization
 * attempts authentication through firebase auth service
 * redirects to home page on successful login or shows error message
 */
const handleLogin = async () => {
  try {
    isLoading.value = true
    errorMessage.value = ''
    successMessage.value = ''
    
    // sanitize user inputs for security
    const sanitizedUsername = sanitizeInput(formData.value.username)
    const sanitizedPassword = sanitizeInput(formData.value.password)
    
    // attempt login with firebase auth service (expects email as first arg)
    const result = await firebaseAuthService.loginWithEmail(sanitizedUsername, sanitizedPassword)
    
    if (result && result.success) {
      successMessage.value = 'Login successful!'
      // proactively notify app to refresh auth/role state (avoid needing manual refresh)
      window.dispatchEvent(new CustomEvent('authStateChanged'))
      
      // redirect to home page after successful login
      setTimeout(() => {
        router.push('/')
      }, 1000)
    } else {
      errorMessage.value = (result && result.message) || 'Invalid email or password'
    }
  } catch (error) {
    console.error('Login error:', error)
    errorMessage.value = 'Login failed. Please try again.'
  } finally {
    isLoading.value = false
  }
}

/**
 * handle Google OAuth login process
 * initiates Google sign-in flow through firebase auth
 * redirects to home page on successful authentication
 * displays appropriate error messages for failed attempts
 */
const loginWithGoogle = async () => {
  try {
    isLoading.value = true
    errorMessage.value = ''
    
    // attempt Google login through firebase auth
    const user = await firebaseAuthService.loginWithGoogle()
    
    if (user) {
      successMessage.value = 'Google login successful!'
      // proactively notify app to refresh auth/role state
      window.dispatchEvent(new CustomEvent('authStateChanged'))
      
      // redirect to home page after successful login
      setTimeout(() => {
        router.push('/')
      }, 1000)
    }
  } catch (error) {
    console.error('Google login error:', error)
    errorMessage.value = 'Google login failed. Please try again.'
  } finally {
    isLoading.value = false
  }
}

/**
 * component initialization and setup
 * runs when component is mounted to DOM
 * performs any necessary initial setup or data loading
 */
onMounted(() => {
  // check if user is already logged in
  const currentUser = firebaseAuthService.getCurrentUser()
  if (currentUser) {
    router.push('/')
  }
})

export default {
  name: 'Login',
  setup() {
    return {
      // form data and state
      formData,
      isLoading,
      errorMessage,
      successMessage,
      
      // Authentication functions
      handleLogin,
      loginWithGoogle  // Google OAuth authentication function
    }
  }
}
</script>

<style scoped>
.login {
  max-width: 400px;
  margin: 0 auto;
  padding: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
}

button {
  width: 100%;
  background-color: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 0.5rem;
  margin-bottom: 1rem;
  border: 1px solid #f5c6cb;
}

.success-message {
  background-color: #d4edda;
  color: #155724;
  padding: 0.5rem;
  margin-bottom: 1rem;
  border: 1px solid #c3e6cb;
}

.google-btn {
  width: 100%;
  background-color: #4285f4;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.google-icon {
  width: 16px;
  height: 16px;
}

.form-divider {
  text-align: center;
  margin: 1rem 0;
  color: #333;
}
</style>