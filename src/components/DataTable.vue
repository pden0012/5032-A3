<template>
  <!-- Interactive table: global search, per-column search, sort, pagination -->
  <div class="table-wrapper">
    <!-- Global search input -->
    <div class="toolbar">
      <input v-model="globalQuery" placeholder="Search all columns..." />
    </div>

    <table class="table">
      <thead>
        <tr>
          <!-- Clickable headers toggle asc/desc sort -->
          <th
            v-for="col in columns"
            :key="col.key"
            @click="toggleSort(col.key)"
            class="th-sort"
          >
            {{ col.label }}
            <span v-if="sort.key === col.key">
              {{ sort.dir === 'asc' ? '▲' : '▼' }}
            </span>
          </th>
        </tr>
        <tr>
          <!-- Per-column search inputs -->
          <th v-for="col in columns" :key="col.key">
            <input
              v-model="columnQueries[col.key]"
              :placeholder="`Search ${col.label}`"
            />
          </th>
        </tr>
      </thead>

      <tbody>
        <!-- Page-sliced rows -->
        <tr v-for="row in pagedRows" :key="rowKey(row)">
          <td v-for="col in columns" :key="col.key">
            {{ renderCell(row[col.key]) }}
          </td>
        </tr>
        <tr v-if="pagedRows.length === 0">
          <td :colspan="columns.length" style="text-align:center;">No data</td>
        </tr>
      </tbody>
    </table>

    <!-- Simple pager: 10 rows per page by default -->
    <div class="pagination">
      <button :disabled="page===1" @click="page--">Prev</button>
      <span>Page {{ page }} / {{ totalPages }}</span>
      <button :disabled="page===totalPages || totalPages===0" @click="page++">Next</button>
    </div>
  </div>
  <!-- End interactive table -->
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'

// Public props (columns/rows/pageSize/rowKeyFn)
const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  pageSize: { type: Number, default: 10 },
  rowKeyFn: { type: Function, default: null }
})

const globalQuery = ref('')
const columnQueries = reactive({})
props.columns.forEach(c => (columnQueries[c.key] = ''))

const sort = reactive({ key: null, dir: 'asc' })
const page = ref(1)

watch([() => props.rows, globalQuery, () => JSON.stringify(columnQueries)], () => {
  page.value = 1
})

/**
 * Derive a unique key for each table row.
 * - Uses caller-provided rowKeyFn when available for stability.
 * - Falls back to JSON stringification which is safe for demo data.
 * - Stable keys help Vue efficiently update DOM on sort/search/page.
 */
const rowKey = (row) => (props.rowKeyFn ? props.rowKeyFn(row) : JSON.stringify(row))

/**
 * Render a cell value to a human-readable string.
 * - Normalizes null/undefined to empty string to avoid "undefined" text.
 * - Keeps formatting minimal; caller can extend via scoped slots if needed.
 * - This function centralizes future formatting rules (e.g., dates/numbers).
 */
const renderCell = (val) => {
  if (val == null) return ''
  return String(val)
}

/**
 * Apply global and per-column filters.
 * - Global query scans across all columns of each row.
 * - Column queries narrow down by individual field, supporting precise search.
 * - Returns a filtered array, leaving the original dataset untouched.
 */
const filteredRows = computed(() => {
  const g = globalQuery.value.trim().toLowerCase()
  return props.rows.filter(row => {
    for (const col of props.columns) {
      const q = (columnQueries[col.key] || '').trim().toLowerCase()
      if (q && !String(row[col.key] ?? '').toLowerCase().includes(q)) return false
    }
    if (g) {
      const hit = props.columns.some(col => String(row[col.key] ?? '').toLowerCase().includes(g))
      if (!hit) return false
    }
    return true
  })
})

/**
 * Sort the filtered rows.
 * - Sort key and direction are controlled by header clicks.
 * - Handles null values and both numeric and string comparisons.
 * - Produces a new array to preserve referential integrity.
 */
const sortedRows = computed(() => {
  if (!sort.key) return filteredRows.value
  const arr = [...filteredRows.value]
  const k = sort.key
  const dir = sort.dir === 'asc' ? 1 : -1
  arr.sort((a, b) => {
    const av = a[k]
    const bv = b[k]
    if (av == null && bv == null) return 0
    if (av == null) return -1 * dir
    if (bv == null) return 1 * dir
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av).localeCompare(String(bv)) * dir
  })
  return arr
})

/**
 * Compute pagination state.
 * - totalPages: ceil of rows / pageSize.
 * - pagedRows: slice of sorted rows for the active page.
 * - Page resets to 1 whenever filters change (watcher above).
 */
const totalPages = computed(() => Math.ceil(sortedRows.value.length / props.pageSize))
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
  if (sort.key !== key) {
    sort.key = key
    sort.dir = 'asc'
  } else {
    sort.dir = sort.dir === 'asc' ? 'desc' : 'asc'
  }
}
</script>

<style scoped>
.table-wrapper { display: grid; gap: 0.75rem; }
.toolbar input { width: 100%; padding: 0.5rem; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { border: 1px solid #e5e7eb; padding: 0.5rem; }
.th-sort { cursor: pointer; user-select: none; }
.table thead input { width: 100%; padding: 0.35rem; }
.pagination { display: flex; gap: 0.5rem; align-items: center; }
</style>
