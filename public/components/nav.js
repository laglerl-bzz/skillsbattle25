document.addEventListener('DOMContentLoaded', function() {
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const loginButton = document.getElementById('loginButton');
    const logoutButton = document.getElementById('logoutButton');
    
    // Toggle mobile navigation
    if (navToggle) {
      navToggle.addEventListener('click', function() {
        navLinks.classList.toggle('show');
      });
    }
    
    // Handle user authentication display
    const username = localStorage.getItem('username');
    
    if (username) {
      usernameDisplay.textContent = username;
      loginButton.style.display = 'none';
      logoutButton.style.display = 'inline-block';
    } else {
      usernameDisplay.textContent = 'Guest';
      loginButton.style.display = 'inline-block';
      logoutButton.style.display = 'none';
    }
    
    // Logout functionality
    if (logoutButton) {
      logoutButton.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('username');
        window.location.href = 'index.html';
      });
    }
    
    // Highlight current page in navigation
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'menu.html') {
      document.getElementById('nav-menu').classList.add('active');
    } else if (currentPage === 'upload.html') {
      document.getElementById('nav-upload').classList.add('active');
    } else if (currentPage === 'play.html') {
      document.getElementById('nav-play').classList.add('active');
    }
  });