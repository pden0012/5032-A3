<template>
  <div class="login">
    <!-- login form -->
    <h2>Login</h2>
    
    <!-- error message display -->
    <!-- this div shows error messages when login fails -->
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    
    <!-- success message display -->
    <!-- this div shows success messages when login is successful -->
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>
    
    <form @submit.prevent="handleLogin">
      <div class="form-group">
        <label>Username:</label>
        <input type="text" v-model="username" required>
      </div>
      
      <div class="form-group">
        <label>Password:</label>
        <input type="password" v-model="password" required>
      </div>
      
      <button type="submit" :disabled="isLoading" @click="handleLogin">
        {{ isLoading ? 'Logging in...' : 'Login' }}
      </button>
    </form>
    
    <!-- External Authentication Section -->
    <!-- Provides alternative login method using Google OAuth service -->
    <div class="external-auth">
      <p class="divider">Or login with</p>
      
      <!-- Google OAuth Authentication Button -->
      <!-- Implements popup-based Google authentication for user login -->
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
        Login with Google
      </button>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '../services/auth'
import { firebaseAuthService } from '../services/firebaseAuth'

/**
 * Login Component - User authentication interface for mental health support application
 * Provides comprehensive user login functionality including traditional email/password
 * authentication and external Google OAuth integration through Firebase
 * Features include form validation and secure authentication state management
 */
export default {
  name: 'Login',
  setup() {
    const router = useRouter()
    
    // these ref variables store the form input values and UI state
    const username = ref('')
    const password = ref('')
    const isLoading = ref(false)
    const errorMessage = ref('')
    const successMessage = ref('')
    
    /**
     * loginWithGoogle - Implements Google OAuth authentication for user login
     * Provides external authentication option using Google's OAuth service
     * Handles popup-based authentication flow for existing user login
     * @returns {Promise<void>} - Asynchronous function that manages Google authentication process
     */
      /**
       * Initiate Google OAuth login through Firebase.
       * - Clears UI errors, sets loading state, and attempts popup sign-in.
       * - On success, emits global auth state change and redirects home.
       * - On failure, shows a short error message and logs the error.
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
          successMessage.value = 'Google login successful! Welcome back!'
          
          // Clear form fields as they are no longer required for external authentication
          username.value = ''
          password.value = ''
          
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
        errorMessage.value = 'Google login failed, please try again'
        console.error('Google login error:', error) // Error logging for debugging
      } finally {
        // Ensure loading state is reset regardless of authentication outcome
        isLoading.value = false
      }
    }

    /**
     * handleLogin - Primary login function for email/password authentication
     * Implements comprehensive form validation and user authentication process
     * Handles traditional username/password login workflow
     * @returns {Promise<void>} - Asynchronous function managing login process
     */
    const handleLogin = async () => {
      // basic validation to ensure both fields have values
      if (!username.value || !password.value) {
        errorMessage.value = 'Please fill in username and password'
        return
      }
      
      isLoading.value = true
      errorMessage.value = ''
      successMessage.value = ''
      
      try {
        // calls the authService.login method with user credentials
        const result = await authService.login(username.value, password.value)
        
        if (result.success) {
          successMessage.value = result.message
          // resets the form fields after successful authentication
          username.value = ''
          password.value = ''
          
          console.log('Login successful') // debug log
          
          // waits 1 second to show success message before redirecting
          setTimeout(() => {
            router.push('/')
          }, 1000)
        } else {
          errorMessage.value = result.message
        }
      } catch (error) {
        errorMessage.value = 'Login failed, please try again'
      } finally {
        isLoading.value = false
      }
    }
    
    // Return reactive data and functions for template access
    // Exposes component state and methods to Vue template for rendering
    return {
      // Form data variables
      username,
      password,
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
/* login styles with Bootstrap breakpoints */
.login {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
}

.login h2 {
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

button {
  width: 100%;
  background: #3498db;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;
}

button:hover {
  background: #2980b9;
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
  opacity: 0.6;
  cursor: not-allowed;
}

/* Bootstrap breakpoints implementation */
/* Extra small devices (portrait phones, less than 576px) */
@media (max-width: 575.98px) {
  .login {
    padding: 1rem;
    max-width: 100%;
    margin: 0 0.5rem;
  }
  
  .login h2 {
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
  .login {
    padding: 1.5rem;
    max-width: 400px;
  }
  
  .login h2 {
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
  .login {
    padding: 2rem;
    max-width: 400px;
  }
  
  .login h2 {
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
  .login {
    padding: 2rem;
    max-width: 400px;
  }
  
  .login h2 {
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
  .login {
    padding: 2.5rem;
    max-width: 450px;
  }
  
  .login h2 {
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
