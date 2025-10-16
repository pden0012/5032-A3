<template>
  <div class="table-wrapper">
    <!-- global search input -->
    <div class="toolbar">
      <input 
        v-model="globalQuery" 
        placeholder="Search all columns..." 
      />
    </div>
    
    <!-- data table with sorting and column search -->
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th 
              v-for="col in columns" 
              :key="col.key"
              :class="{ 'th-sort': true }"
              @click="toggleSort(col.key)"
            >
              {{ col.label }}
              <span v-if="sort.key === col.key">
                {{ sort.dir === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
          </tr>
          <tr>
            <th v-for="col in columns" :key="`search-${col.key}`">
              <input 
                v-model="columnQueries[col.key]" 
                :placeholder="`Search ${col.label.toLowerCase()}...`"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in pagedRows" :key="rowKey(row)">
            <td v-for="col in columns" :key="col.key">
              {{ renderCell(row, col) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- pagination controls -->
    <div class="pagination">
      <button 
        @click="page = Math.max(1, page - 1)" 
        :disabled="page === 1"
      >
        Previous
      </button>
      <span>Page {{ page }} of {{ totalPages }}</span>
      <button 
        @click="page = Math.min(totalPages, page + 1)" 
        :disabled="page === totalPages"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'DataTable',
  props: {
    columns: { type: Array, required: true },
    rows: { type: Array, required: true },
    pageSize: { type: Number, default: 10 },
    rowKeyFn: { type: Function, required: true }
  },
  setup(props) {
    const globalQuery = ref('')
    const columnQueries = ref({})
    const sort = ref({ key: null, dir: 'asc' })
    const page = ref(1)
    
    /**
     * Generate unique row key using provided rowKeyFn function.
     * Uses the rowKeyFn prop to extract unique identifier from each row.
     * Ensures proper Vue reactivity and key-based rendering optimization.
     */
    const rowKey = (row) => props.rowKeyFn(row)
    
    /**
     * Render cell content for display in table cells.
     * Handles different data types and provides consistent formatting.
     * Returns string representation suitable for table display.
     */
    const renderCell = (row, col) => {
      const value = row[col.key]
      return value != null ? String(value) : ''
    }
    
    /**
     * Filter rows based on global search query and column-specific queries.
     * Applies text-based filtering across all columns and individual columns.
     * Returns filtered dataset for further processing and display.
     */
    const filteredRows = computed(() => {
      let filtered = props.rows
      
      // Apply global search filter
      if (globalQuery.value.trim()) {
        const query = globalQuery.value.toLowerCase()
        filtered = filtered.filter(row =>
          props.columns.some(col => {
            const value = renderCell(row, col).toLowerCase()
            return value.includes(query)
          })
        )
      }
      
      // Apply column-specific filters
      props.columns.forEach(col => {
        const query = columnQueries.value[col.key]
        if (query && query.trim()) {
          const searchTerm = query.toLowerCase()
          filtered = filtered.filter(row => {
            const value = renderCell(row, col).toLowerCase()
            return value.includes(searchTerm)
          })
        }
      })
      
      return filtered
    })
    
    /**
     * Sort filtered rows based on current sort configuration.
     * Applies ascending or descending sort order to specified column.
     * Returns sorted dataset maintaining filter results.
     */
    const sortedRows = computed(() => {
      if (!sort.value.key) return filteredRows.value
      
      return [...filteredRows.value].sort((a, b) => {
        const aVal = renderCell(a, { key: sort.value.key })
        const bVal = renderCell(b, { key: sort.value.key })
        
        // Handle numeric values
        const aNum = parseFloat(aVal)
        const bNum = parseFloat(bVal)
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sort.value.dir === 'asc' ? aNum - bNum : bNum - aNum
        }
        
        // Handle string values
        const comparison = aVal.localeCompare(bVal)
        return sort.value.dir === 'asc' ? comparison : -comparison
      })
    })
    
    /**
     * Calculate total number of pages based on filtered and sorted data.
     * Determines pagination range using page size configuration.
     * Returns total page count for navigation controls.
     */
    const totalPages = computed(() => Math.ceil(sortedRows.value.length / props.pageSize))
    
    /**
     * Extract current page data from sorted and filtered results.
     * Implements pagination by slicing data based on current page.
     * Returns subset of data for current page display.
     */
    const pagedRows = computed(() => {
      const start = (page.value - 1) * props.pageSize
      return sortedRows.value.slice(start, start + props.pageSize)
    })
    
    /**
     * Toggle sorting for a specific column key.
     * - First click activates ascending order for that column.
     * - Subsequent clicks alternate between ascending and descending.
     * - Only one active sort key is maintained at a time.
     */
    function toggleSort(key) {
      if (sort.value.key !== key) {
        sort.value.key = key
        sort.value.dir = 'asc'
      } else {
        sort.value.dir = sort.value.dir === 'asc' ? 'desc' : 'asc'
      }
    }

    return {
      globalQuery,
      columnQueries,
      sort,
      page,
      rowKey,
      renderCell,
      filteredRows,
      sortedRows,
      totalPages,
      pagedRows,
      toggleSort
    }
  }
}
</script>

<style scoped>
.table-wrapper {
  display: grid;
  gap: 1rem;
}

.toolbar input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
}

.table-container {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  border: 1px solid #ddd;
  padding: 0.5rem;
  text-align: left;
}

.table th {
  background-color: #f8f9fa;
  font-weight: bold;
}

.th-sort {
  cursor: pointer;
  user-select: none;
}

.table thead input {
  width: 100%;
  padding: 0.25rem;
  border: 1px solid #ccc;
}

.pagination {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: center;
}

.pagination button {
  padding: 0.5rem 1rem;
  border: 1px solid #ccc;
  background-color: white;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>