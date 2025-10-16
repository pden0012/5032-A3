<template>
  <div class="register">
    <h2>Register</h2>
    
    <!-- error message display -->
    <div v-if="errorMessage" id="error-message" class="error-message" role="alert" aria-live="polite">
      {{ errorMessage }}
    </div>
    
    <!-- success message display -->
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>
    
    <!-- registration form -->
    <form @submit.prevent="handleRegister" role="form" aria-label="Registration form">
      <div class="form-group">
        <label for="username">Username:</label>
        <input 
          type="text" 
          id="username" 
          v-model="username" 
          @blur="validateUsername(true)"
          @input="validateUsername(false)"
          required 
        />
        <div v-if="errors.username" class="error-text">{{ errors.username }}</div>
      </div>
      
      <div class="form-group">
        <label for="email">Email:</label>
        <input 
          type="email" 
          id="email" 
          v-model="email" 
          @blur="validateEmail(true)"
          @input="validateEmail(false)"
          required 
        />
        <div v-if="errors.email" class="error-text">{{ errors.email }}</div>
      </div>
      
      <div class="form-group">
        <label for="password">Password:</label>
        <input 
          type="password" 
          id="password" 
          v-model="password" 
          @blur="validatePassword(true)"
          @input="validatePassword(false)"
          required 
        />
        <div v-if="errors.password" class="error-text">{{ errors.password }}</div>
      </div>
      
      <div class="form-group">
        <label for="confirmPassword">Confirm Password:</label>
        <input 
          type="password" 
          id="confirmPassword" 
          v-model="confirmPassword" 
          @blur="validateConfirmPassword(true)"
          @input="validateConfirmPassword(false)"
          required 
        />
        <div v-if="errors.confirmPassword" class="error-text">{{ errors.confirmPassword }}</div>
      </div>
      
      <!-- Role Selection -->
      <div class="form-group">
        <label for="role">Account Type:</label>
        <select id="role" v-model="selectedRole" required>
          <option value="user">Regular User</option>
          <option value="admin">Administrator</option>
        </select>
        <div class="role-description">
          <small v-if="selectedRole === 'user'">Access to resources and basic features</small>
          <small v-if="selectedRole === 'admin'">Full access to admin panel and system management</small>
        </div>
      </div>
      
      <button type="submit" :disabled="isLoading || !isFormValid">
        {{ isLoading ? 'Creating Account...' : 'Register' }}
      </button>
    </form>
    
    <!-- form divider -->
    <div class="form-divider">
      <span>or</span>
    </div>
    
    <!-- Google registration button -->
    <button 
      @click="loginWithGoogle" 
      :disabled="isLoading"
      class="google-btn"
      aria-label="Sign up with Google account"
    >
      <svg class="google-icon" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Sign up with Google
    </button>
    
    <!-- navigation links -->
    <div style="text-align: center; margin-top: 1rem;">
      <p>Already have an account? <router-link to="/login">Login here</router-link></p>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { firebaseAuthService } from '../services/firebaseAuth'
import { sanitizeInput } from '../utils/security'

/**
 * form input data structure containing user registration information
 * reactive object that holds username, email, password and confirmation
 * used for form submission and validation processes
 */
const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const selectedRole = ref('user')

/**
 * loading state indicator for registration process
 * prevents multiple simultaneous registration attempts
 * shows loading spinner or disabled state during account creation
 */
const isLoading = ref(false)

/**
 * error message display for registration failures
 * shows authentication errors or validation messages
 * cleared when user starts new registration attempt
 */
const errorMessage = ref('')

/**
 * success message display for registration completion
 * shows confirmation when account creation is successful
 * automatically cleared after short delay
 */
const successMessage = ref('')

/**
 * validation error messages for individual form fields
 * reactive object containing field-specific error messages
 * updated during real-time validation and form submission
 */
const errors = ref({
  username: null,
  email: null,
  password: null,
  confirmPassword: null
})

/**
 * router instance for navigation after successful registration
 * used to redirect user to appropriate page after account creation
 * handles navigation state and route transitions
 */
const router = useRouter()

/**
 * computed property to determine overall form validation status
 * checks if all form fields pass validation requirements
 * enables or disables form submission based on validation state
 */
const isFormValid = computed(() => {
  return username.value.length >= 3 &&
         email.value &&
         password.value.length >= 6 &&
         confirmPassword.value === password.value &&
         !Object.values(errors.value).some(error => error !== null)
})

/**
 * validateUsername - Performs username format and length validation
 * Ensures username meets minimum character requirements and format standards
 * Uses input sanitization for security and format consistency
 * @param {boolean} blur - Controls error display timing (true for blur event, false for input event)
 * @returns {void} - Function performs validation and updates username error state
 */
const validateUsername = (blur) => {
  const sanitizedUsername = sanitizeInput(username.value)
  
  if (sanitizedUsername.length < 3) {
    if (blur) errors.value.username = "Username must be at least 3 characters"
  } else {
    errors.value.username = null
  }
}

/**
 * validateEmail - Performs email format validation using regular expression pattern matching
 * Validates email address structure to ensure proper format compliance
 * Uses standard email regex pattern for comprehensive format checking
 * @param {boolean} blur - Controls error display timing (true for blur event, false for input event)
 * @returns {void} - Function performs validation and updates email error state
 */
const validateEmail = (blur) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(email.value)) {
    if (blur) errors.value.email = "Please enter a valid email address"
  } else {
    errors.value.email = null
  }
}

/**
 * validatePassword - Comprehensive password security validation function
 * Implements multi-criteria password validation including length, character type diversity
 * Validates password complexity requirements for enhanced security standards
 * @param {boolean} blur - Controls error display timing (true for blur event, false for input event)
 * @returns {void} - Function performs validation and updates password error state
 */
const validatePassword = (blur) => {
  const pwd = password.value
  let errorMessage = null
  
  if (pwd.length < 6 || pwd.length > 20) {
    errorMessage = "Password must be between 6-20 characters"
  } else if (!/[A-Z]/.test(pwd)) {
    errorMessage = "Password must contain at least one uppercase letter"
  } else if (!/[a-z]/.test(pwd)) {
    errorMessage = "Password must contain at least one lowercase letter"
  } else if (!/[0-9]/.test(pwd)) {
    errorMessage = "Password must contain at least one number"
  }
  
  if (blur) errors.value.password = errorMessage
}

/**
 * validateConfirmPassword - Validates password confirmation matching
 * Ensures password confirmation matches original password entry
 * Prevents registration with mismatched password fields
 * @param {boolean} blur - Controls error display timing (true for blur event, false for input event)
 * @returns {void} - Function performs validation and updates confirmation error state
 */
const validateConfirmPassword = (blur) => {
  if (confirmPassword.value !== password.value) {
    if (blur) errors.value.confirmPassword = "Passwords do not match"
  } else {
    errors.value.confirmPassword = null
  }
}

/**
 * handle user registration with form validation and account creation
 * processes registration form submission with input sanitization
 * attempts account creation through firebase auth service
 * redirects to home page on successful registration or shows error message
 */
const handleRegister = async () => {
  try {
    isLoading.value = true
    errorMessage.value = ''
    successMessage.value = ''
    
    // validate all fields before submission
    validateUsername(true)
    validateEmail(true)
    validatePassword(true)
    validateConfirmPassword(true)
    
    // check if form is valid after validation
    if (!isFormValid.value) {
      errorMessage.value = 'Please fix all validation errors'
      return
    }
    
    // sanitize user inputs for security
    const sanitizedUsername = sanitizeInput(username.value)
    const sanitizedEmail = sanitizeInput(email.value)
    const sanitizedPassword = sanitizeInput(password.value)
    
    // attempt registration with firebase auth service
    const user = await firebaseAuthService.registerWithEmail(sanitizedEmail, sanitizedPassword)
    
    if (user) {
      // save user role information to localStorage
      const userData = {
        id: Date.now(),
        username: sanitizedUsername,
        email: sanitizedEmail,
        role: selectedRole.value,
        createdAt: new Date().toISOString()
      }
      
      // get existing users or create new array
      const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
      existingUsers.push(userData)
      localStorage.setItem('users', JSON.stringify(existingUsers))
      
      successMessage.value = `Account created successfully as ${selectedRole.value}!`
      
      // redirect to home page after successful registration
      setTimeout(() => {
        router.push('/')
      }, 1000)
    }
  } catch (error) {
    console.error('Registration error:', error)
    errorMessage.value = 'Registration failed. Please try again.'
  } finally {
    isLoading.value = false
  }
}

/**
 * handle Google OAuth registration process
 * initiates Google sign-up flow through firebase auth
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
      successMessage.value = 'Google registration successful!'
      
      // redirect to home page after successful registration
      setTimeout(() => {
        router.push('/')
      }, 1000)
    }
  } catch (error) {
    console.error('Google registration error:', error)
    errorMessage.value = 'Google registration failed. Please try again.'
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
  name: 'Register',
  setup() {
    return {
      // form data and state
      username,
      email,
      password,
      confirmPassword,
      selectedRole,
      isLoading,
      errorMessage,
      successMessage,
      errors,
      isFormValid,
      
      // validation functions
      validateUsername,
      validateEmail,
      validatePassword,
      validateConfirmPassword,
      
      // authentication functions
      handleRegister,
      loginWithGoogle
    }
  }
}
</script>

<style scoped>
.register {
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

.error-text {
  color: #dc3545;
  font-size: 0.8rem;
  margin-top: 0.25rem;
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

.role-description {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  color: #666;
}

.role-description small {
  font-style: italic;
}
</style>