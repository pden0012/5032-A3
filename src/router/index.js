import { createRouter, createWebHistory } from 'vue-router'
// import the views
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import AdminPanel from '../views/AdminPanel.vue'
import Contact from '../views/Contact.vue'
import { authService } from '../services/auth'
import { firebaseAuthService } from '../services/firebaseAuth'
import Tables from '../views/Tables.vue'
import Map from '../views/Map.vue'

// define routes
const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/register',
    name: 'Register',
    component: Register
  },
  {
    path: '/admin',
    name: 'AdminPanel',
    component: AdminPanel,
    // route guard to protect admin page
    // 路由守卫保护管理员页面
    beforeEnter: (to, from, next) => {
      // check if user is authenticated (Firebase or local auth)
      // 检查用户是否已认证（Firebase或本地认证）
      const firebaseUser = firebaseAuthService.getCurrentUser()
      const localUser = authService.getCurrentUser()
      
      // check authentication status
      // 检查认证状态
      const isAuthenticated = firebaseUser || (authService.isLoggedIn() && localUser)
      
      if (isAuthenticated) {
        // check admin status - prioritize role selected at registration time
        // 优先基于注册时选择的角色来判断是否为管理员
        let isAdmin = false

        // helper: resolve role from localStorage users list by email
        const resolveRoleFromStorage = (email) => {
          try {
            const usersRaw = localStorage.getItem('users')
            if (!usersRaw || !email) return 'user'
            const usersList = JSON.parse(usersRaw)
            const matched = usersList.find(u => (u.email || '').toLowerCase() === email.toLowerCase())
            return matched && matched.role ? String(matched.role).toLowerCase() : 'user'
          } catch {
            return 'user'
          }
        }

        if (firebaseUser && firebaseUser.email) {
          const role = resolveRoleFromStorage(firebaseUser.email)
          isAdmin = role === 'admin'
        } else if (localUser) {
          // Local auth user admin check
          // 本地认证用户管理员检查
          isAdmin = authService.isAdmin()
        }
        
        if (isAdmin) {
          next()
        } else {
          // user is authenticated but not admin
          // 用户已认证但不是管理员
          next('/')
        }
      } else {
        // redirect to login if not authenticated
        // 如果未认证，重定向到登录页
        next('/login')
      }
    }
  },
  {
    path: '/contact',
    name: 'Contact',
    component: Contact
  },
  {
    path: '/tables',
    name: 'Tables',
    component: Tables
  },
  {
    path: '/map',
    name: 'Map',
    component: Map
  }
]

// create router instance
const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
