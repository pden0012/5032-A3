<template>
  <div class="register">
    <!-- register form -->
    <h2>Register</h2>
    
    <!-- error message display -->
    <!-- this div shows error messages when registration fails -->
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    
    <!-- success message display -->
    <!-- this div shows success messages when registration is successful -->
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>
    
    <form @submit.prevent="handleRegister">
      <div class="form-group">
        <label>Username:</label>
        <input 
          type="text" 
          v-model="username" 
          @blur="() => validateUsername(true)"
          @input="() => validateUsername(false)"
        >
        <div v-if="errors.username" class="text-danger">{{ errors.username }}</div>
      </div>
      
      <div class="form-group">
        <label>Email:</label>
        <input 
          type="email" 
          v-model="email" 
          @blur="() => validateEmail(true)"
          @input="() => validateEmail(false)"
        >
        <div v-if="errors.email" class="text-danger">{{ errors.email }}</div>
      </div>
      <!-- password -->
      <div class="form-group">
        <label>Password:</label>
        <input 
          type="password" 
          v-model="password" 
          @blur="() => validatePassword(true)"
          @input="() => validatePassword(false)"
        >
        <div v-if="errors.password" class="text-danger">{{ errors.password }}</div>
        
        <!-- password strength indicator -->
        <div v-if="passwordStrength.text" class="password-strength">
          <div class="strength-bar">
            <div 
              class="strength-fill" 
              :class="passwordStrength.color"
              :style="{ width: (passwordStrength.score / 8 * 100) + '%' }"
            ></div>
          </div>
          <span class="strength-text" :class="passwordStrength.color">
            {{ passwordStrength.text }}
          </span>
        </div>
      </div>
      

      <div class="form-group">
        <label>Confirm Password:</label>
        <input 
          type="password" 
          v-model="confirmPassword" 
          @blur="() => validateConfirmPassword(true)"
          @input="() => validateConfirmPassword(false)"
        >
        <div v-if="errors.confirmPassword" class="text-danger">{{ errors.confirmPassword }}</div>
      </div>
      
      <!-- user type selection -->
      <div class="form-group">
        <label>User Type:</label>
        <div class="user-type-options">
          <label class="radio-option">
            <input type="radio" v-model="userType" value="user">
            <span>User</span>
          </label>
          <label class="radio-option">
            <input type="radio" v-model="userType" value="admin">
            <span>Admin</span>
          </label>
        </div>
      </div>
      
      <!-- admin password field (only shown when admin is selected) -->
      <div v-if="userType === 'admin'" class="form-group">
        <label>Admin Password:</label>
        <input 
          type="password" 
          v-model="adminPassword" 
          placeholder="Enter admin password"
          required
        >
        <div class="admin-password-hint">
          <small>Enter the internal admin password to register as administrator</small>
        </div>
      </div>
      
      <button type="submit" :disabled="isLoading">
        {{ isLoading ? 'Registering...' : 'Register' }}
      </button>
    </form>
    
    <!-- External Authentication Section -->
    <!-- Provides alternative registration method using Google OAuth service -->
    <div class="external-auth">
      <p class="divider">Or sign up with</p>
      
      <!-- Google OAuth Authentication Button -->
      <!-- Implements popup-based Google authentication for user registration -->
      <button 
        type="button" 
        @click="loginWithGoogle" 
        class="google-btn"
        :disabled="isLoading"
      >
        <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
          <!-- Google Logo SVG -->
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign up with Google
      </button>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '../services/auth'
import { firebaseAuthService } from '../services/firebaseAuth'
import { sanitizeInput, getSafeErrorMessage } from '../utils/security'

/**
 * Register Component - User registration interface for mental health support application
 * This component provides comprehensive user registration functionality including
 * form validation, password strength assessment, and external authentication options
 * Features include email/password registration and Google OAuth integration
 */
export default {
  name: 'Register',
  setup() {
    const router = useRouter()
    
    // Form input data storage using Vue 3 Composition API reactive references
    // These variables automatically update the UI when values change
    const username = ref('')           // User-selected username for account identification
    const email = ref('')              // Email address for account communication and login
    const password = ref('')           // Primary authentication credential
    const confirmPassword = ref('')    // Password verification to prevent input errors
    const userType = ref('')           // Account role selection: 'user' or 'admin'
    const adminPassword = ref('')      // Administrative access code for admin role assignment
    const isLoading = ref(false)       // Loading state indicator for async operations
    const errorMessage = ref('')       // Error notification display text
    const successMessage = ref('')     // Success notification display text
    
    // Validation error tracking object for form field validation state management
    // Each property corresponds to a form field and stores validation error messages
    const errors = ref({
      username: null,        // Username validation error message or null if valid
      email: null,          // Email format validation error message or null if valid
      password: null,       // Password complexity validation error message or null if valid
      confirmPassword: null // Password confirmation matching error message or null if valid
    })
    
    // Password strength assessment object for real-time password quality feedback
    // Provides visual and textual feedback about password security level
    const passwordStrength = ref({
      score: 0,    // Numerical strength score ranging from 0 to 8
      text: '',    // Descriptive strength level text (e.g., "Weak", "Fair", "Strong")
      color: ''    // Color coding for visual strength indication (red, yellow, green)
    })
    
    /**
     * validateUsername - Performs username validation according to application requirements
     * Validates username length to ensure minimum character requirements are met
     * Implements conditional error display based on user interaction state
     * @param {boolean} blur - Determines error display timing (true for blur event, false for input event)
     * @returns {void} - Function performs validation and updates error state
     */
    const validateUsername = (blur) => {
      // Length validation check - minimum 3 characters required for username
      // Prevents creation of overly short usernames that may cause system issues
      if (username.value.length < 3) {
        // Conditional error display - only show errors on blur to avoid interrupting user input
        // This approach improves user experience by not showing errors during active typing
        if (blur) errors.value.username = "Username must be at least 3 characters."
      } else {
        // Clear validation errors when username meets minimum requirements
        // Resets error state to null when validation passes
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
      // Standard email validation regex pattern
      // Pattern structure: local-part@domain.tld
      // Ensures proper email format with required @ symbol and domain extension
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      
      // Pattern matching test to validate email format compliance
      // Returns true if email matches standard format requirements
      if (!emailRegex.test(email.value)) {
        // Conditional error display implementation
        // Only displays validation errors when user completes input (blur event)
        if (blur) errors.value.email = "Please enter a valid email address"
      } else {
        // Clear validation errors when email format validation passes
        // Resets error state to null when email meets format requirements
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
      
      // Length validation - ensures password falls within acceptable character range
      // Minimum 6 characters prevents weak passwords, maximum 20 prevents excessive length
      if (pwd.length < 6 || pwd.length > 20) {
        errorMessage = "Password must be between 6-20 characters"
      }
      // Uppercase character validation - requires at least one capital letter
      // Enhances password complexity through character case diversity
      else if (!/[A-Z]/.test(pwd)) {
        errorMessage = "Password must contain at least one uppercase letter"
      }
      // Lowercase character validation - requires at least one small letter
      // Ensures mixed case implementation for improved security
      else if (!/[a-z]/.test(pwd)) {
        errorMessage = "Password must contain at least one lowercase letter"
      }
      // Numeric character validation - requires at least one digit
      // Adds numerical complexity to password requirements
      else if (!/\d/.test(pwd)) {
        errorMessage = "Password must contain at least one number"
      }
      // Special character validation - requires at least one special symbol
      // Implements symbol diversity for maximum password security
      else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
        errorMessage = "Password must contain at least one special character (!@#$%^&*)"
      }
      
      // Conditional error display implementation
      // Only shows validation errors when user completes input (blur event)
      if (blur) {
        errors.value.password = errorMessage
      }
      
      // Password strength indicator update
      // Continuously updates strength assessment for real-time user feedback
      updatePasswordStrength()
    }
    
    // this function calculates password strength and updates the indicator
    const updatePasswordStrength = () => {
      const pwd = password.value
      let score = 0
      let text = ''
      let color = ''
      
      if (pwd.length === 0) {
        text = ''
        color = ''
      } else if (pwd.length < 6) {
        text = 'Too short'
        color = 'red'
        score = 1
      } else {
        // length check
        if (pwd.length >= 6) score++
        if (pwd.length >= 8) score++
        if (pwd.length >= 12) score++
        
        // character type checks
        if (/[a-z]/.test(pwd)) score++
        if (/[A-Z]/.test(pwd)) score++
        if (/\d/.test(pwd)) score++
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) score++
        
        // determine strength text and color
        if (score <= 2) {
          text = 'Weak'
          color = 'red'
        } else if (score <= 4) {
          text = 'Fair'
          color = 'orange'
        } else if (score <= 6) {
          text = 'Good'
          color = 'yellow'
        } else {
          text = 'Strong'
          color = 'green'
        }
      }
      
      passwordStrength.value = { score, text, color }
    }
    
    // confirm password validation
    // 确认密码验证
    const validateConfirmPassword = (blur) => {
      // This is confirm password validation
      // 这是确认密码验证
      if (password.value !== confirmPassword.value) {
        if (blur) errors.value.confirmPassword = "Passwords do not match"
      } else {
        errors.value.confirmPassword = null
      }
    }
    
    /**
     * loginWithGoogle - Implements Google OAuth authentication for user registration
     * Provides external authentication option using Google's OAuth service
     * Handles popup-based authentication flow and automatic account creation
     * @returns {Promise<void>} - Asynchronous function that manages Google authentication process
     */
    const loginWithGoogle = async () => {
      // Initialize loading state to indicate authentication process has begun
      isLoading.value = true
      errorMessage.value = ''
      
      try {
        // Execute Google OAuth authentication through Firebase service
        // Opens popup window for user to authenticate with Google account
        const result = await firebaseAuthService.loginWithGoogle()
        
        if (result.success) {
          // Authentication successful - display success notification
          successMessage.value = 'Google registration successful! Welcome to our app!'
          
          // Clear form fields as they are no longer required for external authentication
          username.value = ''
          email.value = ''
          password.value = ''
          confirmPassword.value = ''
          userType.value = ''
          adminPassword.value = ''
          
          // Trigger application-wide authentication state change event
          // Updates navigation components and user state across the application
          window.dispatchEvent(new CustomEvent('authStateChanged'))
          
          // Implement delayed navigation to allow user to read success message
          // Provides visual feedback before redirecting to home page
          setTimeout(() => {
            router.push('/')
          }, 2000)
        } else {
          // Authentication failed - display error message from service
          errorMessage.value = result.message
        }
      } catch (error) {
        // Handle unexpected errors during authentication process
        errorMessage.value = 'Google registration failed, please try again'
        console.error('Google login error:', error) // Error logging for debugging purposes
      } finally {
        // Ensure loading state is reset regardless of authentication outcome
        isLoading.value = false
      }
    }

    /**
     * handleRegister - Primary registration function for email/password account creation
     * Implements comprehensive form validation and user account registration process
     * Handles both standard user and administrative account creation workflows
     * @returns {Promise<void>} - Asynchronous function managing registration process
     */
      /**
       * Handle user registration via Firebase email/password.
       * - Validates all fields; aborts when any validation fails.
       * - Applies a simple admin password check when role is admin.
       * - On success, clears the form, emits auth state change, and redirects.
       * - Ensures loading state resets in a finally block.
       */
      const handleRegister = async () => {
      // Execute comprehensive form validation across all input fields
      // Validates username, email, password, and password confirmation requirements
      validateUsername(true)
      validateEmail(true)
      validatePassword(true)
      validateConfirmPassword(true)
      
      // Validation error check - prevents submission if any field fails validation
      // Returns early if validation errors exist, allowing user to correct issues
      if (errors.value.username || errors.value.email || 
          errors.value.password || errors.value.confirmPassword) {
        errorMessage.value = 'Please fix the form errors before submitting'
        return
      }
      
      // Administrative access validation - requires special password for admin role
      // Implements role-based access control for administrative account creation
      if (userType.value === 'admin' && adminPassword.value !== '1111') {
        errorMessage.value = 'Invalid admin password'
        return
      }
      
      // Initialize registration process - set loading state and clear previous messages
      isLoading.value = true          // Display loading indicator during registration
      errorMessage.value = ''         // Clear previous error messages
      successMessage.value = ''       // Clear previous success messages
      
      try {
        // Execute Firebase authentication registration with email and password
        // Uses Firebase Auth service for secure user account creation
        const result = await firebaseAuthService.registerWithEmail(
          sanitizeInput(email.value),      // Sanitize email input for security
          password.value,                  // Password for authentication
          sanitizeInput(username.value)    // Sanitize username input for security
        )
        
        if (result.success) {
          // Firebase registration successful - display success notification
          successMessage.value = 'Registration successful! Welcome to our mental health support platform!'
          
          // Clear form fields after successful registration
          username.value = ''
          email.value = ''
          password.value = ''
          confirmPassword.value = ''
          userType.value = ''
          adminPassword.value = ''
          
          // Trigger application-wide authentication state change event
          // Updates navigation and user state across the application
          window.dispatchEvent(new CustomEvent('authStateChanged'))
          
          // Implement delayed navigation to allow user to read success message
          setTimeout(() => {
            router.push('/')
          }, 2000)
        } else {
          // Display Firebase authentication error message
          errorMessage.value = result.message
        }
      } catch (error) {
        // Handle unexpected errors during Firebase registration process
        errorMessage.value = 'Registration failed, please try again'
        console.error('Registration error:', error) // Error logging for debugging
      } finally {
        // Ensure loading state is reset regardless of registration outcome
        isLoading.value = false
      }
    }
    
    // Return reactive data and functions for template access
    // Exposes component state and methods to Vue template for rendering
    return {
      // Form data variables
      username,
      email,
      password,
      confirmPassword,
      userType,
      adminPassword,
      errors,
      isLoading,
      errorMessage,
      successMessage,
      
      // Password strength indicator
      passwordStrength,
      
      // Validation functions
      validateUsername,
      validateEmail,
      validatePassword,
      validateConfirmPassword,
      
      // Password strength calculator
      updatePasswordStrength,
      
      // Registration functions
      handleRegister,
      loginWithGoogle  // Google OAuth authentication function
    }
  }
}
</script>

<style scoped>
/* register styles with Bootstrap breakpoints */
.register {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
}

.register h2 {
  text-align: center;
  margin-bottom: 2rem;
  color: #333;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.text-danger {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

button {
  width: 100%;
  background: #27ae60;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;
}

button:hover {
  background: #229954;
}

/* error message styling */
/* 错误信息样式 */
.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  border: 1px solid #f5c6cb;
}

/* success message styling */
/* 成功信息样式 */
.success-message {
  background-color: #d4edda;
  color: #155724;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  border: 1px solid #c3e6cb;
}

/* disabled button styling */
/* 禁用按钮样式 */
button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

/* Bootstrap breakpoints implementation */
/* Extra small devices (portrait phones, less than 576px) */
@media (max-width: 575.98px) {
  .register {
    padding: 1rem;
    max-width: 100%;
    margin: 0 0.5rem;
  }
  
  .register h2 {
    font-size: 1.3rem;
    margin-bottom: 1rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-group input {
    padding: 0.6rem;
    font-size: 0.9rem;
  }
  
  button {
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
  }
}

/* Small devices (landscape phones, 576px and up) */
@media (min-width: 576px) and (max-width: 767.98px) {
  .register {
    padding: 1.5rem;
    max-width: 400px;
  }
  
  .register h2 {
    font-size: 1.4rem;
    margin-bottom: 1.5rem;
  }
  
  .form-group {
    margin-bottom: 1.25rem;
  }
  
  .form-group input {
    padding: 0.7rem;
    font-size: 0.95rem;
  }
  
  button {
    padding: 0.7rem 1.25rem;
    font-size: 0.95rem;
  }
}

/* Medium devices (tablets, 768px and up) */
@media (min-width: 768px) and (max-width: 991.98px) {
  .register {
    padding: 2rem;
    max-width: 400px;
  }
  
  .register h2 {
    font-size: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .form-group input {
    padding: 0.75rem;
    font-size: 1rem;
  }
  
  button {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }
}

/* Large devices (desktops, 992px and up) */
@media (min-width: 992px) and (max-width: 1199.98px) {
  .register {
    padding: 2rem;
    max-width: 400px;
  }
  
  .register h2 {
    font-size: 1.6rem;
    margin-bottom: 2rem;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .form-group input {
    padding: 0.8rem;
    font-size: 1rem;
  }
  
  button {
    padding: 0.8rem 1.5rem;
    font-size: 1rem;
  }
}

/* Extra large devices (large desktops, 1200px and up) */
@media (min-width: 1200px) {
  .register {
    padding: 2.5rem;
    max-width: 450px;
  }
  
  .register h2 {
    font-size: 1.8rem;
    margin-bottom: 2.5rem;
  }
  
  .form-group {
    margin-bottom: 1.75rem;
  }
  
  .form-group input {
    padding: 0.9rem;
    font-size: 1.1rem;
  }
  
  button {
    padding: 0.9rem 1.75rem;
    font-size: 1.1rem;
  }
}

/* user type selection styling */
/* 用户类型选择样式 */
.user-type-options {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.radio-option:hover {
  background-color: #f8f9fa;
}

.radio-option input[type="radio"] {
  margin: 0;
}

.radio-option span {
  font-weight: normal;
}

/* admin password field styling */
/* 管理员密码字段样式 */
.admin-password-hint {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: #fff3cd;
  border-radius: 4px;
  border-left: 3px solid #ffc107;
}

/* password strength indicator styling */
.password-strength {
  margin-top: 0.5rem;
}

.strength-bar {
  width: 100%;
  height: 4px;
  background-color: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.strength-fill.red {
  background-color: #f44336;
}

.strength-fill.orange {
  background-color: #ff9800;
}

.strength-fill.yellow {
  background-color: #ffeb3b;
}

.strength-fill.green {
  background-color: #4caf50;
}

.strength-text {
  font-size: 0.8rem;
  font-weight: bold;
  margin-top: 0.25rem;
  display: block;
}

.strength-text.red {
  color: #f44336;
}

.strength-text.orange {
  color: #ff9800;
}

.strength-text.yellow {
  color: #ff9800;
}

.strength-text.green {
  color: #4caf50;
}

/* External Authentication Styles */
/* CSS styling for Google OAuth authentication button and layout */

.external-auth {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #eee;
}

.divider {
  text-align: center;
  color: #666;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

/* Google Login Button Styling */
.google-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  margin-bottom: 0.5rem;
  border: 1px solid #dadce0;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  font-weight: 500;
  color: #3c4043;
}

.google-btn:hover {
  background: #f8f9fa;
  border-color: #4285f4;
  box-shadow: 0 1px 3px rgba(66, 133, 244, 0.2);
}

.google-btn:disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
  border-color: #e0e0e0;
}

.google-icon {
  flex-shrink: 0;
}

/* Responsive design for mobile devices */
@media (max-width: 575.98px) {
  .external-auth {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
  }
  
  .google-btn {
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
  }
}

</style>
