// API Configuration
const API_BASE_URL = "https://trentbank.onrender.com/api"; // Replace with your API URL
const API_TOKEN = localStorage.getItem("admin_token"); // Get from login

// API Helper Functions
const api = {
  async get(endpoint) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      showAlert("Failed to fetch data", "error");
      return null;
    }
  },

  async post(endpoint, data) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      showAlert("Operation failed", "error");
      return null;
    }
  },

  async put(endpoint, data) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      showAlert("Update failed", "error");
      return null;
    }
  },
};

// Load Dashboard Data
async function loadDashboard() {
  // Load stats
  const stats = await api.get("/stats");
  if (stats) {
    document.getElementById("total-users").textContent =
      stats.totalUsers?.toLocaleString() || "0";
    document.getElementById("total-transactions").textContent =
      stats.totalTransactions?.toLocaleString() || "0";
    document.getElementById("total-revenue").textContent = `$${
      stats.totalRevenue?.toLocaleString() || "0"
    }`;
    document.getElementById("pending-reviews").textContent =
      stats.pendingReviews || "0";
  }

  // Load admin info
  const adminInfo = await api.get("/profile");
  if (adminInfo) {
    document.getElementById(
      "admin-name"
    ).textContent = `Welcome, ${adminInfo.name}`;
  }

  // Load recent data
  await loadRecentTransactions();
  await loadRecentUsers();
}

// Load Recent Transactions
async function loadRecentTransactions() {
  const container = document.getElementById("transactions-container");
  const transactions = await api.get("/transactions/recent?limit=10");

  if (transactions && transactions.length > 0) {
    container.innerHTML = `
               <table class="table">
                   <thead>
                       <tr>
                           <th>ID</th>
                           <th>User</th>
                           <th>Amount</th>
                           <th>Type</th>
                           <th>Status</th>
                           <th>Date</th>
                           <th>Actions</th>
                       </tr>
                   </thead>
                   <tbody>
                       ${transactions
                         .map(
                           (txn) => `
                           <tr>
                               <td>#${txn.id}</td>
                               <td>${txn.user_name || txn.user_email}</td>
                               <td>$${parseFloat(txn.amount).toFixed(2)}</td>
                               <td>${txn.type}</td>
                               <td><span class="status ${txn.status}">${
                             txn.status
                           }</span></td>
                               <td>${new Date(
                                 txn.created_at
                               ).toLocaleDateString()}</td>
                               <td>
                                   <button class="btn btn-primary" onclick="viewTransaction('${
                                     txn.id
                                   }')">View</button>
                                   ${
                                     txn.status === "pending"
                                       ? `
                                       <button class="btn btn-success" onclick="approveTransaction('${txn.id}')">Approve</button>
                                       <button class="btn btn-danger" onclick="rejectTransaction('${txn.id}')">Reject</button>
                                   `
                                       : ""
                                   }
                               </td>
                           </tr>
                       `
                         )
                         .join("")}
                   </tbody>
               </table>
           `;
  } else {
    container.innerHTML =
      '<p style="text-align: center; padding: 20px; color: #666;">No transactions found</p>';
  }
}

// Load Recent Users
async function loadRecentUsers() {
  const container = document.getElementById("users-container");
  const users = await api.get("/users/recent?limit=10");

  if (users && users.length > 0) {
    container.innerHTML = `
               <table class="table">
                   <thead>
                       <tr>
                           <th>ID</th>
                           <th>Name</th>
                           <th>Email</th>
                           <th>Status</th>
                           <th>Joined</th>
                           <th>Actions</th>
                       </tr>
                   </thead>
                   <tbody>
                       ${users
                         .map(
                           (user) => `
                           <tr>
                               <td>#${user.id}</td>
                               <td>${user.name}</td>
                               <td>${user.email}</td>
                               <td><span class="status ${user.status}">${
                             user.status
                           }</span></td>
                               <td>${new Date(
                                 user.created_at
                               ).toLocaleDateString()}</td>
                               <td>
                                   <button class="btn btn-primary" onclick="viewUser('${
                                     user.id
                                   }')">View</button>
                                   ${
                                     user.status === "pending"
                                       ? `
                                       <button class="btn btn-success" onclick="activateUser('${user.id}')">Activate</button>
                                   `
                                       : ""
                                   }
                                   ${
                                     user.status === "active"
                                       ? `
                                       <button class="btn btn-warning" onclick="suspendUser('${user.id}')">Suspend</button>
                                   `
                                       : ""
                                   }
                               </td>
                           </tr>
                       `
                         )
                         .join("")}
                   </tbody>
               </table>
           `;
  } else {
    container.innerHTML =
      '<p style="text-align: center; padding: 20px; color: #666;">No users found</p>';
  }
}

// Transaction Actions
async function approveTransaction(id) {
  const result = await api.put(`/transactions/${id}/approve`);
  if (result) {
    showAlert("Transaction approved successfully", "success");
    await loadRecentTransactions();
    await loadDashboard(); // Refresh stats
  }
}

async function rejectTransaction(id) {
  const result = await api.put(`/transactions/${id}/reject`);
  if (result) {
    showAlert("Transaction rejected", "success");
    await loadRecentTransactions();
    await loadDashboard(); // Refresh stats
  }
}

async function viewTransaction(id) {
  const transaction = await api.get(`/transactions/${id}`);
  if (transaction) {
    alert(
      `Transaction Details:\nID: ${transaction.id}\nAmount: $${
        transaction.amount
      }\nStatus: ${transaction.status}\nDate: ${new Date(
        transaction.created_at
      ).toLocaleString()}`
    );
  }
}

// User Actions
async function activateUser(id) {
  const result = await api.put(`/users/${id}/activate`);
  if (result) {
    showAlert("User activated successfully", "success");
    await loadRecentUsers();
    await loadDashboard(); // Refresh stats
  }
}

async function suspendUser(id) {
  const result = await api.put(`/users/${id}/suspend`);
  if (result) {
    showAlert("User suspended", "success");
    await loadRecentUsers();
  }
}

async function viewUser(id) {
  const user = await api.get(`/users/${id}`);
  if (user) {
    alert(
      `User Details:\nName: ${user.name}\nEmail: ${user.email}\nStatus: ${
        user.status
      }\nJoined: ${new Date(user.created_at).toLocaleString()}`
    );
  }
}

// Utility Functions
function showAlert(message, type) {
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;

  const mainContent = document.querySelector(".main-content");
  mainContent.insertBefore(alertDiv, mainContent.children[1]);

  setTimeout(() => alertDiv.remove(), 5000);
}

async function refreshTransactions() {
  document.getElementById("transactions-container").innerHTML =
    '<div class="loading"><div class="spinner"></div>Refreshing...</div>';
  await loadRecentTransactions();
}

async function refreshUsers() {
  document.getElementById("users-container").innerHTML =
    '<div class="loading"><div class="spinner"></div>Refreshing...</div>';
  await loadRecentUsers();
}

function logout() {
  localStorage.removeItem("admin_token");
  window.location.href = "/admin/login"; // Redirect to login page
}

// Navigation
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    document
      .querySelectorAll(".nav-link")
      .forEach((l) => l.classList.remove("active"));
    this.classList.add("active");

    const section = this.dataset.section;
    document.getElementById("page-title").textContent =
      section.charAt(0).toUpperCase() + section.slice(1);

    // Load different sections (you can expand this)
    if (section === "dashboard") {
      loadDashboard();
    } else {
      document.getElementById("main-content").innerHTML = `
                   <div class="card">
                       <div style="text-align: center; padding: 40px;">
                           <h3>${
                             section.charAt(0).toUpperCase() + section.slice(1)
                           } Section</h3>
                           <p>This section will load ${section} data from your API</p>
                           <p>API Endpoint: <code>/api/admin/${section}</code></p>
                       </div>
                   </div>
               `;
    }
  });
});

// Initialize Dashboard
document.addEventListener("DOMContentLoaded", function () {
  // Check if user is authenticated
  if (!API_TOKEN) {
    window.location.href = "/admin/login";
    return;
  }

  loadDashboard();
});
