const userRepo = require("../repositories/user.repo");

export async function GetPackages() {
    const packages = await userRepo.GetPackages();
    return packages;
}