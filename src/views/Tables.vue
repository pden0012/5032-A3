<template>
  <div class="tables-page">
    <h1>Interactive Data Tables</h1>
    <p>Browse and interact with user and review data</p>
    
    <!-- Users Table Section -->
    <div class="table-section">
      <h2>Users Table</h2>
      <DataTable
        :columns="userCols"
        :rows="users"
        :page-size="10"
        :row-key-fn="(row) => row.id"
      />
    </div>
    
    <!-- Reviews Table Section -->
    <div class="table-section">
      <h2>Reviews Table</h2>
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

    /**
     * component initialization and setup
     * runs when component is mounted to DOM
     * performs any necessary initial setup or data loading
     */
    onMounted(() => {
      console.log('Tables component mounted successfully')
    })

    return {
      userCols,
      users,
      reviewCols,
      reviews
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

.table-section {
  margin-bottom: 2rem;
}

.table-section h2 {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #007bff;
}
</style>