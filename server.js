
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "Student Placement Management System API is running!",
  });
});

// Health check
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "OK", database: "Connected" });
  } catch (error) {
    console.error("Database health check failed:", error.message);
    res.status(500).json({ status: "ERROR", database: "Disconnected" });
  }
});

// Get all jobs from MySQL
app.get("/api/jobs", async (req, res) => {
  try {
    const [jobs] = await pool.query(
      "SELECT id, company_name, job_title, location, description, created_at FROM jobs ORDER BY id DESC"
    );

    res.json(jobs);
  } catch (error) {
    console.error("Unable to fetch jobs:", error.message);
    res.status(500).json({ error: "Unable to fetch jobs from database." });
  }
});

// Add a job to MySQL
app.post("/api/jobs", async (req, res) => {
  try {
    const { company_name, job_title, location, description } = req.body;

    if (!company_name || !job_title) {
      return res.status(400).json({
        error: "Company name and job title are required.",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO jobs (company_name, job_title, location, description)
       VALUES (?, ?, ?, ?)`,
      [
        company_name,
        job_title,
        location || null,
        description || null,
      ]
    );

    res.status(201).json({
      message: "Job added successfully.",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Unable to add job:", error.message);
    res.status(500).json({ error: "Unable to add job." });
  }
});

// Get all students
app.get("/api/students", async (req, res) => {
  try {
    const [students] = await pool.query(
      "SELECT * FROM students ORDER BY id DESC"
    );
    res.json(students);
  } catch (error) {
    console.error("Unable to fetch students:", error.message);
    res.status(500).json({ error: "Unable to fetch students." });
  }
});

// Add a student
app.post("/api/students", async (req, res) => {
  try {
    const { name, email, department, graduation_year } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        error: "Student name and email are required.",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO students (name, email, department, graduation_year)
       VALUES (?, ?, ?, ?)`,
      [name, email, department || null, graduation_year || null]
    );

    res.status(201).json({
      message: "Student added successfully.",
      id: result.insertId,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "A student with this email already exists.",
      });
    }

    console.error("Unable to add student:", error.message);
    res.status(500).json({ error: "Unable to add student." });
  }
});

// Get applications
app.get("/api/applications", async (req, res) => {
  try {
    const [applications] = await pool.query(`
      SELECT
        a.id,
        a.student_id,
        a.job_id,
        a.status,
        a.applied_at,
        s.name AS student_name,
        s.email AS student_email,
        j.company_name,
        j.job_title,
        j.location
      FROM applications a
      JOIN students s ON a.student_id = s.id
      JOIN jobs j ON a.job_id = j.id
      ORDER BY a.id DESC
    `);

    res.json(applications);
  } catch (error) {
    console.error("Unable to fetch applications:", error.message);
    res.status(500).json({ error: "Unable to fetch applications." });
  }
});

// Submit a job application
app.post("/api/applications", async (req, res) => {
  try {
    const { student_id, job_id } = req.body;

    if (!student_id || !job_id) {
      return res.status(400).json({
        error: "Student ID and job ID are required.",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO applications (student_id, job_id)
       VALUES (?, ?)`,
      [student_id, job_id]
    );

    res.status(201).json({
      message: "Application submitted successfully.",
      id: result.insertId,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "You have already applied for this job.",
      });
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        error: "The student or job ID does not exist.",
      });
    }

    console.error("Unable to submit application:", error.message);
    res.status(500).json({ error: "Unable to submit application." });
  }
});

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "API route not found." });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
