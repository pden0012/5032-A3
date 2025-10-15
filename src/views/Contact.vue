<template>
  <div class="contact-page">
    <div class="container">
      <h1>Contact Us</h1>
      <p>Send us a message and we'll get back to you soon.</p>
      
      <div class="contact-form">
        <form @submit.prevent="sendMessage">
          <div class="form-group">
            <label>Your Name</label>
            <input 
              type="text" 
              v-model="contactForm.name" 
              required 
              placeholder="Your name"
            >
          </div>
          
          <div class="form-group">
            <label>Your Email</label>
            <input 
              type="email" 
              v-model="contactForm.email" 
              required 
              placeholder="your@email.com"
            >
          </div>
          
          <div class="form-group">
            <label>Subject</label>
            <input 
              type="text" 
              v-model="contactForm.subject" 
              required 
              placeholder="Message subject"
            >
          </div>
          
          <div class="form-group">
            <label>Message</label>
            <textarea 
              v-model="contactForm.message" 
              rows="5" 
              required 
              placeholder="Your message here..."
            ></textarea>
          </div>
          
          <div class="form-group">
            <label>Attachment (Optional)</label>
            <input 
              type="file" 
              @change="handleFileSelect" 
              ref="fileInput"
              accept=".pdf,.doc,.docx,.txt,.jpg,.png"
            >
          </div>
          
          <button type="submit" :disabled="isSending">
            {{ isSending ? 'Sending...' : 'Send Message' }}
          </button>
        </form>
        
        <div v-if="statusMessage" :class="statusMessage.success ? 'success' : 'error'">
          {{ statusMessage.text }}
        </div>
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
     * Handle file selection for the attachment input.
     * - Accepts a File from the change event and converts it to base64.
     * - Stores the encoded content in form state for optional email attachment.
     * - Validates read errors and reports a concise status message to the user.
     * - Keeps the function side-effect free beyond form state updates.
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
  min-height: 100vh;
  padding: 2rem;
}

.container {
  max-width: 600px;
  margin: 0 auto;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 0.5rem;
}

p {
  text-align: center;
  color: #666;
  margin-bottom: 2rem;
}

.contact-form {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: #333;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #007bff;
}

.form-group textarea {
  resize: vertical;
}

button {
  width: 100%;
  background: #007bff;
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}

button:hover:not(:disabled) {
  background: #0056b3;
}

button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.success {
  background: #d4edda;
  color: #155724;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
  border: 1px solid #c3e6cb;
}

.error {
  background: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
  border: 1px solid #f5c6cb;
}
</style>
