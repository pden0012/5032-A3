<template>
  <div class="admin-panel">
    <div class="admin-header">
      <h1>Admin Panel</h1>
      <p>Manage users, settings, and system configuration</p>
    </div>
    
    <div class="admin-content">
      <!-- User Statistics Section -->
      <div class="admin-section">
        <h2>User Statistics</h2>
        <div class="user-stats">
          <div class="stat-card">
            <h3>{{ totalUsers }}</h3>
            <p>Total Users</p>
          </div>
          <div class="stat-card">
            <h3>{{ adminUsers }}</h3>
            <p>Admin Users</p>
          </div>
          <div class="stat-card">
            <h3>{{ regularUsers }}</h3>
            <p>Regular Users</p>
          </div>
        </div>
      </div>
      
      <!-- User Management Section -->
      <div class="admin-section">
        <h2>User Management</h2>
        <div class="admin-controls">
          <button 
            @click="toggleRegistration" 
            :class="['toggle-btn', registrationEnabled ? 'enabled' : 'disabled']"
          >
            {{ registrationEnabled ? 'Disable' : 'Enable' }} Registration
          </button>
          <button @click="exportUsers" class="export-btn">Export Users</button>
          <button @click="clearAllData" class="danger-btn">Clear All Data</button>
          <button @click="resetToDefaults" class="reset-btn">Reset to Defaults</button>
        </div>
        
        <div class="users-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in allUsers" :key="user.id">
                <td>{{ user.id }}</td>
                <td>{{ user.username }}</td>
                <td>{{ user.email }}</td>
                <td>
                  <span :class="['role-badge', user.role.toLowerCase()]">
                    {{ user.role }}
                  </span>
                </td>
                <td>{{ formatDate(user.registeredAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Email Management Section -->
      <div class="admin-section">
        <h2>Send Email</h2>
        
        <div v-if="emailMessage" :class="['email-status', emailMessage.success ? 'success' : 'error']">
          {{ emailMessage.text }}
        </div>
        
        <form @submit.prevent="sendEmail">
          <div class="form-row">
            <div class="form-group">
              <label for="to">To:</label>
              <input 
                type="email" 
                id="to" 
                v-model="emailForm.to" 
                required 
              />
            </div>
            <div class="form-group">
              <label for="subject">Subject:</label>
              <input 
                type="text" 
                id="subject" 
                v-model="emailForm.subject" 
                required 
              />
            </div>
          </div>
          
          <div class="form-group">
            <label for="text">Message:</label>
            <textarea 
              id="text" 
              v-model="emailForm.text" 
              rows="5" 
              required
            ></textarea>
          </div>
          
          <div class="form-group">
            <label for="attachment">Attachment (optional):</label>
            <input 
              type="file" 
              id="attachment" 
              ref="fileInput"
              @change="handleFileSelect" 
            />
          </div>
          
          <button type="submit" :disabled="isSendingEmail" class="send-btn">
            {{ isSendingEmail ? 'Sending...' : 'Send Email' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { authService } from '../services/auth'
import { emailService } from '../services/emailService'

export default {
  name: 'AdminPanel',
  setup() {
    const allUsers = ref([])
    const registrationEnabled = ref(true)
    
    // Email form data
    const emailForm = ref({
      to: '',
      subject: '',
      text: '',
      attachment: null
    })
    const isSendingEmail = ref(false)
    const emailMessage = ref(null)
    const fileInput = ref(null)
    
    /**
     * Load all users from local storage and populate the users array.
     * Retrieves user data from browser localStorage and parses JSON format.
     * Initializes empty array if no users exist in storage.
     * Updates reactive users list for display in admin interface.
     */
    const loadUsers = () => {
      try {
        const usersData = localStorage.getItem('users')
        if (usersData) {
          allUsers.value = JSON.parse(usersData)
        } else {
          allUsers.value = []
        }
      } catch (error) {
        console.error('Error loading users:', error)
        allUsers.value = []
      }
    }
    
    /**
     * Format date string for display in user-friendly format.
     * Converts timestamp or date string to readable format.
     * Handles different date formats and provides fallback display.
     * Returns formatted date string for table display.
     */
    const formatDate = (dateString) => {
      try {
        return new Date(dateString).toLocaleDateString()
      } catch (error) {
        return 'Unknown'
      }
    }
    
    /**
     * Toggle user registration status between enabled and disabled states.
     * Updates registration setting in localStorage for persistence.
     * Provides visual feedback for current registration status.
     * Controls whether new users can register accounts.
     */
    const toggleRegistration = () => {
      registrationEnabled.value = !registrationEnabled.value
      localStorage.setItem('registrationEnabled', registrationEnabled.value.toString())
    }
    
    /**
     * Export all user data to downloadable JSON file.
     * Creates downloadable file containing complete user database.
     * Generates timestamped filename for easy identification.
     * Triggers browser download with user data export.
     */
    const exportUsers = () => {
      try {
        const dataStr = JSON.stringify(allUsers.value, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `users-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Error exporting users:', error)
      }
    }
    
    /**
     * Clear all user data and reset system to empty state.
     * Removes all users from localStorage and resets user array.
     * Provides destructive action confirmation for data safety.
     * Restores system to initial empty user state.
     */
    const clearAllData = () => {
      if (confirm('Are you sure you want to clear all user data? This action cannot be undone.')) {
        localStorage.removeItem('users')
        allUsers.value = []
        alert('All user data has been cleared.')
      }
    }
    
    /**
     * Reset system to default configuration and sample data.
     * Restores default admin user and system settings.
     * Creates sample user data for testing and demonstration.
     * Reinitializes system with default configuration values.
     */
    const resetToDefaults = () => {
      if (confirm('Are you sure you want to reset to defaults? This will create sample data.')) {
        const defaultUsers = [
          {
            id: 1,
            username: 'admin',
            email: 'admin@example.com',
            role: 'Admin',
            registeredAt: new Date().toISOString()
          },
          {
            id: 2,
            username: 'user1',
            email: 'user1@example.com',
            role: 'User',
            registeredAt: new Date().toISOString()
          }
        ]
        localStorage.setItem('users', JSON.stringify(defaultUsers))
        allUsers.value = defaultUsers
        registrationEnabled.value = true
        localStorage.setItem('registrationEnabled', 'true')
        alert('System has been reset to defaults.')
      }
    }
    
    /**
     * Handle file selection and convert to attachment format.
     * Processes selected file and converts to base64 for email attachment.
     * Stores attachment data for email sending functionality.
     * Provides error handling for file processing failures.
     */
    const handleFileSelect = async (event) => {
      const file = event.target.files[0]
      if (file) {
        try {
          emailForm.value.attachment = await emailService.fileToAttachment(file)
        } catch (error) {
          emailMessage.value = { success: false, text: 'Failed to process file' }
        }
      }
    }
    
    /**
     * Send email through configured email service.
     * Processes email form data and sends via email service.
     * Handles attachment inclusion and success/failure feedback.
     * Clears form on successful sending and shows status message.
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
    
    // Computed properties for statistics
    const totalUsers = computed(() => allUsers.value.length)
    const adminUsers = computed(() => allUsers.value.filter(user => user.role === 'Admin').length)
    const regularUsers = computed(() => allUsers.value.filter(user => user.role === 'User').length)
    
    onMounted(() => {
      loadUsers()
      const regEnabled = localStorage.getItem('registrationEnabled')
      if (regEnabled !== null) {
        registrationEnabled.value = regEnabled === 'true'
      }
    })

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
.admin-panel {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
}

.admin-header {
  text-align: center;
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: #333;
  color: white;
}

.admin-content {
  display: grid;
  gap: 1rem;
}

.admin-section {
  background-color: white;
  padding: 1rem;
  border: 1px solid #ddd;
}

.user-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat-card {
  text-align: center;
  padding: 1rem;
  background-color: #f8f9fa;
  border: 1px solid #ddd;
}

.stat-card h3 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: #007bff;
}

.admin-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.toggle-btn, .export-btn, .danger-btn, .reset-btn {
  padding: 0.5rem 1rem;
  border: none;
  cursor: pointer;
}

.toggle-btn.enabled {
  background-color: #28a745;
  color: white;
}

.toggle-btn.disabled {
  background-color: #dc3545;
  color: white;
}

.export-btn {
  background-color: #17a2b8;
  color: white;
}

.danger-btn {
  background-color: #dc3545;
  color: white;
}

.reset-btn {
  background-color: #ffc107;
  color: #000;
}

.users-table {
  overflow-x: auto;
}

.users-table table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th,
.users-table td {
  padding: 0.5rem;
  border: 1px solid #ddd;
  text-align: left;
}

.users-table th {
  background-color: #f8f9fa;
  font-weight: bold;
}

.role-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.role-badge.admin {
  background-color: #dc3545;
  color: white;
}

.role-badge.user {
  background-color: #28a745;
  color: white;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
}

.send-btn {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.send-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.email-status {
  padding: 0.5rem;
  margin-bottom: 1rem;
  text-align: center;
}

.email-status.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.email-status.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .admin-controls {
    flex-direction: column;
  }
  
  .user-stats {
    grid-template-columns: 1fr;
  }
}
</style>