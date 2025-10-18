<template>
  <div class="tables-page">
    <h1>Interactive Data Tables</h1>
    <p>Browse and interact with user and review data</p>
    
    <!-- Users Table Section -->
    <div class="table-section">
      <div class="table-header">
        <h2>Users Table</h2>
        <div class="export-buttons">
          <button @click="exportUsersCSV" class="export-btn" aria-label="Export users data as CSV file">
            Export CSV
          </button>
          <button @click="exportUsersPDF" class="export-btn" aria-label="Export users data as PDF file">
            Export PDF
          </button>
        </div>
      </div>
      <DataTable
        :columns="userCols"
        :rows="users"
        :page-size="10"
        :row-key-fn="(row) => row.id"
      />
    </div>
    
    <!-- Reviews Table Section -->
    <div class="table-section">
      <div class="table-header">
        <h2>Reviews Table</h2>
        <div class="export-buttons">
          <!-- quick http test: load reviews by resource id -->
          <input 
            type="number" 
            v-model.number="testResourceId" 
            placeholder="Resource ID" 
            aria-label="Resource id to load reviews"
            style="width:140px; padding:0.3rem; border:1px solid #ccc"/>
          <button @click="loadReviews" class="export-btn" aria-label="Load reviews by resource id">
            Load Reviews
          </button>
          <button @click="exportReviewsCSV" class="export-btn" aria-label="Export reviews data as CSV file">
            Export CSV
          </button>
          <button @click="exportReviewsPDF" class="export-btn" aria-label="Export reviews data as PDF file">
            Export PDF
          </button>
        </div>
      </div>
      <DataTable
        :columns="reviewCols"
        :rows="reviews"
        :page-size="10"
        :row-key-fn="(row) => row.id"
      />
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import DataTable from '../components/DataTable.vue'
import tablesData from '../data/tablesData.json'
import { exportService } from '../services/exportService'
import { fetchReviews } from '../services/reviewService'

export default {
  name: 'Tables',
  components: {
    DataTable
  },
  setup() {
    // Users table columns (user dataset)
    const userCols = [
      { key: 'id', label: 'ID' },
      { key: 'username', label: 'Username' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' }
    ]

    /**
     * Users dataset for the Users table.
     * - Prefer locally stored users to reflect app state when present.
     * - Fallback to JSON fixture to guarantee a working demo dataset.
     * - Normalizes role field when missing.
     */
    const storedUsers = localStorage.getItem('users')
    const users = ref(
      storedUsers
        ? JSON.parse(storedUsers).map((u, i) => ({ id: i + 1, username: u.username, email: u.email, role: u.role || 'user' }))
        : tablesData.users
    )

    // Reviews table columns (resource review dataset)
    const reviewCols = [
      { key: 'id', label: 'ID' },
      { key: 'title', label: 'Resource' },
      { key: 'category', label: 'Category' },
      { key: 'rating', label: 'Rating' },
      { key: 'reviewer', label: 'Reviewer' },
    ]
    /**
     * Reviews dataset for the Reviews table.
     * - Loaded from JSON fixture for deterministic content.
     * - Each row uses keys defined by reviewCols.
     */
    const reviews = ref(tablesData.reviews)
    // http test state for loading from cloud function
    const testResourceId = ref(null)

    /**
     * component initialization and setup
     * runs when component is mounted to DOM
     * performs any necessary initial setup or data loading
     */
    /**
     * export users data to CSV format
     * uses export service to generate downloadable CSV file
     * includes all user information for data analysis
     */
    const exportUsersCSV = () => {
      try {
        const success = exportService.exportUsers(users.value) // call export service with user data
        if (success) {
          console.log('Users exported to CSV successfully') // log success message
        } else {
          console.error('Failed to export users to CSV') // log failure message
        }
      } catch (error) {
        console.error('CSV export error:', error) // log any errors
      }
    }
    
    /**
     * export users data to PDF format
     * uses export service to generate downloadable PDF file
     * provides formatted table view for documentation
     */
    const exportUsersPDF = () => {
      try {
        const columns = [
          { key: 'id', label: 'ID' },
          { key: 'username', label: 'Username' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role' }
        ]
        
        const timestamp = new Date().toISOString().split('T')[0]
        const filename = `users_export_${timestamp}.pdf`
        
        const success = exportService.exportToPDF(users.value, columns, filename)
        if (success) {
          console.log('Users exported to PDF successfully')
        } else {
          console.error('Failed to export users to PDF')
        }
      } catch (error) {
        console.error('PDF export error:', error)
      }
    }
    
    /**
     * export reviews data to CSV format
     * uses export service to generate downloadable CSV file
     * includes all review information for analysis
     */
    const exportReviewsCSV = () => {
      try {
        const success = exportService.exportReviews(reviews.value)
        if (success) {
          console.log('Reviews exported to CSV successfully')
        } else {
          console.error('Failed to export reviews to CSV')
        }
      } catch (error) {
        console.error('CSV export error:', error)
      }
    }
    
    /**
     * export reviews data to PDF format
     * uses export service to generate downloadable PDF file
     * provides formatted table view for documentation
     */
    const exportReviewsPDF = () => {
      try {
        const columns = [
          { key: 'id', label: 'ID' },
          { key: 'title', label: 'Title' },
          { key: 'category', label: 'Category' },
          { key: 'rating', label: 'Rating' },
          { key: 'reviewer', label: 'Reviewer' }
        ]
        
        const timestamp = new Date().toISOString().split('T')[0]
        const filename = `reviews_export_${timestamp}.pdf`
        
        const success = exportService.exportToPDF(reviews.value, columns, filename)
        if (success) {
          console.log('Reviews exported to PDF successfully')
        } else {
          console.error('Failed to export reviews to PDF')
        }
      } catch (error) {
        console.error('PDF export error:', error)
      }
    }
    
    // simple loader that calls HTTP function and fills the reviews table
    const loadReviews = async () => {
      try {
        if (testResourceId.value == null || testResourceId.value === '') return
        const data = await fetchReviews(testResourceId.value)
        // map to table rows (keep columns simple)
        reviews.value = data.reviews.map((r, idx) => ({
          id: idx + 1,
          title: `Resource ${r.resourceId}`,
          category: 'N/A', // no category in http payload
          rating: r.rating ?? '-',
          reviewer: r.userId ?? '-'
        }))
      } catch (e) {
        console.error('Load reviews error:', e)
      }
    }

    onMounted(() => {
      console.log('Tables component mounted successfully')
    })

    return {
      userCols,
      users,
      reviewCols,
      reviews,
      testResourceId,
      loadReviews,
      exportUsersCSV,
      exportUsersPDF,
      exportReviewsCSV,
      exportReviewsPDF
    }
  }
}
</script>

<style scoped>
.tables-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.export-buttons {
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

.table-section {
  margin-bottom: 2rem;
}

.table-section h2 {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #007bff;
}
</style>