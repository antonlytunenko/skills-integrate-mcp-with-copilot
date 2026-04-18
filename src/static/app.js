let currentToken = null;
let currentUsername = null;

// Modal functions
function openLoginModal() {
  document.getElementById("login-modal").classList.remove("hidden");
}

function closeLoginModal() {
  document.getElementById("login-modal").classList.add("hidden");
  document.getElementById("login-form").reset();
}

// Update user interface based on login status
function updateUIForLoginStatus() {
  const signupContainer = document.getElementById("signup-container");
  const userIcon = document.getElementById("user-icon");
  const logoutBtn = document.getElementById("logout-btn");
  const loginForm = document.getElementById("login-form");
  
  if (currentToken) {
    // User is logged in
    userIcon.textContent = "👨‍🏫";
    userIcon.title = `Logged in as ${currentUsername}`;
    signupContainer.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    loginForm.classList.add("hidden");
  } else {
    // User is not logged in
    userIcon.textContent = "👤";
    userIcon.title = "Login";
    signupContainer.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    loginForm.classList.remove("hidden");
  }
}

// Handle login
async function handleLogin(event) {
  event.preventDefault();
  
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const loginMessage = document.getElementById("login-message");
  
  try {
    const response = await fetch(
      `/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      {
        method: "POST",
      }
    );
    
    const result = await response.json();
    
    if (response.ok) {
      currentToken = result.token;
      currentUsername = result.username;
      loginMessage.textContent = result.message;
      loginMessage.className = "success";
      loginMessage.classList.remove("hidden");
      
      updateUIForLoginStatus();
      closeLoginModal();
      
      // Hide message after 3 seconds
      setTimeout(() => {
        loginMessage.classList.add("hidden");
      }, 3000);
    } else {
      loginMessage.textContent = result.detail || "Login failed";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
    }
  } catch (error) {
    loginMessage.textContent = "Failed to login. Please try again.";
    loginMessage.className = "error";
    loginMessage.classList.remove("hidden");
    console.error("Error logging in:", error);
  }
}

// Handle logout
async function logout() {
  try {
    const response = await fetch(
      `/logout?token=${encodeURIComponent(currentToken)}`,
      {
        method: "POST",
      }
    );
    
    if (response.ok) {
      currentToken = null;
      currentUsername = null;
      updateUIForLoginStatus();
      closeLoginModal();
    }
  } catch (error) {
    console.error("Error logging out:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginForm = document.getElementById("login-form");

  // Attach login form handler
  loginForm.addEventListener("submit", handleLogin);

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML - only show delete buttons if logged in as teacher
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) => {
                      const deleteButton = currentToken 
                        ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                        : '';
                      return `<li><span class="participant-email">${email}</span>${deleteButton}</li>`;
                    }
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    event.preventDefault();
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!currentToken) {
      messageDiv.textContent = "You must be logged in as a teacher to unregister students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}&token=${encodeURIComponent(currentToken)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentToken) {
      messageDiv.textContent = "You must be logged in as a teacher to register students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}&token=${encodeURIComponent(currentToken)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to register student. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error registering:", error);
    }
  });

  // Close modal when clicking outside of it
  window.addEventListener("click", (event) => {
    const modal = document.getElementById("login-modal");
    if (event.target === modal) {
      closeLoginModal();
    }
  });

  // Initialize app
  updateUIForLoginStatus();
  fetchActivities();
});
