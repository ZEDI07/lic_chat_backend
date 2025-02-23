import { STATUS_CODE } from "../../config/constant.js";
import permissions from "../../config/permission.js";
import { handlePermissionUpdate } from "../../helpers/role.js";
import * as services from "../../models/role.js";
import * as validation from "../../validation/admin.js";

export const role = async (req, res, next) => {
  try {
    res.render("role", {});
  } catch (error) {
    res.render("role", {});
  }
};

export const roleAdd = (req, res, next) => {
  res.render("roleAdd");
};

export const roleAddPost = async (req, res, next) => {
  try {
    const { error } = validation.roleAdd(req.body);
    if (error) {
      console.log("error >>", error);
      return res.redirect("/role");
    }
    req.body.permissions = permissions.map((ele) => ({ key: ele.key }));
    const response = await services.addRole(req.body);
    return res.redirect("/role");
  } catch (error) {
    console.log("Error ::>", error);
    return res.redirect("/role");
  }
};

export const getRoles = async (req, res, next) => {
  try {
    const { error } = validation.getRoles(req.query);
    if (error) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error });
    }
    const response = await services.roles(req.query);
    if (response.success) return res.status(STATUS_CODE.success).json(response);
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("error", error);
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: "unknown error." });
  }
};

export const roleEdit = async (req, res, next) => {
  try {
    if (req.query.id) {
      const response = await services.getRole({
        _id: req.query.id,
        status: true,
      });
      if (response.success) {
        return res.render("editRole", { response });
      }
    }
    return res.redirect("/role");
  } catch (error) {
    console.log("error >", error);
    return res.redirect("/role");
  }
};

export const roleEditPost = async (req, res, next) => {
  try {
    const { error } = validation.roleEditPost(req.body);
    if (error)
      return res
        .status(STATUS_CODE.success)
        .json({ success: false, message: error.message });
    const response = await services.updateRoleData(
      { _id: req.body.id },
      req.body
    );
    if (response.success)
      return res
        .status(STATUS_CODE.success)
        .json({ success: true, message: "Role updated Successfully." });
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    next(error);
  }
};

export const roleProfile = async (req, res, next) => {
  try {
    if (req.query.id) {
      const response = await services.getRole({
        _id: req.query.id,
        status: true,
      });
      if (response.success) {
        return res.render("roleProfile", {
          response,
          permissions: permissions.map((ele) => ({
            key: ele.key,
            name: ele.name,
            description: ele.description,
          })),
        });
      }
    }
    return res.redirect("/role");
  } catch (error) {
    console.log("error while roleProfile", error);
    res.redirect("/role");
  }
};

export const updateRoleStatus = async (req, res, next) => {
  try {
    const { error } = validation.updateRoleData(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error });
    const response = await services.updateRoleData(
      { _id: req.body.id },
      { status: req.body.status }
    );
    if (response.success)
      return res
        .status(STATUS_CODE.success)
        .json({ success: true, message: "Successfully updated." });
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("error while updating role", error);
    return res
      .status(STATUS_CODE.server_error)
      .json({ success: false, message: error });
  }
};

export const updateRolePermission = async (req, res, next) => {
  try {
    const { error } = validation.changeRolePermission(req.body);
    if (error)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error });
    const response = await services.updateRolePermission(req.body);
    if (response.success) {
      handlePermissionUpdate(response.data)
      return res.status(STATUS_CODE.success).json({ success: true, message: 'Permission updated' });
    }
    return res.status(STATUS_CODE.bad_request).json(response);
  } catch (error) {
    console.log("Error while changing role >>", error);
  }
};

export const validateRole = async (req, res, next) => {
  try {
    if (!req.query.roleId)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Required role ID." });
    const response = await services.getRole({ roleId: req.query.roleId });
    if (response.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: "Role Id Already exists." });
    }
    return res
      .status(STATUS_CODE.success)
      .json({ success: true, message: "Role ID is valid." });
  } catch (error) {
    return res
      .status(STATUS_CODE.bad_request)
      .json({ success: false, message: "Unknown Error." });
  }
};
