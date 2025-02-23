import { mediaFilePipeline } from "./pipe/message.js";
import { userProject } from "./pipe/user.js";
import storySeenSchema from "./schema/storiesSeen.js";
import storiesSchema from "./schema/story.js";

export const createStory = async (data) => {
  try {
    const response = await storiesSchema.create(data);
    if (!response) {
      return { success: false, message: "Failed to upload story" };
    }
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const storySeenAdd = async ({ story, user }) => {
  try {
    const update = [];
    update.push({
      updateOne: {
        filter: {
          story: story,
          user: user,
        },
        update: {},
        upsert: true,
      },
    });
    const response = await storySeenSchema.bulkWrite(update);
    if (!response) {
      return { success: false, message: "Unable to see story" };
    }
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getFriendsStories = async (user, exceptFriends = false) => {
  const exceptMatch = exceptFriends
    ? [
      {
        $addFields: {
          except: {
            $cond: {
              if: {
                $and: ["$except", { $in: ["$friend", "$except"] }],
              },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $match: {
          except: { $eq: false },
        },
      },
    ]
    : [];

  try {
    const query = [
      {
        $match: {
          $or: [{ sourceId: { $eq: user } }, { targetId: { $eq: user } }],
        },
      },
      {
        $addFields: {
          friend: {
            $cond: {
              if: { $eq: [user, "$sourceId"] },
              then: "$targetId",
              else: "$sourceId",
            },
          },
        },
      },
      ...exceptMatch,
      {
        $lookup: {
          from: "users",
          localField: "friend",
          foreignField: "_id",
          pipeline: [{ $project: userProject(false) }],
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "stories",
          localField: "friend",
          foreignField: "user",
          pipeline: [
            { $match: { deleted: false } },
            ...mediaFilePipeline,
            {
              $lookup: {
                from: "story_seens",
                foreignField: "story",
                localField: "_id",
                pipeline: [
                  {
                    $match: {
                      user: user,
                    },
                  },
                ],
                as: "story_seen",
              },
            },
            {
              $addFields: {
                seen: {
                  $cond: {
                    if: { $eq: ["$story_seen", []] },
                    then: false,
                    else: true,
                  },
                },
              },
            },
            {
              $project: {
                story_seen: 0,
              },
            },
          ],
          as: "stories",
        },
      },
      {
        $match: {
          stories: { $ne: [] },
        },
      },
      {
        $project: {
          user: 1,
          stories: 1,
        },
      },
    ];
    const response = []// await friendModel.aggregate(query);
    if (!response) {
      return { success: false, message: "Unable to find any Stories" };
    }
    return { success: true, data: response };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const getMyStories = async (user) => {
  console.log(user, "user");
  try {
    const query = [
      {
        $match: {
          user: user,
        },
      },
      ...mediaFilePipeline,
      {
        $lookup: {
          from: "story_seens",
          foreignField: "story",
          localField: "_id",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                pipeline: [
                  {
                    $project: userProject(false),
                  },
                ],
                as: "storySeenBy",
              },
            },
          ],
          as: "seenBy",
        },
      },
      {
        $addFields: {
          stroySeenBy: "$seenBy.storySeenBy",
        },
      },
      {
        $project: {
          seenBy: 0,
        },
      },
    ];

    const response = await storiesSchema.aggregate(query);
    if (!response) {
      return { success: false, message: "Unable to find any Stories" };
    }
    return { success: true, data: response };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const updateStory = async (filter, update, options) => {
  try {
    const response = await storiesSchema.findOneAndUpdate(
      filter,
      update,
      options
    );
    if (!response) {
      console.log(response);
      return { success: false, message: "Unable to update" };
    }
    return { success: true, data: response };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const findStories = async (filter) => {
  try {
    const response = await storiesSchema.find(filter);
    if (!response) {
      console.log(response);
      return { success: false, message: "Unable to get stories" };
    }
    return { success: true, data: response };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const updateStories = async (filter, update) => {
  try {
    const response = await storiesSchema.updateMany(filter, update);
    if (!response) {
      return { success: false, message: "update many stories" };
    }
    return { success: true, data: response };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
