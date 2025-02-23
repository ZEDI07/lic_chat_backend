import { v4 as uuidv4 } from "uuid";
import apicredentialsModel from "./schema/apiCredentials.js";

export const newCredentials = async (data) => {
  try {
    data.clientSecret = uuidv4();
    const newClient = await apicredentialsModel.create(data);
    if (newClient) return { success: true, data: newClient };
    return { success: false, message: "Unable to add client" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const allCredentials = async () => {
  try {
    const data = await apicredentialsModel.find({ status: true });
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.messsage };
  }
};

export const updateCredential = async (query, update) => {
  try {
    const data = await apicredentialsModel.findOneAndUpdate(query, update, {
      new: true,
    });
    if (data) return { success: true, data };
    return { success: false, message: "Error while updating credentials" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const enableCredential = async (id) => {
  try {
    const data = await apicredentialsModel.findOne({ _id: id, status: true });
    if (!data) return { success: false, message: "Credentials not found" };
    data.enabled = data.enabled === true ? false : true;
    await data.save();
    return { success: true, data };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const getCredential = async (query) => {
  try {
    const data = await apicredentialsModel.findOne(query);
    if (data) return { success: true, data };
    return { success: false, message: "Data not found" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
