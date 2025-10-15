<template>
  <div id="app">
    <!-- main navigation bar here -->
    <nav class="navbar">
      <div class="nav-brand">Youth Mental Health</div>
      <button class="mobile-menu-toggle" @click="toggleMobileMenu" :class="{ active: mobileMenuOpen }">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div class="nav-links" :class="{ active: mobileMenuOpen }">
        <router-link to="/" @click="closeMobileMenu">Home</router-link>
        <router-link to="/tables" @click="closeMobileMenu">Tables</router-link>
        <router-link to="/contact" @click="closeMobileMenu">Contact</router-link>
        
        <!-- show login/register when user is not logged in -->
        <!-- 用户未登录时显示登录/注册链接 -->
        <template v-if="!isAuthenticated">
          <router-link to="/login" @click="closeMobileMenu">Login</router-link>
          <!-- this is for the register page -->
          <router-link to="/register" @click="closeMobileMenu">Register</router-link>
        </template>
        
        <!-- show user info and logout when user is logged in -->
        <!-- 用户已登录时显示用户信息和登出按钮 -->
        <template v-else>
          <span class="user-welcome">Welcome, {{ currentUser.username }}!</span>
          
          <!-- show admin-only navigation items -->
          <!-- 显示仅管理员可见的导航项 -->
          <template v-if="isAdmin">
            <router-link to="/admin" @click="closeMobileMenu" class="admin-link">Admin Panel</router-link>
          </template>
          
          <button @click="handleLogout" class="logout-button">Logout</button>
        </template>
      </div>
    </nav>
    
    <!-- main content area -->
    <main class="main-content">
      <router-view />
    </main>
    
    <!-- footer section at bottom -->
    <footer class="footer">
      <p>&copy; 2025 Youth Mental Health Support</p>
    </footer>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { authService } from './services/auth'
import { firebaseAuthService } from './services/firebaseAuth'

// this is the main app component
// 这是主应用组件
export default {
  name: 'App',
  // setup function for composition API
  // 使用组合式API的setup函数
  setup() {
    // mobile menu state
    // 移动端菜单状态
    const mobileMenuOpen = ref(false)
    
    // function to toggle mobile menu
    // 切换移动端菜单的函数
    const toggleMobileMenu = () => {
      mobileMenuOpen.value = !mobileMenuOpen.value
    }
    
    // function to close mobile menu
    // 关闭移动端菜单的函数
    const closeMobileMenu = () => {
      mobileMenuOpen.value = false
    }
    
    // function to logout user from both services
    // 用户登出函数，同时登出两个服务
    const handleLogout = async () => {
      try {
        // Logout from Firebase first
        const firebaseUser = firebaseAuthService.getCurrentUser()
        if (firebaseUser) {
          await firebaseAuthService.logout()
          console.log('Firebase logout successful')
        } else {
          // Fallback to local auth service
          authService.logout()
          console.log('Local auth logout successful')
        }
        updateAuthState() // update UI state immediately
      } catch (error) {
        console.error('Logout error:', error)
        // Force update state even if logout fails
        updateAuthState()
      }
    }
    
    // reactive auth state that syncs with authService
    // 与authService同步的响应式认证状态
    const currentUser = ref(null)
    const isAuthenticated = ref(false)
    
    // function to update auth state from both authService and firebaseAuthService
    // 从authService和firebaseAuthService更新认证状态的函数
    const updateAuthState = () => {
      console.log('Updating auth state...') // debug log
      
      // Check Firebase authentication first
      const firebaseUser = firebaseAuthService.getCurrentUser()
      if (firebaseUser) {
        currentUser.value = {
          username: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          email: firebaseUser.email,
          id: firebaseUser.uid
        }
        isAuthenticated.value = true
        console.log('Firebase user authenticated:', currentUser.value) // debug log
      } else {
        // Fallback to local auth service
        currentUser.value = authService.getCurrentUser()
        isAuthenticated.value = authService.isLoggedIn()
        console.log('Local auth user:', currentUser.value) // debug log
      }
      
      console.log('Is authenticated:', isAuthenticated.value) // debug log
    }
    
    // computed property to check if current user is admin
    // 计算属性：检查当前用户是否为管理员
    const isAdmin = computed(() => {
      if (!currentUser.value) return false
      
      // Check if Firebase user is admin (you can customize this logic)
      // 检查Firebase用户是否为管理员（可以自定义此逻辑）
      if (currentUser.value.email) {
        // For demo purposes, admin emails end with @admin.com
        // 演示目的：管理员邮箱以@admin.com结尾
        return currentUser.value.email.endsWith('@admin.com') || 
               currentUser.value.email.includes('admin')
      }
      
      // Fallback to local auth service admin check
      // 回退到本地认证服务的管理员检查
      return authService.isAdmin()
    })
    
    // check authentication status when app starts
    // 应用启动时检查认证状态
    onMounted(() => {
      console.log('App mounted, checking auth status...') // debug log
      authService.checkAuthStatus()
      updateAuthState()
      
      // Set up Firebase authentication state listener
      // 设置Firebase认证状态监听器
      firebaseAuthService.onAuthStateChanged((user) => {
        console.log('Firebase auth state changed:', user) // debug log
        updateAuthState()
      })
      
      // listen for auth state changes from login/logout
      // 监听登录/登出时的认证状态变化
      window.addEventListener('authStateChanged', () => {
        console.log('Auth state change event received!') // debug log
        updateAuthState()
      })
    })
    
    return {
      mobileMenuOpen,
      toggleMobileMenu,
      closeMobileMenu,
      currentUser,
      isAuthenticated,
      isAdmin,
      handleLogout,
      authService
    }
  }
}
</script>

<style>
/* basic styling */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  background: #667eea;
  padding: 1rem;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.nav-brand {
  font-size: 1.5rem;
  font-weight: bold;
}

.mobile-menu-toggle {
  display: none;
  flex-direction: column;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
}

.mobile-menu-toggle span {
  width: 25px;
  height: 3px;
  background: white;
  margin: 3px 0;
  transition: 0.3s;
}

.mobile-menu-toggle.active span:nth-child(1) {
  transform: rotate(-45deg) translate(-5px, 6px);
}

.mobile-menu-toggle.active span:nth-child(2) {
  opacity: 0;
}

.mobile-menu-toggle.active span:nth-child(3) {
  transform: rotate(45deg) translate(-5px, -6px);
}

.nav-links {
  display: flex;
  gap: 1rem;
}

.nav-links a {
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.nav-links a:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

/* user welcome message styling */
/* 用户欢迎信息样式 */
.user-welcome {
  color: white;
  padding: 0.5rem 1rem;
  font-weight: bold;
}

/* admin link styling */
/* 管理员链接样式 */
.admin-link {
  color: #ffc107;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.3s;
  font-weight: bold;
}

.admin-link:hover {
  background-color: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

/* logout button styling */
/* 登出按钮样式 */
.logout-button {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.logout-button:hover {
  background-color: #c82333;
}

.main-content {
  flex: 1;
  padding: 2rem;
}

.footer {
  background: #333;
  color: white;
  text-align: center;
  padding: 1rem;
}

/* Responsive design - Tablet devices */
@media (max-width: 768px) {
  .main-content {
    padding: 1rem;
  }
  
  .nav-brand {
    font-size: 1.2rem;
  }
}

/* Responsive design - Mobile devices */
@media (max-width: 480px) {
  .mobile-menu-toggle {
    display: flex;
  }
  
  .nav-links {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #667eea;
    flex-direction: column;
    padding: 1rem;
    transform: translateY(-100%);
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
  }
  
  .nav-links.active {
    transform: translateY(0);
    opacity: 1;
    visibility: visible;
  }
  
  .nav-links a {
    padding: 1rem;
    text-align: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .nav-links a:last-child {
    border-bottom: none;
  }
  
  .main-content {
    padding: 0.5rem;
  }
  
  .nav-brand {
    font-size: 1rem;
  }
}
</style>
