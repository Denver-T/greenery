const userRepo = require("../repositories/user.repo");

const GetPackages = async () => {
    const packages = await userRepo.GetPackages();
    return packages;
}

module.exports = {
    GetPackages
}