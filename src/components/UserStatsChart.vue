<template>
  <div class="chart-container">
    <h3>User Registration Trends</h3>
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { Chart, registerables } from 'chart.js'

// register chart components for line chart functionality
Chart.register(...registerables)

export default {
  name: 'UserStatsChart',
  props: {
    userData: {
      type: Array,
      default: () => []
    }
  },
  setup(props) {
    const chartCanvas = ref(null)
    let chartInstance = null

    /**
     * initialize chart with user registration data
     * creates line chart showing user growth over time
     * uses Chart.js for interactive data visualization
     */
    const initChart = () => {
      if (!chartCanvas.value || !props.userData.length) return

      // destroy existing chart if it exists
      if (chartInstance) {
        chartInstance.destroy()
      }

      // generate sample data for demonstration
      // in real app, this would come from Firestore
      const last7Days = []
      const userCounts = []
      const today = new Date()
      
      // create last 7 days data
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        last7Days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
        
        // simulate user growth (in real app, this would be actual data)
        const baseCount = props.userData.length
        const randomGrowth = Math.floor(Math.random() * 5) + 1
        userCounts.push(baseCount + (6 - i) * randomGrowth)
      }

      const ctx = chartCanvas.value.getContext('2d')
      chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: last7Days,
          datasets: [{
            label: 'New Users',
            data: userCounts,
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
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

    onMounted(() => {
      initChart()
    })

    onUnmounted(() => {
      destroyChart()
    })

    return {
      chartCanvas
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

.chart-container canvas {
  max-height: 300px;
}
</style>
