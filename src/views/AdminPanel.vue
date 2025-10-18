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
            <div class="stat-number">{{ totalUsers }}</div>
            <p>Total Users</p>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ adminUsers }}</div>
            <p>Admin Users</p>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ regularUsers }}</div>
            <p>Regular Users</p>
          </div>
        </div>
        
        <!-- Interactive Charts Section -->
        <div class="charts-section">
          <div class="chart-grid">
            <UserStatsChart :user-data="allUsers" />
            <ResourceDistributionChart :resource-data="resources" />
            <ReviewStatsChart />
          </div>
        </div>
      </div>
      
      <!-- User Management Section -->
      <div class="admin-section">
        <h2>User Management</h2>
        
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
      
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { authService } from '../services/auth'
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore'
import UserStatsChart from '../components/UserStatsChart.vue'
import ResourceDistributionChart from '../components/ResourceDistributionChart.vue'
import ReviewStatsChart from '../components/ReviewStatsChart.vue'

export default {
  name: 'AdminPanel',
  components: {
    UserStatsChart,
    ResourceDistributionChart,
    ReviewStatsChart
  },
  setup() {
    const allUsers = ref([])
    const resources = ref([])
    
    /**
     * Load all users from Firestore database.
     * Retrieves user data from Firestore users collection.
     * Falls back to localStorage if Firestore access fails.
     * Updates reactive users list for display in admin interface.
     */
    const loadUsers = async () => {
      try {
        const db = getFirestore()
        
        // Get users from Firestore users collection
        const usersSnapshot = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')))
        const firestoreUsers = []
        
        usersSnapshot.forEach((doc) => {
          const userData = doc.data()
          firestoreUsers.push({
            id: doc.id,
            uid: userData.uid || doc.id,
            email: userData.email || 'Unknown',
            username: userData.username || userData.email?.split('@')[0] || 'Unknown',
            role: userData.role || 'user',
            createdAt: userData.createdAt?.toDate?.() || userData.createdAt || new Date(),
            registeredAt: userData.createdAt?.toDate?.() || userData.createdAt || new Date(),
            lastLoginAt: userData.lastLoginAt?.toDate?.() || userData.lastLoginAt,
            provider: userData.provider || 'unknown',
            emailVerified: userData.emailVerified || false
          })
        })
        
        if (firestoreUsers.length > 0) {
          allUsers.value = firestoreUsers
          console.log(`✅ Loaded ${allUsers.value.length} users from Firestore`)
        } else {
          console.warn('No users found in Firestore, falling back to localStorage')
          loadUsersFromLocalStorage()
        }
        
      } catch (error) {
        console.warn('Firestore access failed, falling back to localStorage:', error.message)
        loadUsersFromLocalStorage()
      }
    }
    
    /**
     * Load users from localStorage as fallback method
     * Handles deduplication and data formatting for admin panel display
     */
    const loadUsersFromLocalStorage = () => {
      try {
        const usersData = localStorage.getItem('users')
        const parsed = usersData ? JSON.parse(usersData) : []
        
        // de-duplicate by email, keep latest createdAt
        const emailToUser = new Map()
        for (const u of parsed) {
          const key = (u.email || '').toLowerCase()
          const existing = emailToUser.get(key)
          if (!existing) {
            emailToUser.set(key, u)
          } else {
            const existingTs = new Date(existing.createdAt || 0).getTime()
            const currentTs = new Date(u.createdAt || 0).getTime()
            if (currentTs >= existingTs) emailToUser.set(key, u)
          }
        }
        
        // Format data for consistency
        const formattedUsers = Array.from(emailToUser.values()).map(user => ({
          id: user.id || user.uid || Date.now().toString(),
          uid: user.uid || user.id || Date.now().toString(),
          email: user.email || 'Unknown',
          username: user.username || user.email?.split('@')[0] || 'Unknown',
          role: user.role || 'user',
          createdAt: user.createdAt || user.created_at,
          registeredAt: user.createdAt || user.created_at || 'Unknown'
        }))
        
        allUsers.value = formattedUsers
        console.log(`📱 Loaded ${allUsers.value.length} users from localStorage (fallback)`)
      } catch (error) {
        console.error('Failed to load users from localStorage:', error)
        allUsers.value = []
      }
    }
    
    
    /**
     * load resource data from localStorage for chart visualization
     * retrieves mental health resources for distribution analysis
     * provides sample data if no resources are stored
     */
    const loadResources = () => {
      try {
        const storedResources = localStorage.getItem('mentalHealthResources')
        if (storedResources) {
          resources.value = JSON.parse(storedResources)
        } else {
          // sample data for demonstration
          resources.value = [
            { id: 1, title: 'Stress Management', category: 'Coping Strategies' },
            { id: 2, title: 'Anxiety Support', category: 'Mental Health' },
            { id: 3, title: 'Depression Resources', category: 'Mental Health' },
            { id: 4, title: 'Mindfulness Meditation', category: 'Wellness' },
            { id: 5, title: 'Crisis Hotlines', category: 'Emergency Support' },
            { id: 6, title: 'Peer Support Groups', category: 'Community' },
            { id: 7, title: 'Professional Counseling', category: 'Treatment' },
            { id: 8, title: 'Self-Care Tips', category: 'Wellness' }
          ]
        }
      } catch (error) {
        console.error('Error loading resources:', error)
        resources.value = []
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
        if (!dateString || dateString === 'Unknown') {
          return 'Unknown'
        }
        
        const date = new Date(dateString)
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
          return 'Unknown'
        }
        
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      } catch (error) {
        return 'Unknown'
      }
    }
    
    
    // computed properties for user statistics
    const totalUsers = computed(() => allUsers.value.length)
    const adminUsers = computed(() => allUsers.value.filter(user => user.role === 'admin').length)
    const regularUsers = computed(() => allUsers.value.filter(user => user.role === 'user').length)
    
    // load data on component mount
    onMounted(async () => {
      await loadUsers()
      loadResources()
    })
    
    return {
      allUsers,
      resources,
      totalUsers,
      adminUsers,
      regularUsers,
      formatDate
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
  margin-bottom: 1rem;
  text-align: center;
}

.admin-header h1 {
  margin-bottom: 0.5rem;
}

.admin-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.admin-section {
  background: white;
  padding: 1rem;
  border: 1px solid #ddd;
}

.admin-section h2 {
  margin-bottom: 1rem;
  border-bottom: 1px solid #ccc;
  padding-bottom: 0.5rem;
}

.user-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat-card {
  text-align: center;
  padding: 0.5rem;
  border: 1px solid #ccc;
  flex: 1;
}

.stat-number {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
  font-weight: bold;
}

.charts-section {
  margin-top: 1rem;
}

.chart-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
  border: 1px solid #ccc;
  text-align: left;
}

.users-table th {
  background-color: #f8f9fa;
  font-weight: bold;
}

.role-badge {
  padding: 0.25rem 0.5rem;
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

@media (max-width: 768px) {
  .user-stats {
    flex-direction: column;
  }
}
</style>