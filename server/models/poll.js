import mongoose from "mongoose";
import { pollPipeline } from "./pipe/message.js";
import pollSchema from "./schema/poll.js";
import pollVotes from "./schema/poll_votes.js";

export const addPoll = async (poll) => {
  try {
    const pollData = await pollSchema.create(poll);
    if (pollData) {
      return { success: true, data: pollData };
    }
    return { success: false, message: "Unable to add poll" };
  } catch (error) {
    return { success: true, message: error.message };
  }
};

export const updateVote = async (filter, update, option) => {
  try {
    const response = await pollVotes.findOneAndUpdate(filter, update, option);

    if (response) {
      return { success: true, data: response };
    }
    return { success: true, message: "Unable to update Message" };
  } catch (error) {
    return { success: true, message: error.message };
  }
};

export const updateManyVote = async (filter, update) => {
  try {
    const response = await pollVotes.updateMany(filter, update);
    if (response) {
      return { success: true, data: response };
    }
    return { success: true, message: "Unable to update Message" };
  } catch (error) {
    console.log(error);
    return { success: true, message: error.message };
  }
};

export const findPoll = async (filter) => {
  try {
    const response = await pollSchema.findOne(filter);
    if (!response) {
      return { success: false, message: "not able to find poll" };
    }
    return { success: true, data: response };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const pollDetails = async (poll) => {
  poll = new mongoose.Types.ObjectId(poll);

  try {
    const aggregation = [
      { $match: { _id: poll } },
      { $addFields: { poll: "$_id" } },
      ...pollPipeline,
    ];
    const response = await pollSchema.aggregate(aggregation);
    if (response[0]) {
      return { success: true, data: response[0].poll };
    }
    return { success: false, message: "No details of poll" };
  } catch (error) {
    console.log(error);
    return { success: false, message: error.message };
  }
};
