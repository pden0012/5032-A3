<template>
  <div class="contact-page">
    <div class="container">
      <h1>Contact Us</h1>
      <p>Send us a message and we'll get back to you as soon as possible.</p>
      
      <div class="contact-form">
        <!-- status message display -->
        <div v-if="statusMessage" :class="['status-message', statusMessage.success ? 'success' : 'error']">
          {{ statusMessage.text }}
        </div>
        
        <form @submit.prevent="sendMessage">
          <div class="form-group">
            <label for="name">Name:</label>
            <input 
              type="text" 
              id="name" 
              v-model="contactForm.name" 
              required 
            />
          </div>
          
          <div class="form-group">
            <label for="email">Email:</label>
            <input 
              type="email" 
              id="email" 
              v-model="contactForm.email" 
              required 
            />
          </div>
          
          <div class="form-group">
            <label for="subject">Subject:</label>
            <input 
              type="text" 
              id="subject" 
              v-model="contactForm.subject" 
              required 
            />
          </div>
          
          <div class="form-group">
            <label for="message">Message:</label>
            <textarea 
              id="message" 
              v-model="contactForm.message" 
              rows="5" 
              required
            ></textarea>
          </div>
          
          <div class="file-input">
            <label for="attachment">Attachment (optional):</label>
            <input 
              type="file" 
              id="attachment" 
              ref="fileInput"
              @change="handleFileSelect" 
            />
          </div>
          
          <button type="submit" :disabled="isSending" class="submit-btn">
            {{ isSending ? 'Sending...' : 'Send Message' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { emailService } from '../services/emailService'

export default {
  name: 'Contact',
  setup() {
    const contactForm = ref({
      name: '',
      email: '',
      subject: '',
      message: '',
      attachment: null
    })
    
    const isSending = ref(false)
    const statusMessage = ref(null)
    const fileInput = ref(null)
    
    /**
     * Handle file selection and convert to attachment format.
     * - Reads the selected file and converts it to base64 string.
     * - Stores the attachment data for email sending.
     * - Provides error handling for file processing failures.
     */
    const handleFileSelect = async (event) => {
      const file = event.target.files[0]
      if (file) {
        try {
          contactForm.value.attachment = await emailService.fileToAttachment(file)
        } catch (error) {
          statusMessage.value = { success: false, text: 'Failed to process file' }
        }
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
      isSending.value = true
      statusMessage.value = null
      
      try {
        const emailSubject = `${contactForm.value.subject} - ${contactForm.value.name}`
        const emailText = `Name: ${contactForm.value.name}\nEmail: ${contactForm.value.email}\n\nMessage:\n${contactForm.value.message}`
        const attachments = contactForm.value.attachment ? [contactForm.value.attachment] : []
        
        const result = await emailService.sendEmail(
          'pden0012@student.monash.edu',
          emailSubject,
          emailText,
          attachments
        )
        
        if (result.success) {
          statusMessage.value = { success: true, text: 'Message sent successfully!' }
          contactForm.value = { name: '', email: '', subject: '', message: '', attachment: null }
          if (fileInput.value) {
            fileInput.value.value = ''
          }
        } else {
          statusMessage.value = { success: false, text: 'Failed to send message' }
        }
      } catch (error) {
        statusMessage.value = { success: false, text: 'Error sending message' }
      } finally {
        isSending.value = false
      }
    }

    return {
      contactForm,
      isSending,
      statusMessage,
      fileInput,
      handleFileSelect,
      sendMessage
    }
  }
}
</script>

<style scoped>
.contact-page {
  padding: 1rem;
}

.container {
  max-width: 600px;
  margin: 0 auto;
}

.contact-form {
  background-color: white;
  padding: 1rem;
  border: 1px solid #ddd;
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

.file-input {
  margin-bottom: 1rem;
}

.file-input label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.file-input input[type="file"] {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
}

.submit-btn {
  width: 100%;
  background-color: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-message {
  padding: 0.5rem;
  margin-bottom: 1rem;
  text-align: center;
}

.status-message.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-message.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}
</style>