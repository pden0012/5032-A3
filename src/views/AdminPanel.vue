<template>
  <div class="admin-panel">
    <!-- admin panel header -->
    <div class="admin-header">
      <h1>Admin Panel</h1>
      <p>Welcome to the administrative dashboard</p>
    </div>
    
    <!-- admin-only content sections -->
    <div class="admin-content">
      <!-- user management section -->
      <div class="admin-section">
        <h2>User Management</h2>
        <div class="user-stats">
          <div class="stat-card">
            <h3>Total Users</h3>
            <span class="stat-number">{{ totalUsers }}</span>
          </div>
          <div class="stat-card">
            <h3>Admin Users</h3>
            <span class="stat-number">{{ adminUsers }}</span>
          </div>
          <div class="stat-card">
            <h3>Regular Users</h3>
            <span class="stat-number">{{ regularUsers }}</span>
          </div>
        </div>
        
        <!-- user list -->
        <div class="user-list">
          <h3>All Users</h3>
          <div class="user-table">
            <div class="table-header">
              <span>ID</span>
              <span>Username</span>
              <span>Email</span>
              <span>Role</span>
              <span>Created</span>
            </div>
            <div 
              v-for="user in allUsers" 
              :key="user.id" 
              class="table-row"
            >
              <span>{{ user.id }}</span>
              <span>{{ user.username }}</span>
              <span>{{ user.email }}</span>
              <span class="role-badge" :class="user.role">
                {{ user.role }}
              </span>
              <span>{{ formatDate(user.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- system settings section -->
      <div class="admin-section">
        <h2>System Settings</h2>
        <div class="settings-grid">
          <div class="setting-card">
            <h3>Application Status</h3>
            <p>System is running normally</p>
            <button class="status-button active">Active</button>
          </div>
          <div class="setting-card">
            <h3>Database Status</h3>
            <p>Local storage is operational</p>
            <button class="status-button active">Connected</button>
          </div>
          <div class="setting-card">
            <h3>User Registration</h3>
            <p>New user registration is enabled</p>
            <button class="toggle-button" @click="toggleRegistration">
              {{ registrationEnabled ? 'Enabled' : 'Disabled' }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- admin actions section -->
      <div class="admin-section">
        <h2>Admin Actions</h2>
        <div class="action-buttons">
          <button class="action-button primary" @click="exportUsers">
            Export User Data
          </button>
          <button class="action-button secondary" @click="clearAllData">
            Clear All Data
          </button>
          <button class="action-button warning" @click="resetToDefaults">
            Reset to Defaults
          </button>
        </div>
      </div>
      
      <!-- Email sending section -->
      <div class="admin-section">
        <h2>Email Management</h2>
        <div class="email-form">
          <h3>Send Email with Attachment</h3>
          <form @submit.prevent="sendEmail">
            <div class="form-group">
              <label>Recipient Email:</label>
              <input 
                type="email" 
                v-model="emailForm.to" 
                required 
                placeholder="recipient@example.com"
              >
            </div>
            
            <div class="form-group">
              <label>Subject:</label>
              <input 
                type="text" 
                v-model="emailForm.subject" 
                required 
                placeholder="Email subject"
              >
            </div>
            
            <div class="form-group">
              <label>Message:</label>
              <textarea 
                v-model="emailForm.text" 
                rows="4" 
                required 
                placeholder="Your message here..."
              ></textarea>
            </div>
            
            <div class="form-group">
              <label>Attachment (Optional):</label>
              <input 
                type="file" 
                @change="handleFileSelect" 
                ref="fileInput"
                accept=".pdf,.doc,.docx,.txt,.jpg,.png"
              >
              <small>Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG</small>
            </div>
            
            <button type="submit" :disabled="isSendingEmail">
              {{ isSendingEmail ? 'Sending...' : 'Send Email' }}
            </button>
          </form>
          
          <!-- Email status message -->
          <div v-if="emailMessage" :class="emailMessage.success ? 'email-success' : 'email-error'">
            {{ emailMessage.text }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { authService } from '../services/auth'
import { emailService } from '../services/emailService'

// admin panel component for role-based access control
export default {
  name: 'AdminPanel',
  setup() {
    // reactive data for admin panel
    const allUsers = ref([])
    const registrationEnabled = ref(true)
    
    // email form data for sending emails
    const emailForm = ref({
      to: '',
      subject: '',
      text: '',
      attachment: null
    })
    const isSendingEmail = ref(false)
    const emailMessage = ref(null)
    const fileInput = ref(null)
    
    // computed properties for user statistics
    const totalUsers = computed(() => allUsers.value.length)
    const adminUsers = computed(() => 
      allUsers.value.filter(user => user.role === 'admin').length
    )
    const regularUsers = computed(() => 
      allUsers.value.filter(user => user.role === 'user').length
    )
    
    // function to load all users from storage
    /**
     * Load users from localStorage for admin overview.
     * - Parses the stored JSON array when present.
     * - Keeps an empty list when no data exists to avoid errors.
     * - Centralizes the deserialization logic used by export/reset helpers.
     */
    const loadUsers = () => {
      const storedUsers = localStorage.getItem('users')
      if (storedUsers) {
        allUsers.value = JSON.parse(storedUsers)
      }
    }
    
    // function to format date for display
    /**
     * Format an ISO date string into a locale date for display.
     * - Avoids external libs; relies on built-in Date + toLocaleDateString.
     * - Returns a short, readable date for table cells and summaries.
     */
    const formatDate = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleDateString()
    }
    
    // function to toggle user registration
    /**
     * Toggle the registration open/closed flag for the UI demo.
     * - Pure UI state; does not persist or affect backend systems.
     */
    const toggleRegistration = () => {
      registrationEnabled.value = !registrationEnabled.value
    }
    
    // function to export user data
    /**
     * Export current users as a JSON file.
     * - Serializes the table data and triggers a client-side download.
     * - Uses Blob + object URL to avoid server roundtrips.
     */
    const exportUsers = () => {
      const dataStr = JSON.stringify(allUsers.value, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'users-export.json'
      link.click()
      URL.revokeObjectURL(url)
    }
    
    // function to clear all user data
    /**
     * Clear all user-related localStorage entries.
     * - Confirms with the operator before destructive action.
     * - Empties users and auth flags to simulate a reset state.
     */
    const clearAllData = () => {
      if (confirm('Are you sure you want to clear all user data? This action cannot be undone.')) {
        localStorage.removeItem('users')
        localStorage.removeItem('currentUser')
        localStorage.removeItem('isAuthenticated')
        allUsers.value = []
        alert('All data has been cleared. Please refresh the page.')
      }
    }
    
    // function to reset to default users
    /**
     * Reset local data to default (empty list) for demonstration.
     * - Clears overrides then reloads from the default source.
     * - Prompts the user to avoid accidental data loss.
     */
    const resetToDefaults = () => {
      if (confirm('Are you sure you want to reset to default users? This will remove all custom users.')) {
        localStorage.removeItem('users')
        localStorage.removeItem('currentUser')
        localStorage.removeItem('isAuthenticated')
        loadUsers()
        alert('Reset to default users. Please refresh the page.')
      }
    }
    
    // load users when component mounts
    onMounted(() => {
      loadUsers()
    })
    
    /**
     * handleFileSelect - Processes file selection for email attachment
     * Converts selected file to attachment format for email sending
     */
    const handleFileSelect = async (event) => {
      const file = event.target.files[0]
      if (file) {
        try {
          emailForm.value.attachment = await emailService.fileToAttachment(file)
          emailMessage.value = { success: true, text: `File "${file.name}" selected for attachment` }
        } catch (error) {
          emailMessage.value = { success: false, text: 'Failed to process file' }
        }
      }
    }
    
    /**
     * sendEmail - Handles email sending process with attachment support
     * Implements comprehensive email sending with error handling and user feedback
     */
    const sendEmail = async () => {
      isSendingEmail.value = true
      emailMessage.value = null
      
      try {
        const attachments = emailForm.value.attachment ? [emailForm.value.attachment] : []
        const result = await emailService.sendEmail(
          emailForm.value.to,
          emailForm.value.subject,
          emailForm.value.text,
          attachments
        )
        
        emailMessage.value = result
        if (result.success) {
          // Clear form after successful sending
          emailForm.value = { to: '', subject: '', text: '', attachment: null }
          if (fileInput.value) {
            fileInput.value.value = ''
          }
        }
      } catch (error) {
        emailMessage.value = { success: false, text: 'Failed to send email' }
      } finally {
        isSendingEmail.value = false
      }
    }

    return {
      allUsers,
      registrationEnabled,
      totalUsers,
      adminUsers,
      regularUsers,
      formatDate,
      toggleRegistration,
      exportUsers,
      clearAllData,
      resetToDefaults,
      // Email functionality
      emailForm,
      isSendingEmail,
      emailMessage,
      fileInput,
      handleFileSelect,
      sendEmail
    }
  }
}
</script>

<style scoped>
/* admin panel styling */
.admin-panel {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.admin-header {
  text-align: center;
  margin-bottom: 3rem;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
}

.admin-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.admin-header p {
  font-size: 1.2rem;
  opacity: 0.9;
}

.admin-content {
  display: grid;
  gap: 2rem;
}

.admin-section {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.admin-section h2 {
  color: #333;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #667eea;
}

/* user statistics styling */
.user-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
  border-left: 4px solid #667eea;
}

.stat-card h3 {
  color: #666;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  text-transform: uppercase;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
}

/* user table styling */
.user-table {
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 60px 1fr 1fr 100px 120px;
  gap: 1rem;
  padding: 1rem;
  background: #667eea;
  color: white;
  font-weight: bold;
}

.table-row {
  display: grid;
  grid-template-columns: 60px 1fr 1fr 100px 120px;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #dee2e6;
  align-items: center;
}

.table-row:last-child {
  border-bottom: none;
}

.role-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
  text-align: center;
}

.role-badge.admin {
  background: #ffc107;
  color: #000;
}

.role-badge.user {
  background: #28a745;
  color: white;
}

/* settings grid styling */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.setting-card {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
}

.setting-card h3 {
  color: #333;
  margin-bottom: 0.5rem;
}

.setting-card p {
  color: #666;
  margin-bottom: 1rem;
}

.status-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}

.status-button.active {
  background: #28a745;
  color: white;
}

.toggle-button {
  padding: 0.5rem 1rem;
  border: 2px solid #667eea;
  background: white;
  color: #667eea;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.toggle-button:hover {
  background: #667eea;
  color: white;
}

/* action buttons styling */
.action-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.action-button.primary {
  background: #007bff;
  color: white;
}

.action-button.primary:hover {
  background: #0056b3;
}

.action-button.secondary {
  background: #6c757d;
  color: white;
}

.action-button.secondary:hover {
  background: #545b62;
}

.action-button.warning {
  background: #ffc107;
  color: #000;
}

.action-button.warning:hover {
  background: #e0a800;
}

/* responsive design */
@media (max-width: 768px) {
  .admin-panel {
    padding: 1rem;
  }
  
  .user-stats {
    grid-template-columns: 1fr;
  }
  
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .action-buttons {
    flex-direction: column;
  }
}

/* Email form styling */
.email-form {
  background: #f8f9fa;
  padding: 2rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.email-form h3 {
  color: #333;
  margin-bottom: 1.5rem;
}

.email-form .form-group {
  margin-bottom: 1.5rem;
}

.email-form label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: #333;
}

.email-form input,
.email-form textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.email-form input:focus,
.email-form textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.2);
}

.email-form button {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;
}

.email-form button:hover:not(:disabled) {
  background: #0056b3;
}

.email-form button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.email-form small {
  display: block;
  margin-top: 0.25rem;
  color: #666;
  font-size: 0.875rem;
}

.email-success {
  background: #d4edda;
  color: #155724;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
  border: 1px solid #c3e6cb;
}

.email-error {
  background: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
  border: 1px solid #f5c6cb;
}

/* Responsive email form */
@media (max-width: 768px) {
  .email-form {
    padding: 1rem;
  }
}
</style>
