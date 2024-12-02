const express = require("express");
const mongoose = require("mongoose");
const Task = require("./models/task.model.js");
require("dotenv").config();
const authenticate = require("./middleware/authenticate.js"); // JWT middleware
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cors = require("cors");
const User = require("./models/user.model.js");
const taskApp = require("./routes/taskRoutes.js");

const dotenv = require("dotenv");

const app = express();
const cors = require('cors');

app.use(cors({
    origin: 'https://task-master-azubike-onyinyes-projects.vercel.app', // Replace with your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // List allowed methods
    credentials: true // If you need cookies/auth headers
}));

app.use(bodyParser.json());

// Middleware
app.use(express.json());

//  taskroutes

// Get tasks for the logged-in user
app.get("https://task-master-l39serbac-azubike-onyinyes-projects.vercel.app/api/tasks", authenticate, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id });
    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Failed to fetch tasks." });
  }
});

// Create a new task
app.post("https://task-master-l39serbac-azubike-onyinyes-projects.vercel.app/api/tasks", authenticate, async (req, res) => {
  const { title, description, priority, date } = req.body;
  console.log(req.body);

  try {
    const task = new Task({
      title,
      description,
      priority,
      date,
      userId: req.user.id,
    });

    await task.save();
    res.status(200).json({ message: "Task created successfully.", task });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ message: "Failed to create task." });
  }
});

// Delete a task
app.delete("https://task-master-l39serbac-azubike-onyinyes-projects.vercel.app/api/tasks/:id", authenticate, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!task) return res.status(404).json({ message: "Task not found." });

    res.status(200).json({ message: "Task deleted successfully." });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ message: "Failed to delete task." });
  }
});

// Update a task
app.put("https://task-master-l39serbac-azubike-onyinyes-projects.vercel.app/api/tasks/:id", async (req, res) => {
  try {
    const taskId = req.params.id;
    const updatedData = req.body; // data sent by client

    // Find the task and update it
    const task = await Task.findByIdAndUpdate(taskId, updatedData, {
      new: true,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task updated successfully", task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating task" });
  }
});

app.use("https://task-master-l39serbac-azubike-onyinyes-projects.vercel.app/api", taskApp);

app.get("https://task-master-l39serbac-azubike-onyinyes-projects.vercel.app/", (req, res) => {
  res.send("Hello from Node API Server updated");
});

// Search for tasks
app.get("https://task-master-l39serbac-azubike-onyinyes-projects.vercel.app/api/tasks/search", authenticate, async (req, res) => {
  const userId = req.user.id; // Extract user ID from the authenticated token
  const keyword = req.query.keyword; // Extract the keyword from query parameters

  if (!keyword) {
    return res.status(400).json({ message: "Keyword is required for search." });
  }

  try {
    // Perform a case-insensitive search in title and description
    const tasks = await Task.find({
      userId,
      $or: [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ],
    });

    res.status(200).json({ tasks });
  } catch (error) {
    console.error("Error searching tasks:", error);
    res.status(500).json({ message: "Failed to search tasks." });
  }
});

// Filter tasks by priority and date
app.get("https://task-master-l39serbac-azubike-onyinyes-projects.vercel.app/api/tasks/filter", authenticate, async (req, res) => {
  try {
    const { userId } = req; // Assuming userId is set by authentication middleware
    const { priority, date } = req.query;

    const filter = { userId }; // Base filter by user ID

    if (req.user && req.user.id) {
      filter.userId = req.user.id;
    } else {
      console.error("Error: userId is undefined.");
      return res.status(400).json({ message: "User not authenticated." });
    }

    // Add priority filter if provided
    if (priority) {
      filter.priority = new RegExp(`^${priority}$`, "i"); // Case-insensitive regex
    }

    // Add date filter if provided
    if (date) {
      const dateObj = new Date(date);
      if (!isNaN(dateObj)) {
        // Match tasks with the specified date
        filter.date = {
          $gte: new Date(dateObj.setHours(0, 0, 0, 0)), // Start of the day
          $lte: new Date(dateObj.setHours(23, 59, 59, 999)), // End of the day
        };
      } else {
        return res.status(400).json({ message: "Invalid date format." });
      }
    }

    console.log("Filter Query:", filter);
    console.log("User Info:", req.user);

    // Fetch tasks from database
    const tasks = await Task.find(filter);

    console.log("Matched Tasks:", tasks);

    if (!tasks || tasks.length === 0) {
      return res
        .status(404)
        .json({ message: "No tasks found matching the filter." });
    }

    res.json(tasks); // Return filtered tasks
  } catch (error) {
    console.error("Error filtering tasks:", error);
    res.status(500).json({ message: "Error filtering tasks." });
  }
});

// Generic task ID route defined later
app.get("https://task-master-l39serbac-azubike-onyinyes-projects.vercel.app/api/tasks/:id", authenticate, async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;

  try {
    const task = await Task.findOne({ _id: taskId, userId });
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }
    res.status(200).json({ task });
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ message: "Failed to fetch task." });
  }
});

// user Routes

// Registration Route
app.post("https://task-master-l39serbac-azubike-onyinyes-projects.vercel.app/api/signup", async (req, res) => {
  const { name, phone, dob, password, cpwd } = req.body;

  // Validate input
  if (!name || !phone || !dob || !password || !cpwd) {
    return res.status(500).json({ message: "All fields are required." });
  }
  if (password !== cpwd) {
    return res.status(500).json({ message: "Passwords do not match." });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res
        .status(500)
        .json({ message: "Phone number already registered." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save new user
    const newUser = new User({ name, phone, dob, password: hashedPassword });
    await newUser.save();

    res.status(200).json({ message: "Registration successful." });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
});

// Login Route
app.post("https://task-master-l39serbac-azubike-onyinyes-projects.vercel.app/api/login", async (req, res) => {
  const { phone, password } = req.body;

  // Validate input
  if (!phone || !password) {
    return res.status(500).json({ message: "All fields are required." });
  }

  try {
    // Find user
    const user = await User.findOne({ phone });
    if (!user) {
      return res
        .status(500)
        .json({ message: "Invalid phone number or password." });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(500)
        .json({ message: "Invalid phone number or password." });
    }

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({ message: "Login successful.", token });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
});

mongoose
  .connect(
    "mongodb+srv://oazubike5:ygfJtnKaglR7R2W2@tmbackend.iayk4.mongodb.net/?retryWrites=true&w=majority&appName=TMbackend"
  )
  .then(() => {
    console.log("Connected to database!");
    app.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
  })
  .catch(() => {
    console.log("Connection failed!");
  });
