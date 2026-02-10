const taskService = require("../services/taskService");

exports.getTasks = async (req, res, next) => {
  try {
    const tasks = await taskService.getTasks();
    res.status(200).json({ data: tasks });
  } catch (err) {
    next(err);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const created = await taskService.createTask(req.body);
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
};

exports.getTaskById = async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.id);

    if (!task) {
      return res.status(404).json({
        error: { message: "Task not found", code: "TASK_NOT_FOUND" },
      });
    }

    res.status(200).json({ data: task });
  } catch (err) {
    next(err);
  }
};

exports.updateTaskStatus = async (req, res, next) => {
  try {
    const updated = await taskService.updateTaskStatus(req.params.id, req.body);

    if (!updated) {
      return res.status(404).json({
        error: { message: "Task not found", code: "TASK_NOT_FOUND" },
      });
    }

    res.status(200).json({ data: updated });
  } catch (err) {
    next(err);
  }
};