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
        // check admin status - prioritize Firebase user
        // 检查管理员状态 - 优先检查Firebase用户
        let isAdmin = false
        
        if (firebaseUser) {
          // Firebase user admin check (email contains 'admin')
          // Firebase用户管理员检查（邮箱包含'admin'）
          isAdmin = firebaseUser.email && 
                   (firebaseUser.email.endsWith('@admin.com') || 
                    firebaseUser.email.includes('admin'))
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
  }
]

// create router instance
const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
