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
        :aria-pressed="selectedCategory === category"
        :aria-label="`Filter by ${category}`"
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
        <h2 class="resource-title">{{ resource.title }}</h2>
        <!-- resource description -->
        <p class="resource-description">{{ resource.description }}</p>
        <span class="resource-category">{{ resource.category }}</span>
        
    <!-- admin-only actions for resource management -->
        <div v-if="authService.isAdmin()" class="admin-actions">
          <button 
            class="admin-btn edit" 
            @click="editResource(resource)"
            :aria-label="`Edit resource: ${resource.title}`"
          >
            Edit
          </button>
          <button 
            class="admin-btn delete" 
            @click="deleteResource(resource)"
            :aria-label="`Delete resource: ${resource.title}`"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
    
    
    
    <!-- admin-only section for adding new resources -->
    <div v-if="authService.isAdmin()" class="admin-section">
      <div class="admin-header">
        <h2>Admin: Add New Resource</h2>
        <div class="admin-export-buttons">
          <button @click="exportResourcesCSV" class="export-btn" aria-label="Export resources data as CSV file">
            Export Resources (CSV)
          </button>
          <button @click="exportResourcesPDF" class="export-btn" aria-label="Export resources data as PDF file">
            Export Resources (PDF)
          </button>
        </div>
      </div>
      <form @submit.prevent="addResource" class="admin-form">
        <div class="form-group">
          <label for="new-resource-title">Title:</label>
          <input type="text" id="new-resource-title" v-model="newResource.title" required>
        </div>
        <div class="form-group">
          <label for="new-resource-description">Description:</label>
          <textarea id="new-resource-description" v-model="newResource.description" required></textarea>
        </div>
        <div class="form-group">
          <label for="new-resource-category">Category:</label>
          <select id="new-resource-category" v-model="newResource.category" required>
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
          <select id="resourceSelect" v-model.number="selectedResourceForRating" class="resource-dropdown">
            <option value="">Choose a resource...</option>
            <option v-for="resource in resources" :key="resource.id" :value="resource.id">
              {{ resource.title }} ({{ resource.category }})
            </option>
          </select>
        </div>
        
        <!-- rating display for selected resource -->
        <div v-if="selectedResourceForRating" class="selected-resource-rating">
          <div class="resource-info">
            <h2>{{ getSelectedResourceTitle() }}</h2>
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
import { authService as localAuth } from '../services/auth'
import { firebaseAuthService } from '../services/firebaseAuth'
import { exportService } from '../services/exportService'
import { sanitizeInput, validateAndSanitize, getSafeErrorMessage } from '../utils/security'
import reviewService from '../services/reviewService'

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
    const selectedResourceForRating = ref(null)
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
    
    /**
     * export resources data to CSV format
     * uses export service to generate downloadable CSV file
     * includes all mental health resource information
     */
    const exportResourcesCSV = () => {
      try {
        const success = exportService.exportResources(resources.value)
        if (success) {
          console.log('Resources exported to CSV successfully')
        } else {
          console.error('Failed to export resources to CSV')
        }
      } catch (error) {
        console.error('CSV export error:', error)
      }
    }
    
    /**
     * export resources data to PDF format
     * uses export service to generate downloadable PDF file
     * provides formatted table view for documentation
     */
    const exportResourcesPDF = () => {
      try {
        const columns = [
          { key: 'id', label: 'ID' },
          { key: 'title', label: 'Title' },
          { key: 'description', label: 'Description' },
          { key: 'category', label: 'Category' }
        ]
        
        const timestamp = new Date().toISOString().split('T')[0]
        const filename = `resources_export_${timestamp}.pdf`
        
        const success = exportService.exportToPDF(resources.value, columns, filename)
        if (success) {
          console.log('Resources exported to PDF successfully')
        } else {
          console.error('Failed to export resources to PDF')
        }
      } catch (error) {
        console.error('PDF export error:', error)
      }
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
    const submitRating = async () => {
      if (!selectedResourceForRating.value || currentRating.value === 0) return

      const resourceId = Number(selectedResourceForRating.value)
      const rating = Number(currentRating.value)

      try {
        // call cloud function: persists to Firestore and returns aggregate
        const { average, count } = await reviewService.saveReview(resourceId, rating)

        // keep local cache for immediate UI reflection as well
        rateResource(resourceId, rating)

        // reset and refresh
        currentRating.value = 0
        ratings.value = { ...ratings.value }
        setTimeout(() => {
          ratings.value = { ...ratings.value }
          ratingRefreshTrigger.value++
        }, 100)

        alert(`Rating saved. Avg: ${average.toFixed(1)} (${count})`)
      } catch (e) {
        console.error('submitRating failed', e)
        alert(getSafeErrorMessage(e))
      }
    }
    
    onMounted(() => {
      loadData()
    })
    
    // unify auth: prefer Firebase user, fallback to local auth
    const unifiedAuth = {
      isLoggedIn: () => !!firebaseAuthService.getCurrentUser() || localAuth.isLoggedIn(),
      getCurrentUser: () => firebaseAuthService.getCurrentUser() || localAuth.getCurrentUser(),
      isAdmin: () => localAuth.isAdmin(),
    }
    const authService = unifiedAuth

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
      exportResourcesCSV,
      exportResourcesPDF,
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
  padding: 1rem;
}

.category-filter {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.filter-btn {
  background-color: #f8f9fa;
  border: 1px solid #ccc;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.resource-card {
  background-color: white;
  padding: 1rem;
  border: 1px solid #ddd;
}

.resource-title {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.resource-description {
  color: #333;
  margin-bottom: 1rem;
}

.resource-category {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 0.25rem 0.5rem;
  display: inline-block;
}

.admin-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
}

.admin-btn {
  padding: 0.25rem 0.5rem;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
}

.admin-btn.edit {
  background-color: #ffc107;
}

.admin-btn.delete {
  background-color: #dc3545;
  color: white;
}

.admin-section {
  margin-top: 2rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border: 1px solid #ddd;
}

.admin-form {
  display: grid;
  gap: 1rem;
}

.admin-form input,
.admin-form textarea,
.admin-form select {
  padding: 0.5rem;
  border: 1px solid #ccc;
}

.add-btn {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.unified-rating-section {
  margin-top: 2rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border: 1px solid #ddd;
}

.rating-controls {
  max-width: 500px;
  margin: 0 auto;
}

.resource-selector {
  margin-bottom: 1rem;
}

.resource-dropdown {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
}

.selected-resource-rating {
  background-color: white;
  padding: 1rem;
  border: 1px solid #ddd;
}

.resource-info {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
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
  color: #333;
}

.star.filled {
  color: #ffc107;
}

.rating-input-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.star-inputs {
  display: flex;
  gap: 0.25rem;
}

.star-input {
  font-size: 2rem;
  color: #333;
  cursor: pointer;
}

.star-input.active {
  color: #ffc107;
}

.submit-rating-btn {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.submit-rating-btn:disabled {
  background-color: #6c757d;
}

.login-prompt {
  text-align: center;
  padding: 1rem;
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
}

.no-selection-prompt {
  text-align: center;
  padding: 1rem;
  color: #333;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.admin-export-buttons {
  display: flex;
  gap: 0.5rem;
}

.export-btn {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.export-btn:hover {
  background-color: #218838;
}

@media (max-width: 768px) {
  .resources-grid {
    grid-template-columns: 1fr;
  }
}
</style>
