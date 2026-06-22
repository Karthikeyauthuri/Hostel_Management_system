const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'db.json');
const todayDateStr = new Date().toISOString().split('T')[0];

app.use(cors({
  origin: ['http://localhost:5000', 'http://localhost:5500', 'http://127.0.0.1:5500', 'http://127.0.0.1:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '../frontend')));

// ================= DATABASE SEED INITIALIZERS =================

const defaultRooms = [
  { _id: "101", floor: "1st", type: "Double", rent: 250, status: "Occupied", beds: { "Bed A": 1, "Bed B": null } },
  { _id: "102", floor: "1st", type: "Double", rent: 250, status: "Full", beds: { "Bed A": 2, "Bed B": 3 } },
  { _id: "103", floor: "1st", type: "Single", rent: 350, status: "Vacant", beds: { "Bed A": null } },
  { _id: "201", floor: "2nd", type: "Triple", rent: 200, status: "Vacant", beds: { "Bed A": null, "Bed B": null, "Bed C": null } },
  { _id: "202", floor: "2nd", type: "Double", rent: 250, status: "Maintenance", beds: { "Bed A": null, "Bed B": null } },
  { _id: "301", floor: "3rd", type: "Single", rent: 350, status: "Occupied", beds: { "Bed A": 5 } }
];

const defaultStudents = [
  { id: 1, roll: "H2026-001", name: "Alex Carter", branch: "Computer Science", phone: "+1 555-0101", email: "alex.c@college.edu", roomId: "101", bedLabel: "Bed A" },
  { id: 2, roll: "H2026-002", name: "Jordan Smith", branch: "Electrical Eng", phone: "+1 555-0102", email: "jordan.s@college.edu", roomId: "102", bedLabel: "Bed A" },
  { id: 3, roll: "H2026-003", name: "Taylor Vance", branch: "Mechanical Eng", phone: "+1 555-0103", email: "taylor.v@college.edu", roomId: "102", bedLabel: "Bed B" },
  { id: 4, roll: "H2026-004", name: "Casey Lin", branch: "Civil Eng", phone: "+1 555-0104", email: "casey.l@college.edu", roomId: null, bedLabel: null },
  { id: 5, roll: "H2026-005", name: "Morgan Brooks", branch: "Information Tech", phone: "+1 555-0105", email: "morgan.b@college.edu", roomId: "301", bedLabel: "Bed A" }
];

const defaultFees = [
  { id: "F1001", studentId: 1, description: "Hostel Rent - May 2026", amount: 250, dueDate: "2026-05-15", status: "Paid", issueDate: "2026-05-01" },
  { id: "F1002", studentId: 2, description: "Hostel Rent - May 2026", amount: 250, dueDate: "2026-05-15", status: "Paid", issueDate: "2026-05-01" },
  { id: "F1003", studentId: 3, description: "Hostel Rent - May 2026", amount: 250, dueDate: "2026-06-05", status: "Pending", issueDate: "2026-05-01" },
  { id: "F1004", studentId: 4, description: "Mess Charges Q2", amount: 180, dueDate: "2026-06-10", status: "Pending", issueDate: "2026-05-10" },
  { id: "F1005", studentId: 5, description: "Hostel Rent - May 2026", amount: 350, dueDate: "2026-05-15", status: "Paid", issueDate: "2026-05-01" }
];

const defaultComplaints = [
  { id: "C101", studentId: 1, category: "Internet/Wifi", urgency: "High", subject: "WiFi router is down", description: "No internet connectivity since yesterday night. Affecting online exam preparation.", status: "Pending", date: "2026-05-28", adminComment: null },
  { id: "C102", studentId: 2, category: "Plumbing", urgency: "Medium", subject: "Water leakage in tap", description: "The tap leaks constantly, making noise and wasting water.", status: "In Progress", date: "2026-05-27", adminComment: "Plumber notified, scheduled to visit." },
  { id: "C103", studentId: 3, category: "Electrical", urgency: "Low", subject: "Ceiling fan speed is slow", description: "Fan in Room 102 runs very slowly even at max speed.", status: "Resolved", date: "2026-05-25", adminComment: "Capacitor replaced. Fan checked." }
];

const defaultNotices = [
  { id: "N101", date: "2026-05-28", title: "Power Shutdown Maintenance", category: "Maintenance Alert", message: "There will be a brief power shutdown for electrical maintenance on Saturday, May 30th from 9:00 AM to 11:00 AM. Elevators will be offline during this window." },
  { id: "N102", date: "2026-05-26", title: "Revised Dinner Timings", category: "Dining", message: "Mess timings have been extended. Dinner is now served 7:30 PM - 10:00 PM starting this Friday to facilitate study sessions." }
];

const defaultAdmins = [
  { username: "admin", password: "password", name: "Hostel Warden", email: "admin@hostelnest.com" }
];

const defaultLogs = [
  { id: "L1001", action: "System initialized and ready for bookings.", timestamp: new Date(Date.now() - 4*3600000).toISOString() },
  { id: "L1002", action: "Seed data populated cleanly into collections.", timestamp: new Date(Date.now() - 3*3600000).toISOString() },
  { id: "L1003", action: "Warden Admin registered and logged in.", timestamp: new Date(Date.now() - 2*3600000).toISOString() },
  { id: "L1004", action: "Mess charges Q2 invoice generated successfully.", timestamp: new Date(Date.now() - 1*3600000).toISOString() }
];



function generateSeedAttendance() {
  const attendance = {};
  const studentIds = [1, 2, 3, 4, 5];
  const dates = [];
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    dates.push(dateStr);
  }

  dates.forEach((dateStr) => {
    attendance[dateStr] = {};
    studentIds.forEach(id => {
      let status = "Present";
      if (id === 4) status = "Absent";
      else if (Math.random() < 0.15) status = "Absent";
      attendance[dateStr][id] = status;
    });
  });
  return attendance;
}

// ================= MONGOOSE SCHEMA DEFINITIONS =================

const RoomSchema = new mongoose.Schema({
  _id: String, // Room Number, e.g. "101"
  floor: String,
  type: String,
  rent: Number,
  status: String,
  beds: mongoose.Schema.Types.Mixed // Map of Bed Label -> Student ID or null
}, { _id: false });

const StudentSchema = new mongoose.Schema({
  id: Number,
  roll: { type: String, unique: true },
  name: String,
  branch: String,
  phone: String,
  email: String,
  roomId: String,
  bedLabel: String
});

const FeeSchema = new mongoose.Schema({
  id: String,
  studentId: Number,
  description: String,
  amount: Number,
  dueDate: String,
  status: String,
  issueDate: String
});

const ComplaintSchema = new mongoose.Schema({
  id: String,
  studentId: Number,
  category: String,
  urgency: String,
  subject: String,
  description: String,
  status: String,
  date: String,
  adminComment: String
});

const NoticeSchema = new mongoose.Schema({
  id: String,
  date: String,
  title: String,
  category: String,
  message: String
});

const AttendanceSchema = new mongoose.Schema({
  date: { type: String, unique: true },
  records: mongoose.Schema.Types.Mixed // Student ID -> Status ("Present", "Absent", "Unmarked")
});

const AdminSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: { type: String },
  name: { type: String },
  email: { type: String }
});

const ActivityLogSchema = new mongoose.Schema({
  id: String,
  action: String,
  timestamp: String
});

const RoomSwitchSchema = new mongoose.Schema({
  id: String,
  studentId: Number,
  studentName: String,
  currentRoomId: String,
  currentBedLabel: String,
  requestedRoomId: String,
  requestedBedLabel: String,
  reason: String,
  status: String,
  date: String
});

const Room = mongoose.model('Room', RoomSchema);
const Student = mongoose.model('Student', StudentSchema);
const Fee = mongoose.model('Fee', FeeSchema);
const Complaint = mongoose.model('Complaint', ComplaintSchema);
const Notice = mongoose.model('Notice', NoticeSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);
const Admin = mongoose.model('Admin', AdminSchema);
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);
const RoomSwitch = mongoose.model('RoomSwitch', RoomSwitchSchema);

// ================= DB DRIVER FLAG & MONGO CONNECT =================

let useMongo = false;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/hostelnest_db";

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 })
  .then(async () => {
    console.log("Connected to MongoDB successfully!");
    useMongo = true;
    await seedMongoDatabase();
  })
  .catch((err) => {
    console.warn("MongoDB connection failed. Falling back to local file db.json database.", err.message);
    useMongo = false;
    readLocalDb();
  });

// ================= FILE DATABASE DRIVER (FALLBACK MODE) =================

let localState = {
  rooms: [],
  students: [],
  fees: [],
  complaints: [],
  notices: [],
  attendance: {},
  admins: [],
  logs: [],
  switches: []
};

function readLocalDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      localState = {
        rooms: defaultRooms.map(r => ({ ...r, id: r._id })), // map _id to id for local consistency
        students: defaultStudents,
        fees: defaultFees,
        complaints: defaultComplaints,
        notices: defaultNotices,
        attendance: generateSeedAttendance(),
        admins: defaultAdmins,
        logs: defaultLogs,
        switches: []
      };
      writeLocalDb();
    } else {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      localState = JSON.parse(content);
      // Ensure admins array exists
      if (!localState.admins) {
        localState.admins = [...defaultAdmins];
      }
      if (!localState.logs) {
        localState.logs = [...defaultLogs];
      }
      if (!localState.switches) {
        localState.switches = [];
      }
      writeLocalDb();
    }
  } catch (err) {
    console.error("Error reading db.json database file:", err);
  }
}

function writeLocalDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(localState, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error writing db.json database file:", err);
  }
}

// ================= MONGODB SEEDING (AUTHENTIC DATA SET) =================

async function seedMongoDatabase() {
  try {
    const roomCount = await Room.countDocuments();
    if (roomCount === 0) {
      await Room.insertMany(defaultRooms);
      await Student.insertMany(defaultStudents);
      await Fee.insertMany(defaultFees);
      await Complaint.insertMany(defaultComplaints);
      await Notice.insertMany(defaultNotices);
      await Admin.insertMany(defaultAdmins);
      await ActivityLog.insertMany(defaultLogs);
      
      const seedAtt = generateSeedAttendance();
      const attData = Object.keys(seedAtt).map(d => ({
        date: d,
        records: seedAtt[d]
      }));
      await Attendance.insertMany(attData);
      console.log("Seeded default hostel records to MongoDB collections successfully.");
    } else {
      // Ensure default admin exists even if seeded earlier
      const adminExists = await Admin.findOne({ username: "admin" });
      if (!adminExists) {
        await Admin.insertMany(defaultAdmins);
      }
      const logExists = await ActivityLog.countDocuments();
      if (logExists === 0) {
        await ActivityLog.insertMany(defaultLogs);
      }
    }
    
    // Auto insert today's unmarked attendance record in Mongo
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAtt = await Attendance.findOne({ date: todayStr });
    if (!todayAtt) {
      const students = await Student.find();
      const records = {};
      students.forEach(s => { records[s.id] = "Unmarked"; });
      await Attendance.create({ date: todayStr, records });
    }
  } catch (err) {
    console.error("Failed to seed MongoDB collections:", err);
  }
}

// ================= DYNAMIC ROUTE HANDLERS =================

// Helper to format rooms depending on DB source
function formatRooms(rooms) {
  return rooms.map(r => {
    const obj = r.toObject ? r.toObject() : r;
    return {
      id: obj._id || obj.id,
      floor: obj.floor,
      type: obj.type,
      rent: obj.rent,
      status: obj.status,
      beds: obj.beds
    };
  });
}

// Helper to log activities globally
async function logActivity(actionText) {
  const timestamp = new Date().toISOString();
  try {
    if (useMongo) {
      const logs = await ActivityLog.find();
      const nextId = "L" + (logs.length > 0 ? Math.max(...logs.map(l => parseInt(l.id.substring(1)))) + 1 : 1001);
      await ActivityLog.create({ id: nextId, action: actionText, timestamp });
    } else {
      const nextId = "L" + (localState.logs.length > 0 ? Math.max(...localState.logs.map(l => parseInt(l.id.substring(1)))) + 1 : 1001);
      localState.logs.push({ id: nextId, action: actionText, timestamp });
      writeLocalDb();
    }
  } catch (err) {
    console.error("Failed to log activity:", err.message);
  }
}

// 0. ADMIN AUTH APIs
app.post('/api/admins/register', async (req, res) => {
  const { username, password, name, email } = req.body;
  if (!username || !password || !name || !email) {
    return res.status(400).json({ error: "Missing required admin properties." });
  }
  if (/\d/.test(name)) {
    return res.status(400).json({ error: "Name should not contain numbers." });
  }

  try {
    if (useMongo) {
      const exists = await Admin.findOne({ username: username.toLowerCase() });
      if (exists) {
        return res.status(400).json({ error: `Username ${username} is already taken.` });
      }
      const newAdmin = await Admin.create({
        username: username.toLowerCase(),
        password,
        name,
        email
      });
      res.status(201).json({ message: "Admin registered successfully", admin: { username: newAdmin.username, name: newAdmin.name } });
    } else {
      const exists = localState.admins.some(a => a.username.toLowerCase() === username.toLowerCase());
      if (exists) {
        return res.status(400).json({ error: `Username ${username} is already taken.` });
      }
      const newAdmin = { username: username.toLowerCase(), password, name, email };
      localState.admins.push(newAdmin);
      writeLocalDb();
      res.status(201).json({ message: "Admin registered successfully", admin: { username: newAdmin.username, name: newAdmin.name } });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admins/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  try {
    if (useMongo) {
      const admin = await Admin.findOne({ username: username.toLowerCase(), password });
      if (!admin) {
        return res.status(400).json({ error: "Invalid warden credentials." });
      }
      res.json({ message: "Logged in successfully", admin: { username: admin.username, name: admin.name, email: admin.email } });
    } else {
      const admin = localState.admins.find(a => a.username.toLowerCase() === username.toLowerCase() && a.password === password);
      if (!admin) {
        return res.status(400).json({ error: "Invalid warden credentials." });
      }
      res.json({ message: "Logged in successfully", admin: { username: admin.username, name: admin.name, email: admin.email } });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// 1. ROOMS APIs
app.get('/api/rooms', async (req, res) => {
  try {
    if (useMongo) {
      const rooms = await Room.find();
      res.json(formatRooms(rooms));
    } else {
      res.json(localState.rooms);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rooms', async (req, res) => {
  const { id, floor, type, rent } = req.body;
  if (!id || !floor || !type || !rent) {
    return res.status(400).json({ error: "Missing required properties." });
  }

  let bedsCount = 1;
  if (type === "Double") bedsCount = 2;
  if (type === "Triple") bedsCount = 3;
  
  const beds = {};
  for(let i=0; i<bedsCount; i++) {
    const char = String.fromCharCode(65 + i);
    beds[`Bed ${char}`] = null;
  }

  try {
    if (useMongo) {
      const exists = await Room.findById(id);
      if (exists) return res.status(400).json({ error: `Room ${id} already exists.` });

      const newRoom = await Room.create({
        _id: id,
        floor,
        type,
        rent: parseInt(rent),
        status: "Vacant",
        beds
      });
      res.status(201).json(formatRooms([newRoom])[0]);
    } else {
      if (localState.rooms.some(r => r.id === id)) {
        return res.status(400).json({ error: `Room ${id} already exists.` });
      }
      const newRoom = { id, floor, type, rent: parseInt(rent), status: "Vacant", beds };
      localState.rooms.push(newRoom);
      writeLocalDb();
      res.status(201).json(newRoom);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rooms/:id/maintenance', async (req, res) => {
  const roomId = req.params.id;
  const { toggleOn } = req.body;
  
  try {
    if (useMongo) {
      const room = await Room.findById(roomId);
      if (!room) return res.status(404).json({ error: "Room not found." });
      
      if (toggleOn) {
        // Checkout students
        const bedKeys = Object.keys(room.beds);
        for(let key of bedKeys) {
          const studId = room.beds[key];
          if (studId) {
            await Student.updateOne({ id: studId }, { roomId: null, bedLabel: null });
          }
          room.beds[key] = null;
        }
        room.status = "Maintenance";
      } else {
        const occupied = Object.values(room.beds).some(v => v !== null);
        room.status = occupied ? "Occupied" : "Vacant";
      }
      room.markModified('beds');
      await room.save();
      res.json({ message: "Maintenance state updated", room: formatRooms([room])[0] });
    } else {
      const room = localState.rooms.find(r => r.id === roomId);
      if (!room) return res.status(404).json({ error: "Room not found." });
      
      if (toggleOn) {
        Object.keys(room.beds).forEach(k => {
          const studId = room.beds[k];
          if (studId) {
            const student = localState.students.find(s => s.id === studId);
            if (student) {
              student.roomId = null;
              student.bedLabel = null;
            }
          }
          room.beds[k] = null;
        });
        room.status = "Maintenance";
      } else {
        const occupied = Object.values(room.beds).some(v => v !== null);
        room.status = occupied ? "Occupied" : "Vacant";
      }
      writeLocalDb();
      res.json({ message: "Maintenance state updated", room });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. STUDENTS APIs
app.get('/api/students', async (req, res) => {
  try {
    if (useMongo) {
      const students = await Student.find();
      res.json(students);
    } else {
      res.json(localState.students);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students', async (req, res) => {
  const { name, roll, branch, phone, email, roomId, bedLabel, advancePayment } = req.body;
  if (!name || !roll || !branch || !phone || !email) {
    return res.status(400).json({ error: "Missing required properties." });
  }
  if (/\d/.test(name)) {
    return res.status(400).json({ error: "Name should not contain numbers." });
  }
  if (/\d/.test(branch)) {
    return res.status(400).json({ error: "Department/Course should not contain numbers." });
  }

  try {
    if (useMongo) {
      const exists = await Student.findOne({ roll });
      if (exists) return res.status(400).json({ error: `Roll number ${roll} already registered.` });
      
      const maxStud = await Student.findOne().sort({ id: -1 });
      const nextId = maxStud ? maxStud.id + 1 : 1;
      
      const student = new Student({
        id: nextId,
        name,
        roll,
        branch,
        phone,
        email,
        roomId: null,
        bedLabel: null
      });

      if (roomId && bedLabel) {
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ error: "Room not found." });
        
        const rentAmount = room.rent || 250;
        const allFees = await Fee.find();
        const nextInvoiceId = "F" + (allFees.length > 0 ? Math.max(...allFees.map(f => parseInt(f.id.substring(1)))) + 1 : 1001);
        
        const isPaid = advancePayment && advancePayment !== "Pending";
        const feeStatus = isPaid ? "Paid" : "Pending";
        
        await Fee.create({
          id: nextInvoiceId,
          studentId: nextId,
          description: `Advance Rent - Room ${roomId}`,
          amount: rentAmount,
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: feeStatus,
          issueDate: todayDateStr
        });
        
        const notices = await Notice.find();
        const nextNoticeId = "N" + (notices.length > 0 ? Math.max(...notices.map(n => parseInt(n.id.substring(1)))) + 1 : 101);
        await Notice.create({
          id: nextNoticeId,
          date: todayDateStr,
          title: isPaid ? `Advance Paid: Room ${roomId}` : `New Invoice Issued: Advance Rent - Room ${roomId}`,
          category: "Maintenance Alert",
          message: isPaid 
            ? `Dear ${name}, advance rent payment of ₹${rentAmount} has been recorded successfully via ${advancePayment}. Room ${roomId} (${bedLabel}) is assigned to you.`
            : `Dear ${name}, an advance rent invoice of ₹${rentAmount} for Room ${roomId} is pending. Please clear it to confirm allocation.`
        });

        if (isPaid) {
          if (!room.beds) room.beds = {};
          room.beds[bedLabel] = nextId;
          room.markModified('beds');
          
          let total = Object.keys(room.beds).length;
          let filled = Object.values(room.beds).filter(v => v !== null).length;
          room.status = (filled === total) ? "Full" : "Occupied";
          await room.save();
          
          student.roomId = roomId;
          student.bedLabel = bedLabel;
        }
      }

      await student.save();
      
      // Update today's attendance logs
      const todayStr = new Date().toISOString().split('T')[0];
      const todayAtt = await Attendance.findOne({ date: todayStr });
      if (todayAtt) {
        if (!todayAtt.records) todayAtt.records = {};
        todayAtt.records[nextId] = "Unmarked";
        todayAtt.markModified('records');
        await todayAtt.save();
      }

      res.status(201).json(student);
    } else {
      if (localState.students.some(s => s.roll.toLowerCase() === roll.toLowerCase())) {
        return res.status(400).json({ error: `Roll number ${roll} already registered.` });
      }
      
      const nextId = localState.students.length > 0 ? Math.max(...localState.students.map(s => s.id)) + 1 : 1;
      
      let rentAmount = 250;
      let isPaid = advancePayment && advancePayment !== "Pending";
      let feeStatus = isPaid ? "Paid" : "Pending";
      let assignedRoomId = null;
      let assignedBedLabel = null;

      if (roomId && bedLabel) {
        const room = localState.rooms.find(r => r.id === roomId);
        if (room) {
          rentAmount = room.rent || 250;
          
          const nextInvoiceId = "F" + (localState.fees.length > 0 ? Math.max(...localState.fees.map(f => parseInt(f.id.substring(1)))) + 1 : 1001);
          const newInvoice = {
            id: nextInvoiceId,
            studentId: nextId,
            description: `Advance Rent - Room ${roomId}`,
            amount: rentAmount,
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: feeStatus,
            issueDate: todayDateStr
          };
          localState.fees.push(newInvoice);

          const nextNoticeId = "N" + (localState.notices.length > 0 ? Math.max(...localState.notices.map(n => parseInt(n.id.substring(1)))) + 1 : 101);
          localState.notices.push({
            id: nextNoticeId,
            date: todayDateStr,
            title: isPaid ? `Advance Paid: Room ${roomId}` : `New Invoice Issued: Advance Rent - Room ${roomId}`,
            category: "Maintenance Alert",
            message: isPaid 
              ? `Dear ${name}, advance rent payment of ₹${rentAmount} has been recorded successfully via ${advancePayment}. Room ${roomId} (${bedLabel}) is assigned to you.`
              : `Dear ${name}, an advance rent invoice of ₹${rentAmount} for Room ${roomId} is pending. Please clear it to confirm allocation.`
          });

          if (isPaid) {
            if (!room.beds) room.beds = {};
            room.beds[bedLabel] = nextId;
            let total = Object.keys(room.beds).length;
            let filled = Object.values(room.beds).filter(v => v !== null).length;
            room.status = (filled === total) ? "Full" : "Occupied";
            
            assignedRoomId = roomId;
            assignedBedLabel = bedLabel;
          }
        }
      }

      const student = { id: nextId, name, roll, branch, phone, email, roomId: assignedRoomId, bedLabel: assignedBedLabel };
      localState.students.push(student);
      
      const todayStr = new Date().toISOString().split('T')[0];
      if (localState.attendance[todayStr]) {
        localState.attendance[todayStr][nextId] = "Unmarked";
      }
      
      writeLocalDb();
      res.status(201).json(student);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students/:id/checkout', async (req, res) => {
  const studentId = parseInt(req.params.id);
  
  try {
    if (useMongo) {
      const student = await Student.findOne({ id: studentId });
      if (!student) return res.status(404).json({ error: "Student not found." });
      
      if (student.roomId) {
        const room = await Room.findById(student.roomId);
        if (room) {
          room.beds[student.bedLabel] = null;
          room.markModified('beds');
          
          let filled = Object.values(room.beds).filter(v => v !== null).length;
          room.status = (filled === 0) ? "Vacant" : "Occupied";
          await room.save();
        }
        student.roomId = null;
        student.bedLabel = null;
        await student.save();
      }
      res.json({ message: "Student checked out", student });
    } else {
      const student = localState.students.find(s => s.id === studentId);
      if (!student) return res.status(404).json({ error: "Student not found." });
      
      if (student.roomId) {
        const room = localState.rooms.find(r => r.id === student.roomId);
        if (room) {
          room.beds[student.bedLabel] = null;
          let filled = Object.values(room.beds).filter(v => v !== null).length;
          room.status = (filled === 0) ? "Vacant" : "Occupied";
        }
        student.roomId = null;
        student.bedLabel = null;
      }
      writeLocalDb();
      res.json({ message: "Student checked out", student });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  const studentId = parseInt(req.params.id);
  
  try {
    if (useMongo) {
      const student = await Student.findOne({ id: studentId });
      if (!student) return res.status(404).json({ error: "Student not found." });
      
      if (student.roomId) {
        const room = await Room.findById(student.roomId);
        if (room) {
          room.beds[student.bedLabel] = null;
          room.markModified('beds');
          let filled = Object.values(room.beds).filter(v => v !== null).length;
          room.status = (filled === 0) ? "Vacant" : "Occupied";
          await room.save();
        }
      }

      await Student.deleteOne({ id: studentId });
      await Fee.deleteMany({ studentId });
      await Complaint.deleteMany({ studentId });
      
      const attendanceRecords = await Attendance.find();
      for(let doc of attendanceRecords) {
        if (doc.records && doc.records[studentId]) {
          delete doc.records[studentId];
          doc.markModified('records');
          await doc.save();
        }
      }

      res.json({ message: "Student records deleted." });
    } else {
      const student = localState.students.find(s => s.id === studentId);
      if (!student) return res.status(404).json({ error: "Student not found." });
      
      if (student.roomId) {
        const room = localState.rooms.find(r => r.id === student.roomId);
        if (room) {
          room.beds[student.bedLabel] = null;
          let filled = Object.values(room.beds).filter(v => v !== null).length;
          room.status = (filled === 0) ? "Vacant" : "Occupied";
        }
      }

      localState.students = localState.students.filter(s => s.id !== studentId);
      localState.fees = localState.fees.filter(f => f.studentId !== studentId);
      localState.complaints = localState.complaints.filter(c => c.studentId !== studentId);
      
      Object.keys(localState.attendance).forEach(d => {
        delete localState.attendance[d][studentId];
      });

      writeLocalDb();
      res.json({ message: "Student records deleted." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. FEES APIs
app.get('/api/fees', async (req, res) => {
  try {
    if (useMongo) {
      const fees = await Fee.find();
      res.json(fees);
    } else {
      res.json(localState.fees);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fees', async (req, res) => {
  const { studentId, description, amount, dueDate } = req.body;
  if (!studentId || !description || !amount || !dueDate) {
    return res.status(400).json({ error: "Missing required properties." });
  }

  try {
    if (useMongo) {
      const allFees = await Fee.find();
      const nextInvoiceId = "F" + (allFees.length > 0 ? Math.max(...allFees.map(f => parseInt(f.id.substring(1)))) + 1 : 1001);
      
      const newInvoice = await Fee.create({
        id: nextInvoiceId,
        studentId: parseInt(studentId),
        description,
        amount: parseInt(amount),
        dueDate,
        status: "Pending",
        issueDate: todayDateStr
      });

      // Insert billing notice
      const student = await Student.findOne({ id: parseInt(studentId) });
      if (student) {
        const notices = await Notice.find();
        const nextNoticeId = "N" + (notices.length > 0 ? Math.max(...notices.map(n => parseInt(n.id.substring(1)))) + 1 : 101);
        await Notice.create({
          id: nextNoticeId,
          date: todayDateStr,
          title: `New Invoice Issued: ${description}`,
          category: "Maintenance Alert",
          message: `Dear ${student.name}, an invoice dues of ₹${amount} has been billed to your account. Clear it by ${dueDate}.`
        });
      }

      res.status(201).json(newInvoice);
    } else {
      const nextInvoiceId = "F" + (localState.fees.length > 0 ? Math.max(...localState.fees.map(f => parseInt(f.id.substring(1)))) + 1 : 1001);
      const newInvoice = {
        id: nextInvoiceId,
        studentId: parseInt(studentId),
        description,
        amount: parseInt(amount),
        dueDate,
        status: "Pending",
        issueDate: todayDateStr
      };
      
      localState.fees.push(newInvoice);
      
      const student = localState.students.find(s => s.id === parseInt(studentId));
      if (student) {
        const nextNoticeId = "N" + (localState.notices.length > 0 ? Math.max(...localState.notices.map(n => parseInt(n.id.substring(1)))) + 1 : 101);
        localState.notices.push({
          id: nextNoticeId,
          date: todayDateStr,
          title: `New Invoice Issued: ${description}`,
          category: "Maintenance Alert",
          message: `Dear ${student.name}, an invoice dues of ₹${amount} has been billed to your account. Clear it by ${dueDate}.`
        });
      }

      writeLocalDb();
      res.status(201).json(newInvoice);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fees/:id/pay', async (req, res) => {
  const invoiceId = req.params.id;
  try {
    if (useMongo) {
      const invoice = await Fee.findOne({ id: invoiceId });
      if (!invoice) return res.status(404).json({ error: "Invoice not found." });
      invoice.status = "Paid";
      await invoice.save();
      res.json({ message: "Invoice paid", invoice });
    } else {
      const invoice = localState.fees.find(f => f.id === invoiceId);
      if (!invoice) return res.status(404).json({ error: "Invoice not found." });
      invoice.status = "Paid";
      writeLocalDb();
      res.json({ message: "Invoice paid", invoice });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. COMPLAINTS APIs
app.get('/api/complaints', async (req, res) => {
  try {
    if (useMongo) {
      const complaints = await Complaint.find();
      res.json(complaints);
    } else {
      res.json(localState.complaints);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/complaints', async (req, res) => {
  const { studentId, category, urgency, subject, description } = req.body;
  if (!studentId || !category || !urgency || !subject || !description) {
    return res.status(400).json({ error: "Missing required properties." });
  }

  try {
    if (useMongo) {
      const complaints = await Complaint.find();
      const nextTicketId = "C" + (complaints.length > 0 ? Math.max(...complaints.map(c => parseInt(c.id.substring(1)))) + 1 : 101);
      
      const newTicket = await Complaint.create({
        id: nextTicketId,
        studentId: parseInt(studentId),
        category,
        urgency,
        subject,
        description,
        status: "Pending",
        date: todayDateStr,
        adminComment: null
      });
      res.status(201).json(newTicket);
    } else {
      const nextTicketId = "C" + (localState.complaints.length > 0 ? Math.max(...localState.complaints.map(c => parseInt(c.id.substring(1)))) + 1 : 101);
      const newTicket = {
        id: nextTicketId,
        studentId: parseInt(studentId),
        category,
        urgency,
        subject,
        description,
        status: "Pending",
        date: todayDateStr,
        adminComment: null
      };
      localState.complaints.push(newTicket);
      writeLocalDb();
      res.status(201).json(newTicket);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/complaints/:id/resolve', async (req, res) => {
  const ticketId = req.params.id;
  const { adminComment, status } = req.body;
  if (!status) return res.status(400).json({ error: "Status code is required." });

  try {
    if (useMongo) {
      const complaint = await Complaint.findOne({ id: ticketId });
      if (!complaint) return res.status(404).json({ error: "Ticket not found." });
      
      complaint.adminComment = adminComment || null;
      complaint.status = status;
      await complaint.save();
      res.json({ message: "Ticket resolution updated", complaint });
    } else {
      const complaint = localState.complaints.find(c => c.id === ticketId);
      if (!complaint) return res.status(404).json({ error: "Ticket not found." });
      
      complaint.adminComment = adminComment || null;
      complaint.status = status;
      writeLocalDb();
      res.json({ message: "Ticket resolution updated", complaint });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. NOTICES APIs
app.get('/api/notices', async (req, res) => {
  try {
    if (useMongo) {
      const notices = await Notice.find();
      res.json(notices);
    } else {
      res.json(localState.notices);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notices', async (req, res) => {
  const { title, category, message } = req.body;
  if (!title || !category || !message) {
    return res.status(400).json({ error: "Missing required properties." });
  }

  try {
    if (useMongo) {
      const notices = await Notice.find();
      const nextNoticeId = "N" + (notices.length > 0 ? Math.max(...notices.map(n => parseInt(n.id.substring(1)))) + 1 : 101);
      
      const newNotice = await Notice.create({
        id: nextNoticeId,
        date: todayDateStr,
        title,
        category,
        message
      });
      res.status(201).json(newNotice);
    } else {
      const nextNoticeId = "N" + (localState.notices.length > 0 ? Math.max(...localState.notices.map(n => parseInt(n.id.substring(1)))) + 1 : 101);
      const newNotice = {
        id: nextNoticeId,
        date: todayDateStr,
        title,
        category,
        message
      };
      localState.notices.push(newNotice);
      writeLocalDb();
      res.status(201).json(newNotice);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. ATTENDANCE APIs
app.get('/api/attendance', async (req, res) => {
  try {
    if (useMongo) {
      const attendanceList = await Attendance.find();
      const map = {};
      attendanceList.forEach(doc => {
        map[doc.date] = doc.records;
      });
      res.json(map);
    } else {
      res.json(localState.attendance);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance', async (req, res) => {
  const { date, studentId, status } = req.body;
  if (!date || !studentId || !status) {
    return res.status(400).json({ error: "Missing date, studentId or status." });
  }

  try {
    if (useMongo) {
      let att = await Attendance.findOne({ date });
      if (!att) {
        att = new Attendance({ date, records: {} });
      }
      if (!att.records) att.records = {};
      
      att.records[studentId] = status;
      att.markModified('records');
      await att.save();
      res.json({ message: "Attendance updated in MongoDB", date, studentId, status });
    } else {
      if (!localState.attendance[date]) {
        localState.attendance[date] = {};
      }
      localState.attendance[date][studentId] = status;
      writeLocalDb();
      res.json({ message: "Attendance updated locally", date, studentId, status });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. TIMELINE AUDIT LOGS APIs
app.get('/api/logs', async (req, res) => {
  try {
    if (useMongo) {
      const logs = await ActivityLog.find().sort({ timestamp: -1 }).limit(15);
      res.json(logs);
    } else {
      const logs = localState.logs.slice().sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 15);
      res.json(logs);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. ROOM SWITCH WORKFLOW APIs
app.get('/api/switches', async (req, res) => {
  const { studentId } = req.query;
  try {
    if (useMongo) {
      const filter = studentId ? { studentId: parseInt(studentId) } : {};
      const requests = await RoomSwitch.find(filter);
      res.json(requests);
    } else {
      let requests = localState.switches || [];
      if (studentId) {
        requests = requests.filter(r => r.studentId === parseInt(studentId));
      }
      res.json(requests);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/switches', async (req, res) => {
  const { studentId, requestedRoomId, requestedBedLabel, reason } = req.body;
  if (!studentId || !requestedRoomId || !reason) {
    return res.status(400).json({ error: "Missing studentId, requestedRoomId or reason." });
  }
  
  try {
    let student, room;
    if (useMongo) {
      student = await Student.findOne({ id: parseInt(studentId) });
      if (!student) return res.status(404).json({ error: "Student not found." });
      
      room = await Room.findById(requestedRoomId);
      if (!room) return res.status(404).json({ error: "Requested room not found." });
      
      const switches = await RoomSwitch.find();
      const nextId = "S" + (switches.length > 0 ? Math.max(...switches.map(s => parseInt(s.id.substring(1)))) + 1 : 101);
      
      const newRequest = await RoomSwitch.create({
        id: nextId,
        studentId: parseInt(studentId),
        studentName: student.name,
        currentRoomId: student.roomId || "None",
        currentBedLabel: student.bedLabel || "None",
        requestedRoomId,
        requestedBedLabel: requestedBedLabel || "Any Bed",
        reason,
        status: "Pending",
        date: todayDateStr
      });
      
      await logActivity(`Room switch request submitted by ${student.name} for Room ${requestedRoomId}`);
      res.status(201).json(newRequest);
    } else {
      student = localState.students.find(s => s.id === parseInt(studentId));
      if (!student) return res.status(404).json({ error: "Student not found." });
      
      room = localState.rooms.find(r => r.id === requestedRoomId);
      if (!room) return res.status(404).json({ error: "Requested room not found." });
      
      const nextId = "S" + (localState.switches.length > 0 ? Math.max(...localState.switches.map(s => parseInt(s.id.substring(1)))) + 1 : 101);
      const newRequest = {
        id: nextId,
        studentId: parseInt(studentId),
        studentName: student.name,
        currentRoomId: student.roomId || "None",
        currentBedLabel: student.bedLabel || "None",
        requestedRoomId,
        requestedBedLabel: requestedBedLabel || "Any Bed",
        reason,
        status: "Pending",
        date: todayDateStr
      };
      localState.switches.push(newRequest);
      await logActivity(`Room switch request submitted by ${student.name} for Room ${requestedRoomId}`);
      writeLocalDb();
      res.status(201).json(newRequest);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/switches/:id/respond', async (req, res) => {
  const switchId = req.params.id;
  const { status } = req.body;
  
  if (!status) return res.status(400).json({ error: "Status mode is required." });
  
  try {
    if (useMongo) {
      const request = await RoomSwitch.findOne({ id: switchId });
      if (!request) return res.status(404).json({ error: "Room switch request not found." });
      
      request.status = status;
      await request.save();
      
      if (status === "Approved") {
        const student = await Student.findOne({ id: request.studentId });
        if (student) {
          if (student.roomId) {
            const oldRoom = await Room.findById(student.roomId);
            if (oldRoom && oldRoom.beds) {
              oldRoom.beds[student.bedLabel] = null;
              oldRoom.markModified('beds');
              let filled = Object.values(oldRoom.beds).filter(v => v !== null).length;
              oldRoom.status = (filled === 0) ? "Vacant" : "Occupied";
              await oldRoom.save();
            }
          }
          
          const requestedRoom = await Room.findById(request.requestedRoomId);
          if (requestedRoom) {
            if (!requestedRoom.beds) requestedRoom.beds = {};
            let allocatedBed = null;
            
            if (request.requestedBedLabel && request.requestedBedLabel !== "Any Bed" && requestedRoom.beds[request.requestedBedLabel] === null) {
              allocatedBed = request.requestedBedLabel;
            } else {
              allocatedBed = Object.keys(requestedRoom.beds).find(k => requestedRoom.beds[k] === null);
            }
            
            if (allocatedBed) {
              requestedRoom.beds[allocatedBed] = student.id;
              requestedRoom.markModified('beds');
              let total = Object.keys(requestedRoom.beds).length;
              let filled = Object.values(requestedRoom.beds).filter(v => v !== null).length;
              requestedRoom.status = (filled === total) ? "Full" : "Occupied";
              await requestedRoom.save();
              
              student.roomId = request.requestedRoomId;
              student.bedLabel = allocatedBed;
              await student.save();
              
              await logActivity(`Room switch APPROVED: ${student.name} moved to Room ${student.roomId} (${student.bedLabel})`);
            } else {
              request.status = "Declined";
              await request.save();
              return res.status(400).json({ error: "No vacant bed spaces available in requested room." });
            }
          }
        }
      } else {
        await logActivity(`Room switch DECLINED: Request ${switchId} for student ID ${request.studentId}`);
      }
      
      res.json({ message: "Room switch status updated", request });
    } else {
      const request = localState.switches.find(r => r.id === switchId);
      if (!request) return res.status(404).json({ error: "Room switch request not found." });
      
      request.status = status;
      
      if (status === "Approved") {
        const student = localState.students.find(s => s.id === request.studentId);
        if (student) {
          if (student.roomId) {
            const oldRoom = localState.rooms.find(r => r.id === student.roomId);
            if (oldRoom && oldRoom.beds) {
              oldRoom.beds[student.bedLabel] = null;
              let filled = Object.values(oldRoom.beds).filter(v => v !== null).length;
              oldRoom.status = (filled === 0) ? "Vacant" : "Occupied";
            }
          }
          
          const requestedRoom = localState.rooms.find(r => r.id === request.requestedRoomId);
          if (requestedRoom) {
            if (!requestedRoom.beds) requestedRoom.beds = {};
            let allocatedBed = null;
            
            if (request.requestedBedLabel && request.requestedBedLabel !== "Any Bed" && requestedRoom.beds[request.requestedBedLabel] === null) {
              allocatedBed = request.requestedBedLabel;
            } else {
              allocatedBed = Object.keys(requestedRoom.beds).find(k => requestedRoom.beds[k] === null);
            }
            
            if (allocatedBed) {
              requestedRoom.beds[allocatedBed] = student.id;
              let total = Object.keys(requestedRoom.beds).length;
              let filled = Object.values(requestedRoom.beds).filter(v => v !== null).length;
              requestedRoom.status = (filled === total) ? "Full" : "Occupied";
              
              student.roomId = request.requestedRoomId;
              student.bedLabel = allocatedBed;
              
              await logActivity(`Room switch APPROVED: ${student.name} moved to Room ${student.roomId} (${student.bedLabel})`);
            } else {
              request.status = "Declined";
              writeLocalDb();
              return res.status(400).json({ error: "No vacant bed spaces available in requested room." });
            }
          }
        }
      } else {
        await logActivity(`Room switch DECLINED: Request ${switchId} for student ID ${request.studentId}`);
      }
      
      writeLocalDb();
      res.json({ message: "Room switch status updated", request });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server listening
app.listen(PORT, () => {
  console.log(`HostelNest Express MongoDB Backend running on port ${PORT}`);
});
