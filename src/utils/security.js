// security utilities for protecting against web attacks
// this file helps keep the application safe from malicious input

// removes dangerous HTML tags from user input to prevent script attacks
// takes user input and returns clean text without any HTML
// this stops people from injecting malicious code into the application
function sanitizeInput(input) {
  // check if input is valid first
  if (!input) {
    return ''
  }
  
  if (typeof input !== 'string') {
    return ''
  }
  
  // remove all HTML tags like <script> or <img>
  let clean = input.replace(/<[^>]*>/g, '')
  
  // remove characters that could be used for script injection
  clean = clean.replace(/[<>'"]/g, '')
  
  // remove javascript: protocol to prevent script execution
  clean = clean.replace(/javascript:/gi, '')
  
  // trim whitespace and return
  return clean.trim()
}

// converts dangerous characters to safe HTML entities
// this prevents XSS attacks when displaying user content
// takes text and makes it safe to show on the webpage
function escapeHtml(text) {
  // check if text is valid first
  if (!text) {
    return ''
  }
  
  if (typeof text !== 'string') {
    return ''
  }
  
  // create a div element to help escape the text
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// combines sanitization and escaping for maximum security
// this function does both cleaning and escaping to be extra safe
// takes user input and returns completely safe text for display
function validateAndSanitize(input) {
  // check if input is valid first
  if (!input) {
    return ''
  }
  
  if (typeof input !== 'string') {
    return ''
  }
  
  // first clean the input by removing HTML tags
  let clean = sanitizeInput(input)
  
  // then escape any remaining dangerous characters
  clean = escapeHtml(clean)
  
  return clean
}

// checks if input contains potentially dangerous content
// returns true if the input looks safe, false if it might be dangerous
// this helps identify malicious input before processing
function isInputSafe(input) {
  // check if input is valid first
  if (!input) {
    return true
  }
  
  if (typeof input !== 'string') {
    return true
  }
  
  // check for script tags that could execute malicious code
  if (/<script/i.test(input)) {
    return false
  }
  
  // check for javascript protocol that could run scripts
  if (/javascript:/i.test(input)) {
    return false
  }
  
  // check for event handlers like onclick or onload
  if (/on\w+\s*=/i.test(input)) {
    return false
  }
  
  return true
}

// provides safe error messages without exposing sensitive information
// returns generic error messages that don't reveal system details
// this prevents attackers from learning about the system structure
function getSafeErrorMessage(error) {
  // check if error exists and has a message
  if (error && error.message) {
    // check for username or email related errors
    if (error.message.includes('username') || error.message.includes('email')) {
      return 'Invalid user information provided'
    }
    
    // check for password related errors
    if (error.message.includes('password')) {
      return 'Password does not meet requirements'
    }
    
    // return generic error message
    return 'An error occurred. Please try again。。。。。.'
  }
  
  return 'An unexpected error occurred...........   '
}

// export all the functions so other files can use them
export { sanitizeInput, escapeHtml, validateAndSanitize, isInputSafe, getSafeErrorMessage }