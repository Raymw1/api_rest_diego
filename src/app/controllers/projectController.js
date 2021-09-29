const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth");
const Project = require("../models/project");
const Task = require("../models/task");

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const projects = await Project.find().populate(["user", "tasks"]);
    return res.send({ projects });
  } catch (error) {
    console.error(error);
    return res.status(400).send({ error: "Error loading projects!" });
  }
});

router.get("/:projectId", async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).populate([
      "user",
      "tasks",
    ]);
    if (!project) return res.status(400).send({ error: "Project not found!" });
    return res.send({ project });
  } catch (error) {
    console.error(error);
    return res.status(400).send({ error: "Error loading project!" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, description, tasks } = req.body;
    const project = await Project.create({
      title,
      description,
      user: req.userId,
    });

    const taskPromise = tasks.map(async (task) => {
      const projectTask = new Task({ ...task, project: project.id });
      await projectTask.save();
      project.tasks.push(projectTask);
    });
    await Promise.all(taskPromise);

    await project.save();

    return res.send({ project });
  } catch (error) {
    console.error(error);
    return res.status(400).send({ error: "Error creating new project!" });
  }
});

router.put("/:projectId", async (req, res) => {
  try {
    const { title, description, tasks } = req.body;
    const project = await Project.findByIdAndUpdate(
      req.params.projectId,
      {
        title,
        description,
      },
      { new: true }
    );

    project.tasks = [];
    await Task.remove({ project: project.id });

    const taskPromise = tasks.map(async (task) => {
      const projectTask = new Task({ ...task, project: project.id });
      await projectTask.save();
      project.tasks.push(projectTask);
    });
    await Promise.all(taskPromise);

    await project.save();

    return res.send({ project });
  } catch (error) {
    console.error(error);
    return res.status(400).send({ error: "Error updating project!" });
  }
});

router.delete("/:projectId", async (req, res) => {
  try {
    await Task.remove({ project: req.params.projectId });
    await Project.findByIdAndRemove(req.params.projectId);
    return res.send();
  } catch (error) {
    console.error(error);
    return res.status(400).send({ error: "Error deleting project!" });
  }
});

module.exports = (app) => app.use("/projects", router);
