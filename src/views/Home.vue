<template>
  <div class="home">
    <h1>Welcome to Youth Mental Health</h1>
    
    <!-- category filter -->
    <div class="category-filter">
      <!-- category button -->
      <button 
        v-for="category in categories" 
        :key="category"
        @click="filterByCategory(category)"
        class="filter-btn"
      >
        {{ category }}
      </button>
    </div>
    <!-- dynamic resource list -->
    <div class="resources-grid">
      <!-- resource card -->
      <div 
        v-for="resource in filteredResources" 
        :key="resource.id"
        class="resource-card"
      >
      <!-- resource title -->
        <h3 class="resource-title">{{ resource.title }}</h3>
        <!-- resource description -->
        <p class="resource-description">{{ resource.description }}</p>
        <span class="resource-category">{{ resource.category }}</span>
        
    <!-- admin-only actions for resource management -->
        <div v-if="authService.isAdmin()" class="admin-actions">
          <button class="admin-btn edit" @click="editResource(resource)">
            Edit
          </button>
          <button class="admin-btn delete" @click="deleteResource(resource)">
            Delete
          </button>
        </div>
      </div>
    </div>
    
    
    
    <!-- admin-only section for adding new resources -->
    <div v-if="authService.isAdmin()" class="admin-section">
      <h2>Admin: Add New Resource</h2>
      <form @submit.prevent="addResource" class="admin-form">
        <div class="form-group">
          <label>Title:</label>
          <input type="text" v-model="newResource.title" required>
        </div>
        <div class="form-group">
          <label>Description:</label>
          <textarea v-model="newResource.description" required></textarea>
        </div>
        <div class="form-group">
          <label>Category:</label>
          <select v-model="newResource.category" required>
            <option value="">Select Category</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </div>
        <button type="submit" class="add-btn">Add Resource</button>
      </form>
    </div>
    
    <!-- unified rating section for all resources -->
    <div class="unified-rating-section">
      <h2>Rate Resources</h2>
      
      <!-- resource selection dropdown -->
      <div class="rating-controls">
        <div class="resource-selector">
          <label for="resourceSelect">Select Resource to Rate:</label>
          <select id="resourceSelect" v-model="selectedResourceForRating" class="resource-dropdown">
            <option value="">Choose a resource...</option>
            <option v-for="resource in resources" :key="resource.id" :value="resource.id">
              {{ resource.title }} ({{ resource.category }})
            </option>
          </select>
        </div>
        
        <!-- rating display for selected resource -->
        <div v-if="selectedResourceForRating" class="selected-resource-rating">
          <div class="resource-info">
            <h3>{{ getSelectedResourceTitle() }}</h3>
            <p>{{ getSelectedResourceDescription() }}</p>
          </div>
          
          <!-- current rating display -->
          <div class="current-rating">
            <div class="rating-display">
              <div class="stars">
                <!-- display full stars -->
                <span 
                  v-for="star in Math.floor(getAverageRating(selectedResourceForRating))" 
                  :key="`avg-full-${star}-${ratingRefreshTrigger}`"
                  class="star filled"
                >
                  ⭐
                </span>
                <!-- display half star if needed -->
                <span 
                  v-if="getAverageRating(selectedResourceForRating) % 1 >= 0.5"
                  :key="`avg-half-${ratingRefreshTrigger}`"
                  class="star half"
                >
                  ⭐
                </span>
              </div>
              <span class="rating-text">
                Average: {{ getAverageRating(selectedResourceForRating).toFixed(1) }} 
                ({{ getRatingCount(selectedResourceForRating) }} ratings)
              </span>
            </div>
            
            <!-- your rating display -->
            <div v-if="authService.isLoggedIn()" class="your-rating">
              <span class="your-rating-label">Your Rating:</span>
              <div class="stars">
                <span 
                  v-for="star in getUserRating(selectedResourceForRating)" 
                  :key="`user-${star}-${ratingRefreshTrigger}`"
                  class="star filled"
                >
                  ⭐
                </span>
              </div>
            </div>
          </div>
          
          <!-- rating input -->
          <div v-if="authService.isLoggedIn()" class="rating-input-section">
            <span class="rate-label">Rate this resource:</span>
            <div class="star-inputs">
              <span 
                v-for="star in 5" 
                :key="star"
                class="star-input"
                :class="{ active: star <= currentRating }"
                @click="setCurrentRating(star)"
              >
                ⭐
              </span>
            </div>
            <button @click="submitRating" class="submit-rating-btn" :disabled="currentRating === 0">
              Submit Rating
            </button>
          </div>
          
          <!-- login prompt for non-logged in users -->
          <div v-else class="login-prompt">
            <p>Please <router-link to="/login">login</router-link> to rate resources</p>
          </div>
        </div>
        
        <!-- prompt when no resource is selected -->
        <div v-else class="no-selection-prompt">
          <p>Select a resource above to view and submit ratings</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import mentalHealthData from '../data/mentalHealthData.json'
import { authService } from '../services/auth'
import { sanitizeInput, validateAndSanitize, getSafeErrorMessage } from '../utils/security'

// home page component with dynamic data and role-based features
export default {
  name: 'Home',
  setup() {
    const resources = ref([])
    const categories = ref([])
    const selectedCategory = ref('All')
    
    // new resource form data for admin
    const newResource = ref({
      title: '',
      description: '',
      category: ''
    })
    
    // rating system data for user feedback
    const ratings = ref({})
    
    // selected resource for rating and current rating input
    const selectedResourceForRating = ref('')
    const currentRating = ref(0)
    
    // force refresh trigger for rating display
    const ratingRefreshTrigger = ref(0)
    
    const loadData = () => {
      resources.value = mentalHealthData.resources
      categories.value = mentalHealthData.categories
    }
    
    // filter by category
    const filterByCategory = (category) => {
      selectedCategory.value = category
    }
    
    // filter by category
    const filteredResources = computed(() => {  
      if (selectedCategory.value === 'All') {
        return resources.value
      }
      // filter by category return the resources that match the selected category
      return resources.value.filter(resource => resource.category === selectedCategory.value)
    })
    
    // admin functions for managing resources with security checks
    // these functions help admins add and edit resources safely
    // includes input validation to prevent malicious content
    const addResource = () => {
      try {
        // clean and validate the input data to make sure it's safe
        // this prevents users from injecting malicious code
        const sanitizedTitle = validateAndSanitize(newResource.value.title)
        const sanitizedDescription = validateAndSanitize(newResource.value.description)
        const sanitizedCategory = sanitizeInput(newResource.value.category)
        
        // check if the cleaned data is still valid after sanitization
        // if sanitization removed everything, the input was probably malicious
        if (!sanitizedTitle) {
          alert('Please provide valid information for all fields')
          return
        }
        
        if (!sanitizedDescription) {
          alert('Please provide valid information for all fields')
          return
        }
        
        if (!sanitizedCategory) {
          alert('Please provide valid information for all fields')
          return
        }
        
        // create a new resource with the cleaned data
        // find the highest ID and add 1 to get the next ID
        let maxId = 0
        for (let i = 0; i < resources.value.length; i++) {
          if (resources.value[i].id > maxId) {
            maxId = resources.value[i].id
          }
        }
        const newId = maxId + 1
        const resource = {
          id: newId,
          title: sanitizedTitle,
          description: sanitizedDescription,
          category: sanitizedCategory
        }
        resources.value.push(resource)
        
        // clear the form after successful addition
        newResource.value = {
          title: '',
          description: '',
          category: ''
        }
        
        alert('Resource added successfully!')
      } catch (error) {
        // log the error for debugging but don't expose sensitive details
        console.error('Error adding resource:', error)
        // show a safe error message that doesn't reveal system information
        alert(getSafeErrorMessage(error))
      }
    }
    
    // function for editing existing resources with security validation
    // allows admins to modify resource titles and descriptions safely
    // includes input sanitization to prevent malicious content
    const editResource = (resource) => {
      try {
        // get new title from user and clean it before saving
        const newTitle = prompt('Edit title:', resource.title)
        if (newTitle) {
          const sanitizedTitle = validateAndSanitize(newTitle)
          if (sanitizedTitle) {
            resource.title = sanitizedTitle
          } else {
            alert('Invalid title provided')
            return
          }
        }
        
        // get new description from user and clean it before saving
        const newDescription = prompt('Edit description:', resource.description)
        if (newDescription) {
          const sanitizedDescription = validateAndSanitize(newDescription)
          if (sanitizedDescription) {
            resource.description = sanitizedDescription
          } else {
            alert('Invalid description provided')
            return
          }
        }
      } catch (error) {
        // log error for debugging but show safe message to user
        console.error('Error editing resource:', error)
        alert(getSafeErrorMessage(error))
      }
    }
    
    const deleteResource = (resource) => {
      if (confirm(`Are you sure you want to delete "${resource.title}"?`)) {
        const index = resources.value.findIndex(r => r.id === resource.id)
        if (index > -1) {
          resources.value.splice(index, 1)
        }
      }
    }
    
    // rating system functions for user feedback
    
    // this function gets rating data for a specific resource from localStorage
    const getRatings = (resourceId) => {
      const stored = localStorage.getItem(`ratings_${resourceId}`)
      return stored ? JSON.parse(stored) : []
    }
    
    // this function calculates the average rating for a resource
    const getAverageRating = (resourceId) => {
      const resourceRatings = getRatings(resourceId)
      if (resourceRatings.length === 0) return 0
      const sum = resourceRatings.reduce((acc, r) => acc + r.rating, 0)
      return sum / resourceRatings.length
    }
    
    // this function gets the total number of ratings for a resource
    const getRatingCount = (resourceId) => {
      return getRatings(resourceId).length
    }
    
    // this function gets the current user's rating for a resource
    const getUserRating = (resourceId) => {
      // force reactivity by accessing the refresh trigger
      ratingRefreshTrigger.value
      
      if (!authService.isLoggedIn()) return 0
      const currentUser = authService.getCurrentUser()
      if (!currentUser) return 0
      
      // convert resourceId to string to match localStorage key
      const resourceIdStr = String(resourceId)
      
      // get fresh data from localStorage
      const stored = localStorage.getItem(`ratings_${resourceIdStr}`)
      const resourceRatings = stored ? JSON.parse(stored) : []
      
      const userRating = resourceRatings.find(r => r.userId === currentUser.id)
      
      
      return userRating ? userRating.rating : 0
    }
    
    // this function handles user rating submission
    // 处理用户评分提交
    const rateResource = (resourceId, rating) => {
      if (!authService.isLoggedIn()) return
      
      const currentUser = authService.getCurrentUser()
      
      // convert resourceId to string to match localStorage key
      const resourceIdStr = String(resourceId)
      
      // get fresh data from localStorage
      const stored = localStorage.getItem(`ratings_${resourceIdStr}`)
      const resourceRatings = stored ? JSON.parse(stored) : []
      
      
      // check if user has already rated this resource
      const existingRatingIndex = resourceRatings.findIndex(r => r.userId === currentUser.id)
      
      const newRating = {
        userId: currentUser.id,
        username: currentUser.username,
        rating: rating,
        createdAt: new Date().toISOString()
      }
      
      if (existingRatingIndex >= 0) {
        // update existing rating
        resourceRatings[existingRatingIndex] = newRating
        console.log('Updated existing rating:', newRating)
      } else {
        // add new rating
        resourceRatings.push(newRating)
        console.log('Added new rating:', newRating)
      }
      
      // save to localStorage for persistence
      localStorage.setItem(`ratings_${resourceIdStr}`, JSON.stringify(resourceRatings))
      
      // update reactive data to trigger re-render
      ratings.value = { ...ratings.value, [resourceIdStr]: resourceRatings }
      
    }
    
    // functions for unified rating system
    
    // this function gets the title of the selected resource
    const getSelectedResourceTitle = () => {
      if (!selectedResourceForRating.value) return ''
      const resource = resources.value.find(r => r.id === selectedResourceForRating.value)
      return resource ? resource.title : ''
    }
    
    // this function gets the description of the selected resource
    const getSelectedResourceDescription = () => {
      if (!selectedResourceForRating.value) return ''
      const resource = resources.value.find(r => r.id === selectedResourceForRating.value)
      return resource ? resource.description : ''
    }
    
    // this function sets the current rating when user clicks stars
    const setCurrentRating = (rating) => {
      currentRating.value = rating
    }
    
    // this function submits the rating for the selected resource
    const submitRating = () => {
      if (!selectedResourceForRating.value || currentRating.value === 0) return
      
      const resourceId = selectedResourceForRating.value
      const rating = currentRating.value
      
      // use the existing rateResource function
      rateResource(resourceId, rating)
      
      // reset current rating input
      currentRating.value = 0
      
      // force reactivity update by triggering a re-render
      ratings.value = { ...ratings.value }
      
      // force Vue to re-evaluate computed properties
      setTimeout(() => {
        ratings.value = { ...ratings.value }
        // trigger refresh for getUserRating function
        ratingRefreshTrigger.value++
      }, 100)
      
      // show success message (optional)
      alert('Rating submitted successfully!')
    }
    
    onMounted(() => {
      loadData()
    })
    
    return {
      resources,
      categories,
      selectedCategory,
      filteredResources,
      filterByCategory,
      authService,
      newResource,
      addResource,
      editResource,
      deleteResource,
      getRatings,
      getAverageRating,
      getRatingCount,
      getUserRating,
      rateResource,
      selectedResourceForRating,
      currentRating,
      ratingRefreshTrigger,
      getSelectedResourceTitle,
      getSelectedResourceDescription,
      setCurrentRating,
      submitRating
    }
  }
}
</script>

<style>
.home {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

.home h1 {
  text-align: center;
  margin-bottom: 2rem;
  color: #333;
}

.category-filter {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.filter-btn {
  background: #ecf0f1;
  color: #333;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.filter-btn:hover {
  background: #bdc3c7;
}

.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.resource-card {
  background: white;
  padding: 1.5rem;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: all 0.3s;
}

.resource-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.resource-title {
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.resource-description {
  color: #666;
  margin-bottom: 1rem;
  line-height: 1.4;
}

.resource-category {
  background: #e3f2fd;
  color: #1976d2;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  display: inline-block;
}

/* responsive design */
/* detecting the screen size */
@media (max-width: 768px) {
  .home {
    padding: 1rem;
  }
  /* responsive design */
  .resources-grid {
    grid-template-columns: 1fr;
  }
  
  .category-filter {
    justify-content: center;
  }
  
  .filter-btn {
    margin-bottom: 0.5rem;
  }
}

/* admin-only features styling */
/* 仅管理员可见功能的样式 */
.admin-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
}

.admin-btn {
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s;
}

.admin-btn.edit {
  background-color: #ffc107;
  color: #000;
}

.admin-btn.edit:hover {
  background-color: #e0a800;
}

.admin-btn.delete {
  background-color: #dc3545;
  color: white;
}

.admin-btn.delete:hover {
  background-color: #c82333;
}



.admin-section {
  margin-top: 3rem;
  padding: 2rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #ffc107;
}

.admin-section h2 {
  color: #333;
  margin-bottom: 1.5rem;
}

.admin-form {
  display: grid;
  gap: 1rem;
  max-width: 500px;
}

.admin-form .form-group {
  display: flex;
  flex-direction: column;
}

.admin-form label {
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #333;
}

.admin-form input,
.admin-form textarea,
.admin-form select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.admin-form textarea {
  min-height: 100px;
  resize: vertical;
}

.add-btn {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
}

.add-btn:hover {
  background-color: #218838;
}

/* unified rating system styling */

.unified-rating-section {
  margin-top: 3rem;
  padding: 2rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #28a745;
}

.unified-rating-section h2 {
  color: #333;
  margin-bottom: 1.5rem;
  text-align: center;
}

.rating-controls {
  max-width: 600px;
  margin: 0 auto;
}

.resource-selector {
  margin-bottom: 2rem;
}

.resource-selector label {
  display: block;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #333;
}

.resource-dropdown {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background-color: white;
}

.selected-resource-rating {
  background-color: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.resource-info {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.resource-info h3 {
  color: #333;
  margin-bottom: 0.5rem;
}

.resource-info p {
  color: #666;
  margin: 0;
}

.current-rating {
  margin-bottom: 1.5rem;
}

.rating-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.stars {
  display: flex;
  gap: 0.1rem;
}

.star {
  font-size: 1.2rem;
  color: #ddd;
  transition: color 0.2s;
}

.star.filled {
  color: #ffc107;
}

.star.half {
  color: #ffc107;
  background: linear-gradient(90deg, #ffc107 50%, #ddd 50%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.rating-text {
  color: #666;
  font-size: 0.9rem;
  font-weight: 500;
}

.your-rating {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.your-rating-label {
  font-size: 0.9rem;
  color: #333;
  font-weight: 500;
}

.rating-input-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.rate-label {
  font-size: 1rem;
  color: #333;
  font-weight: 500;
}

.star-inputs {
  display: flex;
  gap: 0.25rem;
}

.star-input {
  font-size: 2rem;
  color: #ddd;
  cursor: pointer;
  transition: color 0.2s;
}

.star-input:hover,
.star-input.active {
  color: #ffc107;
}

.submit-rating-btn {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
}

.submit-rating-btn:hover:not(:disabled) {
  background-color: #218838;
}

.submit-rating-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.login-prompt {
  text-align: center;
  padding: 1rem;
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
}

.login-prompt p {
  margin: 0;
  color: #856404;
}

.login-prompt a {
  color: #007bff;
  text-decoration: none;
  font-weight: bold;
}

.login-prompt a:hover {
  text-decoration: underline;
}

.no-selection-prompt {
  text-align: center;
  padding: 2rem;
  color: #666;
  font-style: italic;
}

</style>
