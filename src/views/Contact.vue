<template>
  <!-- Contact page container with responsive layout -->
  <div class="contact-page">
    <div class="container">
      <!-- Page header with title and description -->
      <h1>Contact Us</h1>
      <p>Send us a message and we'll get back to you as soon as possible.</p>
      
      <!-- Main contact form section -->
      <div class="contact-form">
        <!-- Dynamic status message display with accessibility support -->
        <div v-if="statusMessage" :class="['status-message', statusMessage.success ? 'success' : 'error']" role="alert" aria-live="polite">
          {{ statusMessage.text }}
        </div>
        
        <!-- Contact form with prevent default submission and accessibility attributes -->
        <form @submit.prevent="sendMessage" role="form" aria-label="Contact form">
          <!-- Name input field with required validation -->
          <div class="form-group">
            <label for="name">Name:</label>
            <input 
              type="text" 
              id="name" 
              v-model="contactForm.name" 
              required 
            />
          </div>
          
          <!-- Email input field with email validation -->
          <div class="form-group">
            <label for="email">Email:</label>
            <input 
              type="email" 
              id="email" 
              v-model="contactForm.email" 
              required 
            />
          </div>
          
          <!-- Subject input field -->
          <div class="form-group">
            <label for="subject">Subject:</label>
            <input 
              type="text" 
              id="subject" 
              v-model="contactForm.subject" 
              required 
            />
          </div>
          
          <!-- Message textarea with 5 rows -->
          <div class="form-group">
            <label for="message">Message:</label>
            <textarea 
              id="message" 
              v-model="contactForm.message" 
              rows="5" 
              required
            ></textarea>
          </div>
          
          <!-- File attachment section with custom English UI -->
          <div class="file-input">
            <label for="attachment">Attachment (optional):</label>
            <!-- Custom file input implementation to ensure English text display -->
            <div class="custom-file" role="group" aria-label="File upload">
              <!-- Hidden native file input for accessibility -->
              <input 
                type="file" 
                id="attachment" 
                ref="fileInput"
                class="visually-hidden"
                @change="handleFileSelect" 
                aria-label="Choose a file to upload"
              />
              <!-- Custom styled button that triggers file selection -->
              <label for="attachment" class="choose-file-btn">Choose File</label>
              <!-- Display selected file name with live region for screen readers -->
              <span class="file-name" aria-live="polite">{{ selectedFileName }}</span>
            </div>
          </div>
          
          <!-- Submit button with loading state -->
          <button type="submit" :disabled="isSending" class="submit-btn">
            {{ isSending ? 'Sending...' : 'Send Message' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
// Import Vue 3 Composition API reactive references
import { ref } from 'vue'
// Import email service for sending contact messages
import { emailService } from '../services/emailService'

export default {
  name: 'Contact',
  setup() {
    // Reactive form data object containing all form fields
    const contactForm = ref({
      name: '',        // User's full name
      email: '',       // User's email address
      subject: '',     // Message subject line
      message: '',     // Main message content
      attachment: null // Optional file attachment (base64 encoded)
    })
    
    // Loading state to prevent multiple submissions
    const isSending = ref(false)
    // Status message for success/error feedback
    const statusMessage = ref(null)
    // Reference to the hidden file input element
    const fileInput = ref(null)
    // Display name of selected file (English UI)
    const selectedFileName = ref('No file chosen')
    
    /**
     * Handle file selection and convert to attachment format.
     * - Reads the selected file and converts it to base64 string.
     * - Stores the attachment data for email sending.
     * - Provides error handling for file processing failures.
     */
    const handleFileSelect = async (event) => {
      // Get the first selected file from the input
      const file = event.target.files[0]
      if (file) {
        try {
          // Convert file to base64 attachment format using email service
          contactForm.value.attachment = await emailService.fileToAttachment(file)
          // Update UI to show selected file name (ensures English display)
          selectedFileName.value = file.name
        } catch (error) {
          // Show error message if file processing fails
          statusMessage.value = { success: false, text: 'Failed to process file' }
        }
      } else {
        // Reset file name display when no file is selected
        selectedFileName.value = 'No file chosen'
      }
    }
    
    /**
     * Send the contact message via the configured email service.
     * - Builds a simple subject and plain-text body using form fields.
     * - Includes a single optional attachment when provided.
     * - Provides success/failure feedback and clears the form on success.
     * - Guards against empty submissions and shows minimal error text.
     */
    const sendMessage = async () => {
      // Set loading state to prevent multiple submissions
      isSending.value = true
      // Clear any previous status messages
      statusMessage.value = null
      
      try {
        // Build email subject combining form subject and sender name
        const emailSubject = `${contactForm.value.subject} - ${contactForm.value.name}`
        // Build plain text email body with formatted form data
        const emailText = `Name: ${contactForm.value.name}\nEmail: ${contactForm.value.email}\n\nMessage:\n${contactForm.value.message}`
        // Create attachments array (empty if no file selected)
        const attachments = contactForm.value.attachment ? [contactForm.value.attachment] : []
        
        // Send email using email service with configured recipient
        const result = await emailService.sendEmail(
          'pden0012@student.monash.edu', // Fixed recipient email
          emailSubject,
          emailText,
          attachments
        )
        
        if (result.success) {
          // Show success message and reset form
          statusMessage.value = { success: true, text: 'Message sent successfully!' } // display success feedback
          // Clear all form fields
          contactForm.value = { name: '', email: '', subject: '', message: '', attachment: null } // reset form data
          // Reset file input element
          if (fileInput.value) {
            fileInput.value.value = '' // clear file input
          }
          // Reset file name display
          selectedFileName.value = 'No file chosen' // reset file display text
        } else {
          // Show failure message
          statusMessage.value = { success: false, text: 'Failed to send message' } // display error feedback
        }
      } catch (error) {
        // Show generic error message for unexpected errors
        statusMessage.value = { success: false, text: 'Error sending message' } // handle exceptions
      } finally {
        // Always reset loading state
        isSending.value = false // clear loading indicator
      }
    }

    return {
      contactForm,
      isSending,
      statusMessage,
      fileInput,
      handleFileSelect,
      selectedFileName,
      sendMessage
    }
  }
}
</script>

<style scoped>
/* Main contact page container with padding */
.contact-page {
  padding: 1rem;
}

/* Centered container with max width for better readability */
.container {
  max-width: 600px;
  margin: 0 auto;
}

/* Contact form styling with white background and border */
.contact-form {
  background-color: white;
  padding: 1rem;
  border: 1px solid #ddd;
}

/* Form group spacing and layout */
.form-group {
  margin-bottom: 1rem;
}

/* Label styling for form fields */
.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

/* Input and textarea styling */
.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
}

/* File input section spacing */
.file-input {
  margin-bottom: 1rem;
}

/* File input label styling */
.file-input label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

/* Visually hide native file input while keeping it accessible for screen readers */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Custom file input container with flex layout */
.custom-file {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Styled file selection button */
.choose-file-btn {
  background-color: #6c757d;
  color: #fff;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
}

/* Selected file name display */
.file-name {
  color: #333;
}

/* Submit button styling */
.submit-btn {
  width: 100%;
  background-color: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

/* Disabled submit button state */
.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Status message base styling */
.status-message {
  padding: 0.5rem;
  margin-bottom: 1rem;
  text-align: center;
}

/* Success message styling with green colors */
.status-message.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

/* Error message styling with red colors */
.status-message.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}
</style>