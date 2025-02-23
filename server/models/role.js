import roleModel from "./schema/role.js";

export const addRole = async (data) => {
  try {
    const role = await roleModel.create(data);
    return { success: true, data: role };
  } catch (error) {
    console.log("error", error);
    return { success: false, message: error.message };
  }
};

export const roles = async ({ page, limit, key, value }) => {
  try {
    if (!page && !limit && !key && !value)
      return { success: true, data: await roleModel.find() };
    const query = { status: true };
    if (key && value) {
      query[key] = { $regex: value, $options: "i" };
    }
    const pageno = page || 0;
    const pageSize = limit || 10;
    const skip = pageno * pageSize;
    const role = await roleModel.find(query).skip(skip).limit(pageSize);
    const count = await roleModel.countDocuments(query);
    return {
      success: true,
      data: { role, count },
    };
  } catch (error) {
    return { success: false, message: "unable to get roles." };
  }
};

export const getRole = async (query) => {
  try {
    const role = await roleModel.findOne(query);
    if (role) return { success: true, data: role };
    return { success: false, message: "role not found" };
  } catch (error) {
    console.log("error", error);
    return { success: false, message: error };
  }
};

export const updateRoleData = async (query, update) => {
  try {
    const data = await roleModel.findOneAndUpdate(query, update, { new: true });
    if (data) return { success: true, data: data };
    return { success: false, message: "Role not found." };
  } catch (error) {
    console.log("error >>", error);
    return {
      success: false,
      message: error.message,
    };
  }
};

export const updateRolePermission = async (data) => {
  try {
    const query = { _id: data.id };
    let update;
    if (data.status == "true") {
      update = { $push: { permissions: { key: data.permissionKey } } };
    } else if (data.status == "false") {
      update = { $pull: { permissions: { key: data.permissionKey } } };
    }
    const updateData = await roleModel.findOneAndUpdate(query, update, {
      new: true,
    });
    if (updateData) {
      return { success: true, data: updateData };
    }
    return { success: false, message: "unable to update permisssion" };
  } catch (error) {
    console.log("ERROR :", error);
    return {
      success: false,
      message: "error while updating role permission",
    };
  }
};
