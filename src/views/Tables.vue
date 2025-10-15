<template>
  <!--
    Tables View
    - Satisfies BR (D.3) by rendering two interactive tables (Users, Reviews)
    - DataTable provides: sort, global search, per-column search, pagination (10/pg)
  -->
  <div style="display:grid; gap:2rem;">
    <section>
      <!-- Users table section -->
      <h2>Users</h2>
      <DataTable
        :columns="userCols"
        :rows="users"
        :pageSize="10"
        :rowKeyFn="(r)=>r.id"
      />
    </section>

    <section>
      <!-- Reviews table section -->
      <h2>Reviews</h2>
      <DataTable
        :columns="reviewCols"
        :rows="reviews"
        :pageSize="10"
        :rowKeyFn="(r)=>r.id"
      />
    </section>
  </div>
</template>

<script setup>
// Uses a JSON fixture so the feature works without external services.
// Can be swapped to an API later while keeping the same column keys.
import { ref } from 'vue'
import DataTable from '../components/DataTable.vue'
import tablesData from '../data/tablesData.json'

// Users table columns (keys must match dataset fields)
const userCols = [
  { key: 'id', label: 'ID' },
  { key: 'username', label: 'Username' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
]
// Prefer local users if present; otherwise fallback to JSON
const storedUsers = typeof window !== 'undefined' ? localStorage.getItem('users') : null
/**
 * Source users data for the Users table.
 * - Prefer locally stored users to reflect app state when present.
 * - Fallback to JSON fixture to guarantee a working demo dataset.
 * - Normalizes role field when missing.
 */
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
</script>
