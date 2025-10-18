<template>
  <div class="chart-container">
    <h3>Review Statistics from Firestore</h3>
    <div v-if="loading" class="loading">Loading review data...</div>
    <div v-else-if="error" class="error">Error loading data: {{ error }}</div>
    <div v-else>
      <canvas ref="chartCanvas"></canvas>
      <div class="chart-stats">
        <div class="stat-item">
          <span class="stat-label">Total Reviews:</span>
          <span class="stat-value">{{ totalReviews }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Average Rating:</span>
          <span class="stat-value">{{ averageRating.toFixed(1) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Unique Users:</span>
          <span class="stat-value">{{ uniqueUsers }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { Chart, registerables } from 'chart.js'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getApp } from 'firebase/app'

// register chart components for bar chart functionality
Chart.register(...registerables)

export default {
  name: 'ReviewStatsChart',
  setup() {
    const chartCanvas = ref(null)
    const loading = ref(true)
    const error = ref(null)
    const totalReviews = ref(0)
    const averageRating = ref(0)
    const uniqueUsers = ref(0)
    let chartInstance = null

    /**
     * fetch review statistics from Firestore using cloud function
     * calls getStats function to retrieve global review statistics
     * handles authentication and error states appropriately
     */
    const fetchReviewStats = async () => {
      try {
        loading.value = true
        error.value = null
        
        // get Firebase functions instance
        const app = getApp()
        const functions = getFunctions(app)
        const getStats = httpsCallable(functions, 'getStats')
        
        // call cloud function to get global stats
        const result = await getStats()
        const stats = result.data
        
        if (stats.scope === 'global') {
          totalReviews.value = stats.reviewsCount || 0
          averageRating.value = stats.averageRating || 0
          uniqueUsers.value = stats.uniqueUsers || 0
        }
        
        loading.value = false
      } catch (err) {
        console.error('Error fetching review stats:', err)
        error.value = err.message || 'Failed to load review statistics'
        loading.value = false
      }
    }

    /**
     * initialize bar chart with review statistics data
     * creates interactive bar chart showing review metrics
     * uses Chart.js for data visualization with Firestore data
     */
    const initChart = () => {
      if (!chartCanvas.value || loading.value || error.value) return

      // destroy existing chart if it exists
      if (chartInstance) {
        chartInstance.destroy()
      }

      // prepare chart data
      const ctx = chartCanvas.value.getContext('2d')
      chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Total Reviews', 'Average Rating', 'Unique Users'],
          datasets: [{
            label: 'Review Statistics',
            data: [
              totalReviews.value,
              averageRating.value,
              uniqueUsers.value
            ],
            backgroundColor: [
              'rgba(54, 162, 235, 0.8)',  // blue for reviews
              'rgba(255, 206, 86, 0.8)',  // yellow for rating
              'rgba(75, 192, 192, 0.8)'   // teal for users
            ],
            borderColor: [
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)'
            ],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            title: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || ''
                  const value = context.parsed.y
                  if (label === 'Average Rating') {
                    return `${label}: ${value.toFixed(1)}/5`
                  }
                  return `${label}: ${value}`
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          }
        }
      })
    }

    /**
     * cleanup chart instance when component unmounts
     * prevents memory leaks and chart conflicts
     */
    const destroyChart = () => {
      if (chartInstance) {
        chartInstance.destroy()
        chartInstance = null
      }
    }

    onMounted(async () => {
      await fetchReviewStats()
      // small delay to ensure DOM is ready
      setTimeout(() => {
        initChart()
      }, 100)
    })

    onUnmounted(() => {
      destroyChart()
    })

    return {
      chartCanvas,
      loading,
      error,
      totalReviews,
      averageRating,
      uniqueUsers
    }
  }
}
</script>

<style scoped>
.chart-container {
  background: white;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.chart-container h3 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.1rem;
}

.loading, .error {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error {
  color: #dc3545;
}

.chart-container canvas {
  max-height: 300px;
  margin-bottom: 1rem;
}

.chart-stats {
  display: flex;
  justify-content: space-around;
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
}
</style>
