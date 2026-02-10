const userService = require("../services/userService");

exports.getUsers = async (req, res, next) => {
  try {
    const users = await userService.getUsers();
    res.status(200).json({ data: users });
  } catch (err) {
    next(err);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: { message: "User not found", code: "USER_NOT_FOUND" },
      });
    }

    res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
};