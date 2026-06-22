// ================= HOSTELNEST CLIENT-SIDE STATE & REST API =================

const API_BASE = "http://localhost:5000/api";

let state = {
  rooms: [],
  students: [],
  fees: [],
  complaints: [],
  notices: [],
  attendance: {}
};

let currentRole = "admin";
let activeStudentId = 1;
const todayDateStr = new Date().toISOString().split('T')[0];
let activeFloorFilter = "all";
let activeAttendanceDate = todayDateStr;

// ================= API FETCH HELPERS =================

async function apiGet(endpoint) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed API request");
    }
    return await response.json();
  } catch (err) {
    console.error(`GET Error (${endpoint}):`, err);
    throw err;
  }
}

async function apiPost(endpoint, data = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed API request");
    }
    return await response.json();
  } catch (err) {
    console.error(`POST Error (${endpoint}):`, err);
    throw err;
  }
}

async function apiDelete(endpoint) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "DELETE"
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed API request");
    }
    return await response.json();
  } catch (err) {
    console.error(`DELETE Error (${endpoint}):`, err);
    throw err;
  }
}

// Synchronize frontend state with backend
async function refreshState() {
  try {
    const [rooms, students, fees, complaints, notices, attendance] = await Promise.all([
      apiGet("/rooms"),
      apiGet("/students"),
      apiGet("/fees"),
      apiGet("/complaints"),
      apiGet("/notices"),
      apiGet("/attendance")
    ]);
    
    state.rooms = rooms;
    state.students = students;
    state.fees = fees;
    state.complaints = complaints;
    state.notices = notices;
    state.attendance = attendance;
    
    // Check if active student exists, otherwise fallback
    if (state.students.length > 0 && !state.students.some(s => s.id === activeStudentId)) {
      activeStudentId = state.students[0].id;
    }
  } catch (err) {
    console.error("Could not sync with backend APIs. Make sure the Node server is running on port 5000.", err);
  }
}

// ================= BOOTSTRAP INITIALIZATION =================

document.addEventListener("DOMContentLoaded", async () => {
  const savedRole = sessionStorage.getItem("hostel_role");
  const savedStudentId = sessionStorage.getItem("hostel_student_id");
  
  // Set date headers
  const dateEl = document.getElementById("attendance-date-label");
  if (dateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.innerText = new Date().toLocaleDateString(undefined, options);
  }
  
  if (savedRole) {
    currentRole = savedRole;
    if (savedRole === "student" && savedStudentId) {
      activeStudentId = parseInt(savedStudentId);
    }
    
    // Hide login form, show dashboard
    document.getElementById("auth-screen-container").style.display = "none";
    document.getElementById("main-portal-container").style.display = "block";
    
    await refreshState();
    
    if (currentRole === "admin") {
      document.getElementById("sidebar-admin").style.display = "flex";
      document.getElementById("sidebar-student").style.display = "none";
      showView("admin-dashboard");
    } else {
      document.getElementById("sidebar-admin").style.display = "none";
      document.getElementById("sidebar-student").style.display = "flex";
      updateStudentSidebarInfo();
      showView("student-dashboard");
    }
  } else {
    // Show login form, hide dashboard
    document.getElementById("auth-screen-container").style.display = "flex";
    document.getElementById("main-portal-container").style.display = "none";
    switchAuthTab("student");
  }
});

// Authentication tab controls
function switchAuthTab(tab) {
  const studentForm = document.getElementById("form-student-login");
  const adminForm = document.getElementById("form-admin-login");
  const adminRegForm = document.getElementById("form-admin-register");
  const studentTab = document.getElementById("tab-student-btn");
  const adminTab = document.getElementById("tab-admin-btn");
  
  if (tab === "student") {
    studentForm.style.display = "block";
    adminForm.style.display = "none";
    adminRegForm.style.display = "none";
    studentTab.className = "auth-tabactive";
    adminTab.className = "";
  } else {
    studentForm.style.display = "none";
    adminForm.style.display = "block";
    adminRegForm.style.display = "none";
    studentTab.className = "";
    adminTab.className = "auth-tabactive";
  }
}

function toggleAdminRegister(show) {
  const loginForm = document.getElementById("form-admin-login");
  const registerForm = document.getElementById("form-admin-register");
  if (show) {
    loginForm.style.display = "none";
    registerForm.style.display = "block";
  } else {
    loginForm.style.display = "block";
    registerForm.style.display = "none";
  }
}

// Authentication handlers
async function loginAsAdmin(event) {
  event.preventDefault();
  const username = document.getElementById("login-admin-username").value.trim();
  const password = document.getElementById("login-admin-password").value.trim();
  
  try {
    const res = await apiPost("/admins/login", { username, password });
    
    sessionStorage.setItem("hostel_role", "admin");
    sessionStorage.removeItem("hostel_student_id");
    
    currentRole = "admin";
    
    // Toggle layouts
    document.getElementById("auth-screen-container").style.display = "none";
    document.getElementById("main-portal-container").style.display = "block";
    document.getElementById("sidebar-admin").style.display = "flex";
    document.getElementById("sidebar-student").style.display = "none";
    
    await refreshState();
    showView("admin-dashboard");
  } catch (err) {
    alert("Authentication failed: " + err.message);
  }
}

async function registerAdmin(event) {
  event.preventDefault();
  const name = document.getElementById("reg-admin-name").value.trim();
  const email = document.getElementById("reg-admin-email").value.trim();
  const username = document.getElementById("reg-admin-username").value.trim();
  const password = document.getElementById("reg-admin-password").value.trim();
  
  if (/\d/.test(name)) {
    alert("Warden Name should not contain numbers!");
    return;
  }
  
  try {
    const res = await apiPost("/admins/register", { name, email, username, password });
    alert("Warden registered successfully! You can now sign in with your credentials.");
    document.getElementById("form-admin-register").reset();
    toggleAdminRegister(false);
    document.getElementById("login-admin-username").value = username;
  } catch (err) {
    alert("Registration failed: " + err.message);
  }
}

async function loginAsStudent(event) {
  event.preventDefault();
  const rollInput = document.getElementById("login-student-roll").value.trim();
  
  try {
    // Fetch latest students records from API
    const studentsList = await apiGet("/students");
    const matchedStudent = studentsList.find(s => s.roll.toLowerCase() === rollInput.toLowerCase());
    
    if (matchedStudent) {
      sessionStorage.setItem("hostel_role", "student");
      sessionStorage.setItem("hostel_student_id", matchedStudent.id);
      
      currentRole = "student";
      activeStudentId = matchedStudent.id;
      
      // Toggle layouts
      document.getElementById("auth-screen-container").style.display = "none";
      document.getElementById("main-portal-container").style.display = "block";
      document.getElementById("sidebar-admin").style.display = "none";
      document.getElementById("sidebar-student").style.display = "flex";
      
      await refreshState();
      updateStudentSidebarInfo();
      showView("student-dashboard");
    } else {
      alert("Roll number not found in student registry database. Please try H2026-002.");
    }
  } catch (err) {
    alert("Could not communicate with server APIs: " + err.message);
  }
}

function logout() {
  sessionStorage.clear();
  window.location.reload();
}

function populateStudentContextSelector() {
  // Retained as a dummy function to prevent errors from other view routers
}

function updateStudentSidebarInfo() {
  const s = state.students.find(stud => stud.id === activeStudentId);
  if (!s) return;
  
  const nameEl = document.getElementById("student-sidebar-name");
  const roomEl = document.getElementById("student-sidebar-room");
  const avatarEl = document.getElementById("student-avatar");
  
  if (nameEl) nameEl.innerText = s.name;
  if (roomEl) roomEl.innerText = s.roomId ? `Room ${s.roomId} (${s.bedLabel})` : "No Room Allocated";
  if (avatarEl) {
    const initials = s.name.split(" ").map(w => w[0]).join("");
    avatarEl.innerText = initials;
  }
}

// Main Single Page Routing engine
async function showView(viewId) {
  const sections = document.querySelectorAll(".view-section");
  sections.forEach(s => s.classList.remove("active-view"));
  
  const links = document.querySelectorAll(".menu-item-link");
  links.forEach(l => l.classList.remove("active"));
  
  const activeSection = document.getElementById(`view-${viewId}`);
  if (activeSection) {
    activeSection.classList.add("active-view");
  }
  
  const activeLink = document.querySelector(`.menu-item-link[data-view="${viewId}"]`);
  if (activeLink) {
    activeLink.classList.add("active");
  }

  // Reload data from backend API
  await refreshState();
  
  switch(viewId) {
    case "admin-dashboard":
      renderAdminDashboard();
      break;
    case "admin-students":
      renderStudentsTable();
      populateRoomAssignDropdown();
      break;
    case "admin-rooms":
      activeFloorFilter = "all";
      const floorBtns = document.querySelectorAll(".floor-btn");
      floorBtns.forEach(btn => {
        if (btn.getAttribute("data-floor") === "all") {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
      renderRoomsGrid();
      break;
    case "admin-fees":
      renderAdminFees();
      populateIssueFeeDropdown();
      break;
    case "admin-complaints":
      renderAdminComplaints();
      break;
    case "admin-attendance":
      renderAdminAttendance();
      break;
    case "admin-notifications":
      renderAdminNotifications();
      break;
      
    // Student Dashboard Routing
    case "student-dashboard":
      renderStudentDashboard();
      break;
    case "student-room":
      renderStudentRoomView();
      break;
    case "student-fees":
      renderStudentFees();
      break;
    case "student-complaints":
      renderStudentComplaints();
      break;
    case "student-attendance":
      renderStudentAttendance();
      break;
    case "student-notifications":
      renderStudentNotifications();
      break;
  }
}


// ================= RENDER IMPLEMENTATIONS: ADMIN VIEWS =================

function renderAdminDashboard() {
  document.getElementById("admin-stat-total-students").innerText = state.students.length;
  fetchAuditLogs();
  
  let totalBeds = 0;
  let occupiedBeds = 0;
  state.rooms.forEach(room => {
    if (room.status !== "Maintenance") {
      Object.keys(room.beds).forEach(b => {
        totalBeds++;
        if (room.beds[b] !== null) occupiedBeds++;
      });
    }
  });
  
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  document.getElementById("admin-stat-occupancy-rate").innerText = `${occupancyRate}%`;
  document.getElementById("admin-stat-room-fraction").innerText = `${occupiedBeds}/${totalBeds} Beds Occupied`;
  
  const ringFill = document.getElementById("occupancy-progress-ring");
  const ringText = document.getElementById("ring-occupancy-txt");
  if (ringFill && ringText) {
    ringText.innerText = `${occupancyRate}%`;
    const radius = ringFill.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (occupancyRate / 100) * circumference;
    ringFill.style.strokeDashoffset = strokeDashoffset;
  }

  const activeComplaints = state.complaints.filter(c => c.status !== "Resolved").length;
  document.getElementById("admin-stat-active-complaints").innerText = activeComplaints;
  
  const pendingFeesSum = state.fees
    .filter(f => f.status === "Pending")
    .reduce((sum, f) => sum + f.amount, 0);
  document.getElementById("admin-stat-pending-fees").innerText = `₹${pendingFeesSum}`;
  
  const paidFeesSum = state.fees
    .filter(f => f.status === "Paid")
    .reduce((sum, f) => sum + f.amount, 0);
  const totalFeesSum = paidFeesSum + pendingFeesSum;
  const collectionRate = totalFeesSum > 0 ? Math.round((paidFeesSum / totalFeesSum) * 100) : 0;
  
  const revProgress = document.getElementById("admin-revenue-progress-bar");
  const revPercentText = document.getElementById("admin-revenue-percentage");
  if (revProgress && revPercentText) {
    revProgress.style.width = `${collectionRate}%`;
    revPercentText.innerText = `${collectionRate}% Collected (₹${paidFeesSum} of ₹${totalFeesSum})`;
  }

  // Render attendance sub-list
  const miniAttendanceContainer = document.getElementById("admin-attendance-summary-list");
  if (miniAttendanceContainer) {
    miniAttendanceContainer.innerHTML = "";
    
    let presentCount = 0;
    let totalMarked = 0;
    const todayRoll = state.attendance[todayDateStr] || {};
    
    state.students.forEach(s => {
      const status = todayRoll[s.id] || "Unmarked";
      if (status !== "Unmarked") {
        totalMarked++;
        if (status === "Present") presentCount++;
      }
      
      const item = document.createElement("div");
      item.style.display = "flex";
      item.style.justifyContent = "space-between";
      item.style.alignItems = "center";
      item.style.padding = "6px 12px";
      item.style.borderRadius = "8px";
      item.style.background = "rgba(255, 255, 255, 0.01)";
      item.style.fontSize = "12px";
      
      let badgeClass = "badge-info";
      if (status === "Present") badgeClass = "badge-success";
      if (status === "Absent") badgeClass = "badge-danger";
      
      item.innerHTML = `
        <span>${s.name} (Room ${s.roomId || "None"})</span>
        <span class="badge ${badgeClass}">${status}</span>
      `;
      miniAttendanceContainer.appendChild(item);
    });

    const attRate = state.students.length > 0 ? Math.round((totalMarked / state.students.length) * 100) : 0;
    document.getElementById("admin-today-attendance-stat").innerText = `${attRate}% Marked (${presentCount} Present today)`;
  }

  // Dashboard support list
  const complaintsContainer = document.getElementById("admin-dashboard-complaints-list");
  if (complaintsContainer) {
    complaintsContainer.innerHTML = "";
    const activeList = state.complaints.filter(c => c.status !== "Resolved").slice(0, 3);
    
    if (activeList.length === 0) {
      complaintsContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 15px;">No active support tickets. All set!</div>`;
    } else {
      activeList.forEach(c => {
        const stud = state.students.find(s => s.id === c.studentId);
        const card = document.createElement("div");
        card.className = "notice-item";
        
        let urgencyBadge = "badge-info";
        if (c.urgency === "Medium") urgencyBadge = "badge-warning";
        if (c.urgency === "High") urgencyBadge = "badge-danger";

        card.innerHTML = `
          <div class="notice-meta">
            <span>Room ${stud ? stud.roomId : "None"} • By ${stud ? stud.name : "Resident"}</span>
            <span class="badge ${urgencyBadge}">${c.urgency} Priority</span>
          </div>
          <div class="notice-title" style="display:flex; justify-content:space-between; align-items:center;">
            <span>${c.subject}</span>
            <span class="badge badge-warning">${c.status}</span>
          </div>
          <div class="notice-body" style="margin-top: 5px;">${c.description}</div>
          <div style="margin-top:10px; display:flex; justify-content:flex-end;">
            <button class="btn btn-primary btn-sm" onclick="openResolveComplaintModal('${c.id}')">Review Ticket</button>
          </div>
        `;
        complaintsContainer.appendChild(card);
      });
    }
  }
}

function renderStudentsTable() {
  const tbody = document.getElementById("students-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  
  state.students.forEach(s => {
    const row = document.createElement("tr");
    row.setAttribute("data-student-name", s.name.toLowerCase());
    row.setAttribute("data-student-roll", s.roll.toLowerCase());
    row.setAttribute("data-student-branch", s.branch.toLowerCase());
    row.setAttribute("data-student-allocated", s.roomId ? "allocated" : "unallocated");

    const initials = s.name.split(" ").map(w => w[0]).join("");
    
    row.innerHTML = `
      <td>
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="profile-avatar" style="width: 32px; height: 32px; font-size: 12px;">${initials}</div>
          <div>
            <div style="font-weight: 600; color: #fff;">${s.name}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${s.branch}</div>
          </div>
        </div>
      </td>
      <td><span style="font-family: monospace;">${s.roll}</span></td>
      <td>
        <div style="font-size: 12px;">
          <div>${s.email}</div>
          <div style="color: var(--text-secondary);">${s.phone}</div>
        </div>
      </td>
      <td>
        ${s.roomId ? `<span class="badge badge-success">Room ${s.roomId} (${s.bedLabel})</span>` : `<span class="badge badge-warning">Awaiting Bed</span>`}
      </td>
      <td>
        ${s.roomId ? `<span class="badge badge-success">Active Resident</span>` : `<span class="badge badge-warning">Registered</span>`}
      </td>
      <td>
        <div style="display: flex; gap: 6px;">
          ${s.roomId ? 
            `<button class="btn btn-danger btn-sm" onclick="checkoutStudent(${s.id})">Checkout</button>` : 
            `<button class="btn btn-primary btn-sm" onclick="openAllocateStudentModal(${s.id})">Allocate Room</button>`
          }
          <button class="btn btn-sm" onclick="deleteStudent(${s.id})">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function filterStudentsTable() {
  const query = document.getElementById("search-student").value.toLowerCase();
  const roomStatus = document.getElementById("filter-room-status").value;
  const rows = document.querySelectorAll("#students-table-body tr");
  
  rows.forEach(row => {
    const name = row.getAttribute("data-student-name");
    const roll = row.getAttribute("data-student-roll");
    const branch = row.getAttribute("data-student-branch");
    const allocState = row.getAttribute("data-student-allocated");
    
    const matchesSearch = name.includes(query) || roll.includes(query) || branch.includes(query);
    const matchesFilter = roomStatus === "all" || allocState === roomStatus;
    
    if (matchesSearch && matchesFilter) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

function filterByFloor(floor) {
  activeFloorFilter = floor;
  const buttons = document.querySelectorAll(".floor-btn");
  buttons.forEach(btn => {
    if (btn.getAttribute("data-floor") === floor) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
  renderRoomsGrid();
}

function renderRoomsGrid() {
  const grid = document.getElementById("rooms-grid");
  if (!grid) return;
  renderWardenRoomSwitches();
  grid.innerHTML = "";
  
  const typeFilter = document.getElementById("filter-room-type").value;
  const occupancyFilter = document.getElementById("filter-room-occupancy").value;
  
  state.rooms.forEach(room => {
    let maxBeds = Object.keys(room.beds).length;
    let allocated = 0;
    Object.keys(room.beds).forEach(b => {
      if (room.beds[b] !== null) allocated++;
    });
    
    let occupancyState = "vacant";
    if (allocated === maxBeds) occupancyState = "full";
    if (room.status === "Maintenance") occupancyState = "maintenance";
    
    if (activeFloorFilter !== "all" && room.floor !== activeFloorFilter) return;
    if (typeFilter !== "all" && room.type !== typeFilter) return;
    if (occupancyFilter !== "all") {
      if (occupancyFilter === "vacant" && (occupancyState !== "vacant" || room.status === "Maintenance")) return;
      if (occupancyFilter === "full" && occupancyState !== "full") return;
      if (occupancyFilter === "maintenance" && room.status !== "Maintenance") return;
    }
    
    const card = document.createElement("div");
    card.className = "room-card";
    
    let statusBadge = `<span class="badge badge-success">Vacant</span>`;
    if (occupancyState === "full") statusBadge = `<span class="badge badge-danger">Full</span>`;
    if (allocated > 0 && allocated < maxBeds) statusBadge = `<span class="badge badge-warning">Occupied (${allocated}/${maxBeds})</span>`;
    if (room.status === "Maintenance") statusBadge = `<span class="badge badge-danger">Maintenance</span>`;
    
    let bedsHTML = "";
    Object.keys(room.beds).forEach(b => {
      const studentId = room.beds[b];
      const isOccupied = studentId !== null;
      let occupantName = "Empty Bed";
      if (isOccupied) {
        const student = state.students.find(s => s.id === studentId);
        occupantName = student ? student.name : "Resident";
      }
      
      bedsHTML += `
        <div class="bed-row ${isOccupied ? 'occupied' : ''}">
          <span class="bed-label">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9M10 8v9"></path></svg>
            ${b}
          </span>
          <span class="${isOccupied ? 'bed-occupant' : 'bed-empty'}">${occupantName}</span>
        </div>
      `;
    });

    card.innerHTML = `
      <div class="room-card-header">
        <span class="room-number-pill">Room ${room.id}</span>
        ${statusBadge}
      </div>
      <div style="font-size:12px; color:var(--text-secondary); margin-bottom:12px; display:flex; justify-content:space-between;">
        <span>Type: ${room.type} Room</span>
        <span>Rent: ₹${room.rent}/mo</span>
      </div>
      <div class="room-beds-container">
        ${bedsHTML}
      </div>
      <div class="room-actions">
        ${room.status === "Maintenance" ? 
          `<button class="btn btn-success btn-sm" onclick="toggleRoomMaintenance('${room.id}', false)">Complete Maintenance</button>` : 
          `<button class="btn btn-sm" onclick="toggleRoomMaintenance('${room.id}', true)">Maintenance Mode</button>`
        }
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderAdminFees() {
  const tbody = document.getElementById("admin-fees-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  
  let totalSum = 0;
  let collectedSum = 0;
  let overdueSum = 0;
  
  // Calculate sums based on ALL fees first
  state.fees.forEach(f => {
    if (f.status === "Paid") collectedSum += f.amount;
    else if (f.status === "Pending") overdueSum += f.amount;
    totalSum += f.amount;
  });

  document.getElementById("admin-fees-stat-total").innerText = `₹${totalSum}`;
  document.getElementById("admin-fees-stat-collected").innerText = `₹${collectedSum}`;
  document.getElementById("admin-fees-stat-overdue").innerText = `₹${overdueSum}`;

  // Read filter values
  const searchInput = document.getElementById("search-invoice");
  const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : "";
  
  const statusFilter = document.getElementById("filter-invoice-status");
  const selectedStatus = statusFilter ? statusFilter.value : "all";
  
  const sortFilter = document.getElementById("sort-invoice");
  const selectedSort = sortFilter ? sortFilter.value : "date-newest";
  
  // Filter
  let filteredFees = state.fees.filter(f => {
    const student = state.students.find(s => s.id === f.studentId);
    
    // Status Filter
    if (selectedStatus !== "all" && f.status !== selectedStatus) return false;
    
    // Search Query Filter
    if (searchQuery) {
      const matchInvoiceId = f.id.toLowerCase().includes(searchQuery);
      const matchStudentName = student && student.name.toLowerCase().includes(searchQuery);
      const matchStudentRoll = student && student.roll.toLowerCase().includes(searchQuery);
      const matchDesc = f.description.toLowerCase().includes(searchQuery);
      if (!matchInvoiceId && !matchStudentName && !matchStudentRoll && !matchDesc) return false;
    }
    
    return true;
  });

  // Sort
  filteredFees.sort((a, b) => {
    if (selectedSort === "date-newest") {
      return new Date(b.issueDate) - new Date(a.issueDate);
    } else if (selectedSort === "date-oldest") {
      return new Date(a.issueDate) - new Date(b.issueDate);
    } else if (selectedSort === "amount-high") {
      return b.amount - a.amount;
    } else if (selectedSort === "amount-low") {
      return a.amount - b.amount;
    }
    return 0;
  });

  // Render rows
  if (filteredFees.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">No invoices match this search/filter.</td></tr>`;
    return;
  }

  filteredFees.forEach(f => {
    const student = state.students.find(s => s.id === f.studentId);
    const row = document.createElement("tr");
    
    let statusBadge = `<span class="badge badge-warning">Pending</span>`;
    if (f.status === "Paid") statusBadge = `<span class="badge badge-success">Paid</span>`;
    
    row.innerHTML = `
      <td>
        <div style="font-weight: 600; color: #fff;">${student ? student.name : "Unregistered Resident"}</div>
        <div style="font-size: 11px; color: var(--text-secondary);">Room ${student && student.roomId ? student.roomId : "None"}</div>
      </td>
      <td>${f.description}</td>
      <td>${f.issueDate}</td>
      <td>${f.dueDate}</td>
      <td><span style="font-weight: 600;">₹${f.amount}</span></td>
      <td>${statusBadge}</td>
      <td>
        ${f.status === "Pending" ? 
          `<button class="btn btn-success btn-sm" onclick="markFeeAsPaid('${f.id}')">Record Cash Payment</button>` : 
          `<span style="color:var(--success); font-size:12px; font-weight:600;">Settled</span>`
        }
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderAdminComplaints() {
  const container = document.getElementById("admin-complaints-list");
  if (!container) return;
  container.innerHTML = "";
  
  const filterVal = document.getElementById("filter-complaint-status").value;
  let filteredList = state.complaints;
  
  if (filterVal !== "all") {
    filteredList = state.complaints.filter(c => c.status === filterVal);
  }
  
  if (filteredList.length === 0) {
    container.innerHTML = `<div class="dashboard-card" style="text-align: center; color: var(--text-muted); font-size: 14px; padding: 40px;">No complaints match this status search.</div>`;
    return;
  }
  
  filteredList.forEach(c => {
    const student = state.students.find(s => s.id === c.studentId);
    const card = document.createElement("div");
    card.className = "complaint-card";
    
    let priorityBadge = "badge-info";
    if (c.urgency === "Medium") priorityBadge = "badge-warning";
    if (c.urgency === "High") priorityBadge = "badge-danger";
    
    let statusBadge = "badge-warning";
    if (c.status === "In Progress") statusBadge = "badge-info";
    if (c.status === "Resolved") statusBadge = "badge-success";
    
    card.innerHTML = `
      <div class="complaint-header">
        <div class="complaint-meta">
          <span class="complaint-student-name">${student ? student.name : "Resident"} (Room ${student && student.roomId ? student.roomId : "None"})</span>
          <span class="complaint-date">Filed on: ${c.date} • Category: <b>${c.category}</b></span>
        </div>
        <div style="display: flex; gap: 8px;">
          <span class="badge ${priorityBadge}">${c.urgency} Urgency</span>
          <span class="badge ${statusBadge}">${c.status}</span>
        </div>
      </div>
      <div class="complaint-subject">${c.subject}</div>
      <div class="complaint-desc">${c.description}</div>
      
      ${c.adminComment ? `<div class="complaint-admin-comment"><b>Admin remarks:</b> ${c.adminComment}</div>` : ''}
      
      <div class="complaint-footer">
        <span>Ticket ID: <span style="font-family: monospace; font-weight: 600;">${c.id}</span></span>
        ${c.status !== "Resolved" ? 
          `<button class="btn btn-primary btn-sm" onclick="openResolveComplaintModal('${c.id}')">Action Ticket</button>` : 
          `<span style="color:var(--success); font-size:12px; font-weight:600; display:flex; align-items:center; gap:4px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:14px; height:14px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Resolved</span>`
        }
      </div>
    `;
    container.appendChild(card);
  });
}

function renderAdminAttendance() {
  const tbody = document.getElementById("admin-attendance-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  
  const dateInput = document.getElementById("admin-attendance-date-select");
  if (dateInput) {
    dateInput.value = activeAttendanceDate;
  }
  
  const selectedRoll = state.attendance[activeAttendanceDate] || {};
  
  state.students.forEach(s => {
    const status = selectedRoll[s.id] || "Unmarked";
    const row = document.createElement("tr");
    
    let btnHTML = "";
    if (status === "Unmarked") {
      btnHTML = `
        <div style="display:flex; gap:8px;">
          <button class="attendance-toggle-btn unset" onclick="markAttendance(${s.id}, 'Present')">P</button>
          <button class="attendance-toggle-btn unset" onclick="markAttendance(${s.id}, 'Absent')">A</button>
        </div>
      `;
    } else if (status === "Present") {
      btnHTML = `
        <div style="display:flex; gap:8px;">
          <button class="attendance-toggle-btn present" onclick="markAttendance(${s.id}, 'Absent')">Present</button>
          <span style="font-size:11px; color:var(--text-muted); align-self:center;">Click to swap</span>
        </div>
      `;
    } else {
      btnHTML = `
        <div style="display:flex; gap:8px;">
          <button class="attendance-toggle-btn absent" onclick="markAttendance(${s.id}, 'Present')">Absent</button>
          <span style="font-size:11px; color:var(--text-muted); align-self:center;">Click to swap</span>
        </div>
      `;
    }
    
    const dates = Object.keys(state.attendance).filter(d => d !== activeAttendanceDate).sort().reverse();
    let lastMarkedStr = "No logs";
    if (dates.length > 0) {
      const lastDate = dates[0];
      const lastStatus = state.attendance[lastDate][s.id] || "None";
      lastMarkedStr = `${lastStatus} (${lastDate.substring(5)})`;
    }

    row.innerHTML = `
      <td><span class="badge badge-info">${s.roomId ? "Room " + s.roomId : "No Room"}</span></td>
      <td>
        <div style="font-weight: 600; color:#fff;">${s.name}</div>
        <div style="font-size:11px; color:var(--text-muted);">${s.roll}</div>
      </td>
      <td>${btnHTML}</td>
      <td><span style="font-size:13px; color:var(--text-secondary);">${lastMarkedStr}</span></td>
    `;
    tbody.appendChild(row);
  });

  renderAttendanceHistory();
}

function changeAttendanceDate(date) {
  activeAttendanceDate = date;
  renderAdminAttendance();
}

function viewHistoryDate(dateStr) {
  activeAttendanceDate = dateStr;
  renderAdminAttendance();
  const element = document.getElementById("view-admin-attendance");
  if (element) element.scrollIntoView({ behavior: 'smooth' });
}

function renderAttendanceHistory() {
  const tbody = document.getElementById("admin-attendance-history-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  
  const dates = Object.keys(state.attendance).sort().reverse();
  
  if (dates.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 15px;">No attendance history logs found.</td></tr>`;
    return;
  }
  
  dates.forEach(dateStr => {
    const record = state.attendance[dateStr] || {};
    let present = 0;
    let absent = 0;
    let unmarked = 0;
    
    state.students.forEach(s => {
      const status = record[s.id] || "Unmarked";
      if (status === "Present") present++;
      else if (status === "Absent") absent++;
      else unmarked++;
    });
    
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span style="font-weight: 600; color: #fff;">${dateStr}</span></td>
      <td><span class="badge badge-success">${present} Present</span></td>
      <td><span class="badge badge-danger">${absent} Absent</span></td>
      <td><span class="badge badge-info">${unmarked} Unmarked</span></td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="viewHistoryDate('${dateStr}')">Load in Sheet</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderAdminNotifications() {
  const container = document.getElementById("admin-sent-notices-list");
  if (!container) return;
  container.innerHTML = "";
  
  if (state.notices.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px; font-size:13px;">No alerts broadcasted yet.</div>`;
    return;
  }
  
  state.notices.slice().reverse().forEach(n => {
    const item = document.createElement("div");
    item.className = "notice-item";
    item.innerHTML = `
      <div class="notice-meta">
        <span>${n.date}</span>
        <span class="notice-badge">${n.category}</span>
      </div>
      <div class="notice-title">${n.title}</div>
      <div class="notice-body">${n.message}</div>
    `;
    container.appendChild(item);
  });
}


// ================= RENDER IMPLEMENTATIONS: STUDENT VIEWS =================

function renderStudentDashboard() {
  const student = state.students.find(s => s.id === activeStudentId);
  if (!student) return;
  
  document.getElementById("student-dashboard-welcome-name").innerText = student.name;
  
  const roomEl = document.getElementById("student-stat-room-num");
  const typeEl = document.getElementById("student-stat-room-type");
  
  if (student.roomId) {
    roomEl.innerText = `Room ${student.roomId}`;
    const room = state.rooms.find(r => r.id === student.roomId);
    typeEl.innerText = room ? `${room.type} Room (${student.bedLabel})` : `${student.bedLabel}`;
  } else {
    roomEl.innerText = "Unallocated";
    typeEl.innerText = "Request allocation from Warden";
  }
  
  const unpaidSum = state.fees
    .filter(f => f.studentId === student.id && f.status === "Pending")
    .reduce((sum, f) => sum + f.amount, 0);
  
  document.getElementById("student-stat-pending-fees").innerText = `₹${unpaidSum}`;
  document.getElementById("student-stat-payment-desc").innerText = unpaidSum > 0 ? `${state.fees.filter(f => f.studentId === student.id && f.status === "Pending").length} Invoice pending payment` : "All accounts cleared";
  
  const myComplaintsCount = state.complaints.filter(c => c.studentId === student.id).length;
  document.getElementById("student-stat-my-complaints").innerText = myComplaintsCount;
  
  const noticesContainer = document.getElementById("student-dashboard-notices");
  if (noticesContainer) {
    noticesContainer.innerHTML = "";
    
    if (state.notices.length === 0) {
      noticesContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size:13px; padding:15px;">Notice board is empty.</div>`;
    } else {
      state.notices.slice(-3).reverse().forEach(n => {
        const item = document.createElement("div");
        item.className = "notice-item";
        item.innerHTML = `
          <div class="notice-meta">
            <span>${n.date}</span>
            <span class="notice-badge">${n.category}</span>
          </div>
          <div class="notice-title">${n.title}</div>
          <div class="notice-body">${n.message}</div>
        `;
        noticesContainer.appendChild(item);
      });
    }
  }

  // Student Attendance circular chart logic
  let presentDays = 0;
  let totalLoggedDays = 0;
  
  Object.keys(state.attendance).forEach(date => {
    const dayMark = state.attendance[date][student.id];
    if (dayMark && dayMark !== "Unmarked") {
      totalLoggedDays++;
      if (dayMark === "Present") presentDays++;
    }
  });
  
  const studentAttRate = totalLoggedDays > 0 ? Math.round((presentDays / totalLoggedDays) * 100) : 0;
  
  const ring = document.getElementById("student-attendance-progress-ring");
  const ringTxt = document.getElementById("student-attendance-rate-txt");
  if (ring && ringTxt) {
    ringTxt.innerText = `${studentAttRate}%`;
    const radius = ring.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (studentAttRate / 100) * circumference;
    ring.style.strokeDashoffset = strokeDashoffset;
  }
}

function renderStudentRoomView() {
  const student = state.students.find(s => s.id === activeStudentId);
  const roommatesContainer = document.getElementById("student-roommates-list");
  
  if (!roommatesContainer) return;
  roommatesContainer.innerHTML = "";
  
  renderStudentSwitchStatus();
  
  if (!student || !student.roomId) {
    roommatesContainer.innerHTML = `
      <div class="dashboard-card" style="text-align: center; color: var(--text-muted); padding: 30px;">
        <h3>No Room Allocation</h3>
        <p style="margin-top: 10px; font-size: 13px;">You are currently not assigned to any room. Contact administration to assign rooms.</p>
      </div>
    `;
    return;
  }
  
  const room = state.rooms.find(r => r.id === student.roomId);
  if (!room) return;
  
  Object.keys(room.beds).forEach(b => {
    const residentId = room.beds[b];
    if (residentId === null) {
      const item = document.createElement("div");
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.justifyContent = "space-between";
      item.style.padding = "15px";
      item.style.borderRadius = "12px";
      item.style.background = "rgba(255,255,255,0.01)";
      item.style.border = "1px dashed var(--border-color)";
      
      item.innerHTML = `
        <span style="font-size:14px; font-weight:600; color:var(--text-muted);">${b}</span>
        <span style="font-size:12px; color:var(--text-muted); font-style:italic;">Vacant Bed Space</span>
      `;
      roommatesContainer.appendChild(item);
    } else {
      const resident = state.students.find(s => s.id === residentId);
      if (!resident) return;
      
      const isSelf = resident.id === student.id;
      const initials = resident.name.split(" ").map(w => w[0]).join("");
      const item = document.createElement("div");
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.gap = "15px";
      item.style.padding = "15px";
      item.style.borderRadius = "12px";
      item.style.background = isSelf ? "rgba(99, 102, 241, 0.05)" : "rgba(255,255,255,0.02)";
      item.style.border = isSelf ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid var(--border-color)";
      
      item.innerHTML = `
        <div class="profile-avatar" style="width: 42px; height: 42px; font-size:14px;">${initials}</div>
        <div style="flex:1;">
          <div style="font-weight:600; color:#fff; display:flex; align-items:center; gap:6px;">
            <span>${resident.name}</span> 
            ${isSelf ? '<span class="badge badge-success" style="font-size:9px; padding:2px 6px;">You</span>' : ''}
          </div>
          <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">${resident.branch} • ${b}</div>
        </div>
        <div style="text-align: right; font-size:12px;">
          <div style="color:#fff;">${resident.phone}</div>
          <div style="color:var(--text-muted); margin-top:2px;">${resident.email}</div>
        </div>
      `;
      roommatesContainer.appendChild(item);
    }
  });
}

function renderStudentFees() {
  const tbody = document.getElementById("student-fees-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  
  const studentFees = state.fees.filter(f => f.studentId === activeStudentId);
  
  if (studentFees.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">No invoice accounts recorded for your profile.</td></tr>`;
    return;
  }
  
  studentFees.forEach(f => {
    const row = document.createElement("tr");
    let statusBadge = `<span class="badge badge-warning">Pending</span>`;
    if (f.status === "Paid") statusBadge = `<span class="badge badge-success">Paid</span>`;
    
    row.innerHTML = `
      <td><span style="font-family: monospace; font-weight:600;">${f.id}</span></td>
      <td>${f.description}</td>
      <td>${f.issueDate}</td>
      <td>${f.dueDate}</td>
      <td><span style="font-weight:600;">₹${f.amount}</span></td>
      <td>${statusBadge}</td>
      <td>
        ${f.status === "Pending" ? 
          `<button class="btn btn-primary btn-sm" onclick="openPaymentGateway('${f.id}', ${f.amount})">Pay Now</button>` : 
          `<span style="color:var(--success); font-size:12px; font-weight:600;">Settled</span>`
        }
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderStudentComplaints() {
  const container = document.getElementById("student-complaints-list");
  if (!container) return;
  container.innerHTML = "";
  
  const myComplaints = state.complaints.filter(c => c.studentId === activeStudentId);
  
  if (myComplaints.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size:14px; padding: 40px;">No support tickets logged. Click "File New Ticket" to register a issue.</div>`;
    return;
  }
  
  myComplaints.forEach(c => {
    const card = document.createElement("div");
    card.className = "complaint-card";
    
    let priorityBadge = "badge-info";
    if (c.urgency === "Medium") priorityBadge = "badge-warning";
    if (c.urgency === "High") priorityBadge = "badge-danger";
    
    let statusBadge = "badge-warning";
    if (c.status === "In Progress") statusBadge = "badge-info";
    if (c.status === "Resolved") statusBadge = "badge-success";
    
    card.innerHTML = `
      <div class="complaint-header">
        <div class="complaint-meta">
          <span class="complaint-student-name">Category: ${c.category}</span>
          <span class="complaint-date">Filed on: ${c.date}</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <span class="badge ${priorityBadge}">${c.urgency} Urgency</span>
          <span class="badge ${statusBadge}">${c.status}</span>
        </div>
      </div>
      <div class="complaint-subject">${c.subject}</div>
      <div class="complaint-desc">${c.description}</div>
      
      ${c.adminComment ? `<div class="complaint-admin-comment"><b>Admin Resolution Comments:</b> ${c.adminComment}</div>` : ''}
      
      <div class="complaint-footer" style="border-top: none; padding-top: 0;">
        <span style="font-size:11px; color:var(--text-muted);">Ticket ID: <span style="font-family: monospace;">${c.id}</span></span>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderStudentAttendance() {
  const container = document.getElementById("student-calendar-grid-cells");
  if (!container) return;
  container.innerHTML = "";
  
  const firstDayOffset = 4; // Mon=0, Tue=1, Wed=2, Thu=3, Fri=4 (May 1st 2026 was Friday)
  
  for (let i = 0; i < firstDayOffset; i++) {
    const blank = document.createElement("div");
    blank.className = "calendar-cell";
    blank.style.opacity = "0.2";
    blank.style.background = "transparent";
    blank.style.border = "none";
    container.appendChild(blank);
  }
  
  for (let day = 1; day <= 31; day++) {
    const dateStr = `2026-05-${day.toString().padStart(2, '0')}`;
    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    
    let status = "Unmarked";
    if (state.attendance[dateStr]) {
      status = state.attendance[dateStr][activeStudentId] || "Unmarked";
    }
    
    if (status === "Present") cell.classList.add("present");
    if (status === "Absent") cell.classList.add("absent");
    
    let badgeClass = "badge-info";
    if (status === "Present") badgeClass = "badge-success";
    if (status === "Absent") badgeClass = "badge-danger";
    
    cell.innerHTML = `
      <span class="calendar-date">${day}</span>
      <span class="calendar-status-text badge ${badgeClass}">${status}</span>
    `;
    container.appendChild(cell);
  }
}

function renderStudentNotifications() {
  const container = document.getElementById("student-full-notices-list");
  if (!container) return;
  container.innerHTML = "";
  
  if (state.notices.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding:30px; font-size:14px;">No notices board alerts found.</div>`;
    return;
  }
  
  state.notices.slice().reverse().forEach(n => {
    const item = document.createElement("div");
    item.className = "notice-item";
    item.innerHTML = `
      <div class="notice-meta">
        <span>Broadcasted on: ${n.date}</span>
        <span class="notice-badge">${n.category}</span>
      </div>
      <div class="notice-title" style="font-size:16px;">${n.title}</div>
      <div class="notice-body" style="font-size:14px; margin-top:10px;">${n.message}</div>
    `;
    container.appendChild(item);
  });
}


// ================= MODALS & ACTIONS LOGIC =================

function getNextStudentRoll() {
  if (state.students.length === 0) return "H2026-001";
  
  let maxNum = 0;
  state.students.forEach(s => {
    if (s.roll && s.roll.includes("-")) {
      const parts = s.roll.split("-");
      const num = parseInt(parts[1]);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });
  
  const nextNum = maxNum + 1;
  const paddedNum = String(nextNum).padStart(3, '0');
  return `H2026-${paddedNum}`;
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("open");
    
    // Auto-allocate different unique roll/ID number for new student
    if (modalId === "modal-register-student") {
      const rollInput = document.getElementById("student-roll");
      if (rollInput) {
        rollInput.value = getNextStudentRoll();
      }
      // Reset room/bed assignment display
      const roomSelect = document.getElementById("student-room-assign");
      if (roomSelect) roomSelect.value = "none";
      const bedContainer = document.getElementById("bed-assign-container");
      if (bedContainer) bedContainer.style.display = "none";
      const bedSelect = document.getElementById("student-bed-assign");
      if (bedSelect) {
        bedSelect.innerHTML = "";
        bedSelect.removeAttribute("required");
      }
      const priceDisplayRow = document.getElementById("room-price-display-row");
      if (priceDisplayRow) priceDisplayRow.style.display = "none";
      const paymentContainer = document.getElementById("advance-payment-container");
      if (paymentContainer) paymentContainer.style.display = "none";
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("open");
  }
}

// Add New Room (Admin)
async function addRoom(event) {
  event.preventDefault();
  
  const id = document.getElementById("room-number").value.trim();
  const floor = document.getElementById("room-floor").value;
  const type = document.getElementById("room-type").value;
  const rent = parseInt(document.getElementById("room-rent").value);
  
  try {
    await apiPost("/rooms", { id, floor, type, rent });
    closeModal("modal-add-room");
    document.getElementById("form-add-room").reset();
    await showView("admin-rooms");
  } catch (err) {
    alert(err.message);
  }
}

// Toggle maintenance status (Admin)
async function toggleRoomMaintenance(roomId, toggleOn) {
  try {
    await apiPost(`/rooms/${roomId}/maintenance`, { toggleOn });
    await showView("admin-rooms");
  } catch (err) {
    alert(err.message);
  }
}

// Dynamic dropdown choices
function populateRoomAssignDropdown() {
  const select = document.getElementById("student-room-assign");
  if (!select) return;
  select.innerHTML = '<option value="none">Assign Room Later</option>';
  
  const bedSelect = document.getElementById("student-bed-assign");
  if (bedSelect) bedSelect.innerHTML = '';
  
  const bedContainer = document.getElementById("bed-assign-container");
  if (bedContainer) bedContainer.style.display = "none";
  
  state.rooms.forEach(room => {
    if (room.status !== "Maintenance") {
      let vacantBedsCount = 0;
      let totalBeds = Object.keys(room.beds).length;
      Object.keys(room.beds).forEach(b => {
        if (room.beds[b] === null) {
          vacantBedsCount++;
        }
      });
      
      if (vacantBedsCount > 0) {
        const opt = document.createElement("option");
        opt.value = room.id;
        
        let vacancyText = `${vacantBedsCount}/${totalBeds} Beds Vacant`;
        if (vacantBedsCount === totalBeds) {
          vacancyText += " - Fully Vacant";
        } else {
          vacancyText += " - Partially Vacant";
        }
        
        opt.innerText = `Room ${room.id} (${room.type} • ${vacancyText})`;
        select.appendChild(opt);
      }
    }
  });
}

function handleRoomSelectionChange() {
  const roomSelect = document.getElementById("student-room-assign");
  const bedSelect = document.getElementById("student-bed-assign");
  const bedContainer = document.getElementById("bed-assign-container");
  const priceDisplayRow = document.getElementById("room-price-display-row");
  const priceLabel = document.getElementById("lbl-room-price");
  const paymentContainer = document.getElementById("advance-payment-container");
  const paymentSelect = document.getElementById("student-advance-payment");
  
  if (!roomSelect || !bedSelect || !bedContainer) return;
  
  const roomId = roomSelect.value;
  if (roomId === "none") {
    bedContainer.style.display = "none";
    bedSelect.innerHTML = "";
    bedSelect.removeAttribute("required");
    if (priceDisplayRow) priceDisplayRow.style.display = "none";
    if (paymentContainer) paymentContainer.style.display = "none";
  } else {
    bedContainer.style.display = "block";
    bedSelect.innerHTML = '<option value="" disabled selected>-- Select a Bed --</option>';
    bedSelect.setAttribute("required", "required");
    
    const room = state.rooms.find(r => r.id === roomId);
    if (room) {
      Object.keys(room.beds).forEach(b => {
        if (room.beds[b] === null) {
          const opt = document.createElement("option");
          opt.value = b;
          opt.innerText = b;
          bedSelect.appendChild(opt);
        }
      });
      
      // Update and show room rent price in Rupees
      if (priceDisplayRow && priceLabel) {
        priceDisplayRow.style.display = "block";
        priceLabel.innerText = `₹${room.rent} / month`;
      }
      
      // Show payment status selection
      if (paymentContainer) {
        paymentContainer.style.display = "block";
        if (paymentSelect) {
          paymentSelect.value = "Cash";
        }
      }
    }
  }
}

function populateIssueFeeDropdown() {
  const select = document.getElementById("fee-student-select");
  if (!select) return;
  select.innerHTML = "";
  
  state.students.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.innerText = `${s.name} (${s.roll})`;
    select.appendChild(opt);
  });
}

// Register Student Form Action (Admin)
async function registerStudent(event) {
  event.preventDefault();
  
  const name = document.getElementById("student-name").value.trim();
  if (/\d/.test(name)) {
    alert("Student Name should not contain numbers!");
    return;
  }
  const roll = document.getElementById("student-roll").value.trim();
  const branch = document.getElementById("student-branch").value.trim();
  if (/\d/.test(branch)) {
    alert("Department/Course should not contain numbers!");
    return;
  }
  const phone = document.getElementById("student-phone").value.trim();
  const email = document.getElementById("student-email").value.trim();
  const roomAssign = document.getElementById("student-room-assign").value;
  
  let roomId = null;
  let bedLabel = null;
  let advancePayment = null;
  
  if (roomAssign !== "none") {
    roomId = roomAssign;
    bedLabel = document.getElementById("student-bed-assign").value;
    if (!bedLabel) {
      alert("Please select a vacant bed for the assigned room!");
      return;
    }
    advancePayment = document.getElementById("student-advance-payment").value;
  }
  
  try {
    const isPaid = advancePayment && advancePayment !== "Pending";
    await apiPost("/students", { name, roll, branch, phone, email, roomId, bedLabel, advancePayment });
    closeModal("modal-register-student");
    document.getElementById("form-register-student").reset();
    
    // Reset room/bed assignment display
    const roomSelect = document.getElementById("student-room-assign");
    if (roomSelect) roomSelect.value = "none";
    const bedContainer = document.getElementById("bed-assign-container");
    if (bedContainer) bedContainer.style.display = "none";
    const bedSelect = document.getElementById("student-bed-assign");
    if (bedSelect) {
      bedSelect.innerHTML = "";
      bedSelect.removeAttribute("required");
    }
    const priceDisplayRow = document.getElementById("room-price-display-row");
    if (priceDisplayRow) priceDisplayRow.style.display = "none";
    const paymentContainer = document.getElementById("advance-payment-container");
    if (paymentContainer) paymentContainer.style.display = "none";
    
    // Refresh selections & render table
    await refreshState();
    populateStudentContextSelector();
    renderStudentsTable();
    
    if (roomAssign !== "none" && !isPaid) {
      alert("Advance payment is required to allocate a room. Room assignment has been set to 'Assign Room Later' (Awaiting Bed), and a pending advance rent invoice has been generated for the resident to pay.");
    } else if (roomAssign !== "none" && isPaid) {
      alert(`Success! Resident registered and Room ${roomId} (${bedLabel}) allocated successfully. Payment recorded via ${advancePayment}.`);
    } else {
      alert("Resident registered successfully with 'Assign Room Later'.");
    }
  } catch (err) {
    alert(err.message);
  }
}

// Check out a student from a room (Admin)
async function checkoutStudent(studentId) {
  const student = state.students.find(s => s.id === studentId);
  if (!student) return;
  
  const confirmCheckout = confirm(`Are you sure you want to check out ${student.name} from Room ${student.roomId}?`);
  if (!confirmCheckout) return;
  
  try {
    await apiPost(`/students/${studentId}/checkout`);
    await refreshState();
    populateStudentContextSelector();
    renderStudentsTable();
  } catch (err) {
    alert(err.message);
  }
}

// Delete student records (Admin)
async function deleteStudent(studentId) {
  const student = state.students.find(s => s.id === studentId);
  if (!student) return;
  
  const confirmDelete = confirm(`Permanently delete records for ${student.name}?`);
  if (!confirmDelete) return;
  
  try {
    await apiDelete(`/students/${studentId}`);
    await refreshState();
    populateStudentContextSelector();
    renderStudentsTable();
  } catch (err) {
    alert(err.message);
  }
}

function openAllocateStudentModal(studentId) {
  openModal("modal-register-student");
  const student = state.students.find(s => s.id === studentId);
  if (student) {
    document.getElementById("student-name").value = student.name;
    document.getElementById("student-roll").value = student.roll;
    document.getElementById("student-branch").value = student.branch;
    document.getElementById("student-phone").value = student.phone;
    document.getElementById("student-email").value = student.email;
    
    // Reset room/bed assignment display
    const roomSelect = document.getElementById("student-room-assign");
    if (roomSelect) roomSelect.value = "none";
    const bedContainer = document.getElementById("bed-assign-container");
    if (bedContainer) bedContainer.style.display = "none";
    const bedSelect = document.getElementById("student-bed-assign");
    if (bedSelect) {
      bedSelect.innerHTML = "";
      bedSelect.removeAttribute("required");
    }

    const priceDisplayRow = document.getElementById("room-price-display-row");
    if (priceDisplayRow) priceDisplayRow.style.display = "none";
    const paymentContainer = document.getElementById("advance-payment-container");
    if (paymentContainer) paymentContainer.style.display = "none";

    // Delete original from server to save as re-allocation
    apiDelete(`/students/${studentId}`);
  }
}

// Issue Invoice (Admin)
async function issueFee(event) {
  event.preventDefault();
  
  const studentId = parseInt(document.getElementById("fee-student-select").value);
  const description = document.getElementById("fee-description").value.trim();
  const amount = parseInt(document.getElementById("fee-amount").value);
  const dueDate = document.getElementById("fee-due-date").value;
  
  try {
    await apiPost("/fees", { studentId, description, amount, dueDate });
    closeModal("modal-issue-fee");
    document.getElementById("form-issue-fee").reset();
    await showView("admin-fees");
  } catch (err) {
    alert(err.message);
  }
}

// Record Cash Settlement (Admin)
async function markFeeAsPaid(invoiceId) {
  const f = state.fees.find(fee => fee.id === invoiceId);
  if (!f) return;
  
  const confirmRecord = confirm(`Record manual cash payment of $${f.amount} for invoice ${invoiceId}?`);
  if (!confirmRecord) return;
  
  try {
    await apiPost(`/fees/${invoiceId}/pay`);
    await showView("admin-fees");
  } catch (err) {
    alert(err.message);
  }
}

// Resolution remarks Box (Admin)
function openResolveComplaintModal(ticketId) {
  const c = state.complaints.find(comp => comp.id === ticketId);
  if (!c) return;
  
  document.getElementById("resolve-complaint-id").value = ticketId;
  document.getElementById("resolve-remarks").value = c.adminComment || "";
  document.getElementById("resolve-status-select").value = c.status === "Resolved" ? "Resolved" : c.status;
  
  openModal("modal-resolve-complaint");
}

async function submitResolveComplaint(event) {
  event.preventDefault();
  
  const ticketId = document.getElementById("resolve-complaint-id").value;
  const adminComment = document.getElementById("resolve-remarks").value.trim();
  const status = document.getElementById("resolve-status-select").value;
  
  try {
    await apiPost(`/complaints/${ticketId}/resolve`, { adminComment, status });
    closeModal("modal-resolve-complaint");
    document.getElementById("form-resolve-complaint").reset();
    await refreshState();
    
    const activeSection = document.querySelector(".view-section.active-view");
    if (activeSection.id === "view-admin-dashboard") {
      renderAdminDashboard();
    } else {
      renderAdminComplaints();
    }
  } catch (err) {
    alert(err.message);
  }
}

// Daily Attendance Roll Check (Admin)
async function markAttendance(studentId, status) {
  try {
    await apiPost("/attendance", { date: activeAttendanceDate, studentId, status });
    await refreshState();
    renderAdminAttendance();
  } catch (err) {
    alert(err.message);
  }
}

// Notice Broadcast (Admin)
async function broadcastNotice(event) {
  event.preventDefault();
  
  const title = document.getElementById("notice-title").value.trim();
  const category = document.getElementById("notice-category").value;
  const message = document.getElementById("notice-body").value.trim();
  
  try {
    await apiPost("/notices", { title, category, message });
    document.getElementById("form-broadcast-notice").reset();
    await showView("admin-notifications");
    alert(`Notice: "${title}" broadcasted successfully to backend Server!`);
  } catch (err) {
    alert(err.message);
  }
}


// ================= STUDENT ACTIONS IMPLEMENTATION =================

// Submit ticket request (Student)
async function submitComplaint(event) {
  event.preventDefault();
  
  const subject = document.getElementById("complaint-subject").value.trim();
  const category = document.getElementById("complaint-category").value;
  const urgency = document.getElementById("complaint-urgency").value;
  const description = document.getElementById("complaint-description").value.trim();
  
  try {
    await apiPost("/complaints", { studentId: activeStudentId, category, urgency, subject, description });
    closeModal("modal-submit-complaint");
    document.getElementById("form-submit-complaint").reset();
    
    await showView("student-complaints");
    renderStudentDashboard();
  } catch (err) {
    alert(err.message);
  }
}

// Payment modal trigger
function openPaymentGateway(invoiceId, amount) {
  const invoice = state.fees.find(f => f.id === invoiceId);
  const student = state.students.find(s => s.id === activeStudentId);
  
  if (!invoice || !student) return;
  
  document.getElementById("checkout-invoice-id").value = invoiceId;
  document.getElementById("card-preview-amount").innerText = `₹${amount.toFixed(2)}`;
  document.getElementById("card-preview-holder").innerText = student.name;
  document.getElementById("card-holder").value = student.name;
  
  document.getElementById("card-number").value = "";
  document.getElementById("card-expiry").value = "";
  document.getElementById("card-cvv").value = "";
  document.getElementById("card-preview-number").innerText = "•••• •••• •••• ••••";
  
  document.getElementById("checkout-form-state").style.display = "block";
  document.getElementById("checkout-processing-state").style.display = "none";
  document.getElementById("checkout-success-state").style.display = "none";
  
  openModal("modal-payment-gateway");
}

function updateCardPreview() {
  const cardNumInput = document.getElementById("card-number").value;
  const cardHolderInput = document.getElementById("card-holder").value;
  
  const previewNum = document.getElementById("card-preview-number");
  const previewHolder = document.getElementById("card-preview-holder");
  
  let formattedNum = cardNumInput.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
  previewNum.innerText = formattedNum || "•••• •••• •••• ••••";
  previewHolder.innerText = cardHolderInput || "Card Holder";
}

// Mock Credit Card pay gateway authorization
async function processCheckout(event) {
  event.preventDefault();
  
  const invoiceId = document.getElementById("checkout-invoice-id").value;
  const invoice = state.fees.find(f => f.id === invoiceId);
  
  if (!invoice) return;
  
  document.getElementById("checkout-form-state").style.display = "none";
  document.getElementById("checkout-processing-state").style.display = "block";
  
  try {
    // Hold UX loading state
    setTimeout(async () => {
      await apiPost(`/fees/${invoiceId}/pay`);
      
      document.getElementById("checkout-processing-state").style.display = "none";
      document.getElementById("checkout-success-state").style.display = "block";
      document.getElementById("checkout-receipt-text").innerText = `Payment receipt of ₹${invoice.amount.toFixed(2)} generated for ID ${invoiceId}. Description: ${invoice.description}.`;
      
      await refreshState();
      renderStudentFees();
      renderStudentDashboard();
    }, 1500);
  } catch (err) {
    alert(err.message);
    document.getElementById("checkout-form-state").style.display = "block";
    document.getElementById("checkout-processing-state").style.display = "none";
  }
}

// ================= PREMIUM FEATURES: TIMELINE, SWITCHES & SPREADSHEETS =================

async function fetchAuditLogs() {
  const container = document.getElementById("admin-audit-logs");
  if (!container) return;
  
  try {
    const logs = await apiGet("/logs");
    container.innerHTML = "";
    
    if (logs.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 15px;">Audit trail is empty.</div>`;
      return;
    }
    
    logs.forEach(l => {
      const item = document.createElement("div");
      item.style.display = "flex";
      item.style.gap = "10px";
      item.style.padding = "6px 8px";
      item.style.borderRadius = "6px";
      item.style.background = "rgba(255, 255, 255, 0.01)";
      item.style.fontSize = "12px";
      item.style.alignItems = "flex-start";
      item.style.borderLeft = "2px solid var(--accent-primary)";
      
      const time = new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      item.innerHTML = `
        <span style="color: var(--accent-primary); font-weight: 600; font-family: monospace; flex-shrink: 0;">[${time}]</span>
        <span style="color: var(--text-secondary); word-break: break-word;">${l.action}</span>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    console.error("Could not fetch audit logs:", err);
  }
}

async function renderStudentSwitchStatus() {
  const switchCard = document.getElementById("student-switch-status-card");
  const switchForm = document.getElementById("form-request-room-switch");
  const switchSelect = document.getElementById("switch-target-room");
  
  if (!switchCard || !switchForm) return;
  
  const student = state.students.find(s => s.id === activeStudentId);
  if (!student) return;

  // Populate switchSelect dropdown
  if (switchSelect) {
    switchSelect.innerHTML = '<option value="" disabled selected>-- Select a Room --</option>';
    state.rooms.forEach(room => {
      if (room.status !== "Maintenance" && room.id !== student.roomId) {
        let vacantBedsCount = Object.keys(room.beds).filter(b => room.beds[b] === null).length;
        if (vacantBedsCount > 0) {
          const opt = document.createElement("option");
          opt.value = room.id;
          opt.innerText = `Room ${room.id} (${room.type} • ${vacantBedsCount} Beds Open)`;
          switchSelect.appendChild(opt);
        }
      }
    });
  }

  try {
    const requests = await apiGet(`/switches?studentId=${activeStudentId}`);
    if (requests.length === 0) {
      switchCard.style.display = "none";
      switchForm.style.display = "block";
    } else {
      const lastReq = requests[requests.length - 1];
      switchCard.style.display = "flex";
      
      let statusBadgeClass = "badge-warning";
      if (lastReq.status === "Approved") statusBadgeClass = "badge-success";
      if (lastReq.status === "Declined") statusBadgeClass = "badge-danger";
      
      switchCard.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; font-weight:600; color:#fff;">
          <span>Room Switch Status</span>
          <span class="badge ${statusBadgeClass}">${lastReq.status}</span>
        </div>
        <div style="margin-top:6px; font-size:12px; color:var(--text-secondary);">
          <div>Requested Room: <b>Room ${lastReq.requestedRoomId}</b></div>
          <div>Reason: <i>"${lastReq.reason}"</i></div>
          <div style="margin-top:4px; font-size:11px; color:var(--text-muted);">Submitted on: ${lastReq.date}</div>
        </div>
      `;
      
      if (lastReq.status === "Pending") {
        switchForm.style.display = "none";
      } else {
        switchForm.style.display = "block";
      }
    }
  } catch (err) {
    console.error("Failed to render switch status:", err);
  }
}

async function submitRoomSwitchRequest(event) {
  event.preventDefault();
  const requestedRoomId = document.getElementById("switch-target-room").value;
  const reason = document.getElementById("switch-reason").value.trim();
  
  if (!requestedRoomId || !reason) {
    alert("Please select a target room and provide a reason!");
    return;
  }
  
  try {
    await apiPost("/switches", { studentId: activeStudentId, requestedRoomId, reason });
    document.getElementById("form-request-room-switch").reset();
    alert("Room switch request submitted successfully to Warden administrative queue!");
    await refreshState();
    renderStudentSwitchStatus();
  } catch (err) {
    alert(err.message);
  }
}

async function renderWardenRoomSwitches() {
  const card = document.getElementById("card-room-switches");
  const tbody = document.getElementById("tbl-switch-requests-body");
  const countBadge = document.getElementById("lbl-switch-requests-count");
  
  if (!card || !tbody || !countBadge) return;
  
  try {
    const requests = await apiGet("/switches");
    const pendingReqs = requests.filter(r => r.status === "Pending");
    
    if (pendingReqs.length === 0) {
      card.style.display = "none";
      tbody.innerHTML = "";
      countBadge.innerText = "0 Pending";
    } else {
      card.style.display = "block";
      countBadge.innerText = `${pendingReqs.length} Pending`;
      tbody.innerHTML = "";
      
      pendingReqs.forEach(r => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><b>${r.studentName}</b></td>
          <td>Room ${r.currentRoomId} (${r.currentBedLabel})</td>
          <td><span class="badge badge-info">Room ${r.requestedRoomId}</span></td>
          <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${r.reason}"><i>"${r.reason}"</i></td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-success btn-sm" onclick="respondToRoomSwitch('${r.id}', 'Approved')">Approve</button>
              <button class="btn btn-danger btn-sm" onclick="respondToRoomSwitch('${r.id}', 'Declined')">Decline</button>
            </div>
          </td>
        `;
        tbody.appendChild(row);
      });
    }
  } catch (err) {
    console.error("Failed to load switches for Warden:", err);
  }
}

async function respondToRoomSwitch(switchId, status) {
  const confirmAction = confirm(`Are you sure you want to ${status.toLowerCase()} this room switch request?`);
  if (!confirmAction) return;
  
  try {
    await apiPost(`/switches/${switchId}/respond`, { status });
    alert(`Room switch request successfully ${status.toLowerCase()}!`);
    await refreshState();
    renderRoomsGrid();
  } catch (err) {
    alert(err.message);
  }
}

function exportStudentsToCSV() {
  if (state.students.length === 0) {
    alert("No student records available to export!");
    return;
  }
  const headers = ["Student ID", "Name", "Roll Number", "Branch/Course", "Phone", "Email", "Room ID", "Bed Space"];
  const rows = state.students.map(s => [
    s.id,
    `"${s.name}"`,
    s.roll,
    `"${s.branch}"`,
    `"${s.phone}"`,
    s.email,
    s.roomId || "Unallocated",
    s.bedLabel || "None"
  ]);
  downloadCSV("Students_Registry.csv", [headers, ...rows]);
}

function exportFeesToCSV() {
  if (state.fees.length === 0) {
    alert("No fee invoices available to export!");
    return;
  }
  const headers = ["Invoice ID", "Student Name", "Description", "Issue Date", "Due Date", "Amount (INR)", "Status"];
  const rows = state.fees.map(f => {
    const student = state.students.find(s => s.id === f.studentId);
    return [
      f.id,
      `"${student ? student.name : 'Unknown'}"`,
      `"${f.description}"`,
      f.issueDate,
      f.dueDate,
      f.amount,
      f.status
    ];
  });
  downloadCSV("Billing_Ledger.csv", [headers, ...rows]);
}

function downloadCSV(filename, array) {
  const csvContent = "\uFEFF" + array.map(e => e.join(",")).join("\n"); 
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  
  if (navigator.msSaveBlob) { 
    navigator.msSaveBlob(blob, filename);
  } else {
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

// Bind switch requests actions globally
window.submitRoomSwitchRequest = submitRoomSwitchRequest;
window.respondToRoomSwitch = respondToRoomSwitch;
window.exportStudentsToCSV = exportStudentsToCSV;
window.exportFeesToCSV = exportFeesToCSV;


