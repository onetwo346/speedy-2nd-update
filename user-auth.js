// ---- USER AUTH MODAL ----
function el(id) { return document.getElementById(id); }

function showAlert(msg, type = 'info', targetId = null) {
  const html = `<div class="sd-alert sd-alert-${type}">${msg}</div>`;
  if (targetId) {
    const target = el(targetId);
    if (target) { target.innerHTML = html; return; }
  }
  const toast = document.createElement('div');
  toast.innerHTML = html;
  toast.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9990;min-width:300px;max-width:400px;';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function initUserAuthModal() {
  const modal = el('userAuthModal');
  const openBtn = el('userAuthBtn');
  const closeBtn = el('closeAuthModal');
  const tabs = document.querySelectorAll('.sd-auth-tab');
  const forms = document.querySelectorAll('.sd-auth-form');
  const switches = document.querySelectorAll('.sd-auth-switch');

  if (!modal || !openBtn) return;

  // Open modal
  openBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });

  // Close modal
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      forms.forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(targetTab + 'Form').classList.add('active');
    });
  });

  // Switch links
  switches.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.switch;
      tabs.forEach(t => t.classList.remove('active'));
      forms.forEach(f => f.classList.remove('active'));
      document.querySelector('.sd-auth-tab[data-tab="' + target + '"]').classList.add('active');
      document.getElementById(target + 'Form').classList.add('active');
    });
  });

  // Sign in form
  const signinForm = el('user-signin-form');
  if (signinForm) {
    signinForm.addEventListener('submit', handleUserSignIn);
  }

  // Sign up form
  const signupForm = el('user-signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', handleUserSignUp);
  }
}

async function handleUserSignIn(e) {
  e.preventDefault();
  const email = el('user-email').value.trim();
  const password = el('user-password').value;
  const btn = el('userSigninBtn');

  if (!email || !password) {
    showAlert('Please fill in all fields.', 'danger', 'signin-alert');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="sd-spinner" style="width:16px;height:16px;border-width:3px;"></span> Signing in...';

  if (typeof speedyKvPull === 'function') await speedyKvPull('speedyUsers');

  // Simulate sign in (replace with actual auth)
  setTimeout(() => {
    const users = JSON.parse(localStorage.getItem('speedyUsers') || '[]');
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
      localStorage.setItem('speedyCurrentUser', JSON.stringify(user));
      showAlert('Welcome back, ' + user.name + '!', 'success', 'signin-alert');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1500);
    } else {
      showAlert('Invalid email or password.', 'danger', 'signin-alert');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Sign In';
  }, 1000);
}

async function handleUserSignUp(e) {
  e.preventDefault();
  const name = el('new-user-name').value.trim();
  const email = el('new-user-email').value.trim();
  const phone = el('new-user-phone').value.trim();
  const password = el('new-user-password').value;
  const confirm = el('new-user-confirm').value;
  const btn = el('userSignupBtn');

  if (!name || !email || !phone || !password) {
    showAlert('Please fill in all fields.', 'danger', 'signup-alert');
    return;
  }
  if (password !== confirm) {
    showAlert('Passwords do not match.', 'danger', 'signup-alert');
    return;
  }
  if (password.length < 6) {
    showAlert('Password must be at least 6 characters.', 'danger', 'signup-alert');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="sd-spinner" style="width:16px;height:16px;border-width:3px;"></span> Creating account...';

  if (typeof speedyKvPull === 'function') await speedyKvPull('speedyUsers');

  // Simulate sign up (replace with actual auth)
  setTimeout(() => {
    const users = JSON.parse(localStorage.getItem('speedyUsers') || '[]');
    if (users.find(u => u.email === email)) {
      showAlert('An account with this email already exists.', 'danger', 'signup-alert');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Create Account';
      return;
    }

    const newUser = {
      id: Date.now(),
      name,
      email,
      phone,
      password,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem('speedyUsers', JSON.stringify(users));
    localStorage.setItem('speedyCurrentUser', JSON.stringify(newUser));
    if (typeof speedyKvPush === 'function') speedyKvPush('speedyUsers', users);

    showAlert('Account created successfully! Welcome, ' + name + '!', 'success', 'signup-alert');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Create Account';
  }, 1000);
}

function updateUserAuthButton() {
  const user = JSON.parse(localStorage.getItem('speedyCurrentUser') || 'null');
  const authButtons = document.getElementById('authButtons');
  const dashboardButtons = document.getElementById('dashboardButtons');
  const guestHero = document.getElementById('guestHero');
  const userHero = document.getElementById('userHero');
  const dashboardPreview = document.getElementById('dashboard-preview');
  const heroUserName = document.getElementById('heroUserName');

  if (user) {
    // User is logged in
    if (authButtons) authButtons.style.display = 'none';
    if (dashboardButtons) dashboardButtons.style.display = 'block';
    if (guestHero) guestHero.style.display = 'none';
    if (userHero) userHero.style.display = 'block';
    if (dashboardPreview) dashboardPreview.style.display = 'block';
    if (heroUserName) heroUserName.textContent = user.name.split(' ')[0];

    // Setup dashboard button
    const dashboardBtn = document.getElementById('goToDashboardBtn');
    const heroDashboardBtn = document.getElementById('heroDashboardBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (dashboardBtn) {
      dashboardBtn.onclick = () => window.location.href = 'dashboard.html';
    }
    if (heroDashboardBtn) {
      heroDashboardBtn.onclick = () => window.location.href = 'dashboard.html';
    }
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        if (confirm('Are you sure you want to logout?')) {
          localStorage.removeItem('speedyCurrentUser');
          location.reload();
        }
      };
    }
  } else {
    // User is logged out
    if (authButtons) authButtons.style.display = 'block';
    if (dashboardButtons) dashboardButtons.style.display = 'none';
    if (guestHero) guestHero.style.display = 'block';
    if (userHero) userHero.style.display = 'none';
    if (dashboardPreview) dashboardPreview.style.display = 'none';
  }
}

function closeModal() {
  const modal = el('userAuthModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initUserAuthModal();
  updateUserAuthButton(); // Check auth status on page load
});

// Store data for dashboard preview
window.STORES = [
  { id:'1', name:'Wiafesco',            type:'Cosmetics & Beauty',   icon:'💄', color:'#FF6B9D', rating:4.8, desc:'Premium cosmetics, skincare, soaps and perfumes for all your beauty needs.' },
  { id:'2', name:'Geneviva Lodge',       type:'Hotel & Restaurant',   icon:'🏨', color:'#4ECDC4', rating:4.6, desc:'Comfortable rooms, delicious local cuisine, drinks and catering services.' },
  { id:'3', name:'Maryking Super Market',type:'Grocery & Household',  icon:'🛒', color:'#45B7D1', rating:4.7, desc:'Fresh groceries, household essentials and daily necessities for your home.' },
  { id:'4', name:'Chekin Pizza',         type:'Fast Food & Drinks',   icon:'🍕', color:'#96CEB4', rating:4.5, desc:'Delicious fresh pizzas, burgers, pasta and cold drinks delivered to you.' },
];