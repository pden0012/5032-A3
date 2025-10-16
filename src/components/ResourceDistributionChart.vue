<template>
  <div class="chart-container">
    <h3>Resource Distribution by Category</h3>
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Chart, registerables } from 'chart.js'

// register chart components for pie chart functionality
Chart.register(...registerables)

export default {
  name: 'ResourceDistributionChart',
  props: {
    resourceData: {
      type: Array,
      default: () => []
    }
  },
  setup(props) {
    const chartCanvas = ref(null)
    let chartInstance = null

    /**
     * calculate resource distribution by category
     * groups resources by category and counts occurrences
     * returns data formatted for pie chart display
     */
    const categoryDistribution = computed(() => {
      const distribution = {}
      props.resourceData.forEach(resource => {
        const category = resource.category || 'Uncategorized'
        distribution[category] = (distribution[category] || 0) + 1
      })
      return distribution
    })

    /**
     * initialize pie chart with resource category data
     * creates colorful pie chart showing resource distribution
     * uses Chart.js for interactive data visualization
     */
    const initChart = () => {
      if (!chartCanvas.value || !props.resourceData.length) return

      // destroy existing chart if it exists
      if (chartInstance) {
        chartInstance.destroy()
      }

      const distribution = categoryDistribution.value
      const labels = Object.keys(distribution)
      const data = Object.values(distribution)

      // generate colors for each category
      const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
      ]

      const ctx = chartCanvas.value.getContext('2d')
      chartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: colors.slice(0, labels.length),
            borderColor: '#fff',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                padding: 20,
                usePointStyle: true
              }
            },
            title: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || ''
                  const value = context.parsed
                  const total = context.dataset.data.reduce((a, b) => a + b, 0)
                  const percentage = ((value / total) * 100).toFixed(1)
                  return `${label}: ${value} (${percentage}%)`
                }
              }
            }
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
      chartCanvas,
      categoryDistribution
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
