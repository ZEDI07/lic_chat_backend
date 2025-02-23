import { ONLINE_PRIVACY, PRIVACY_STATUS, STATUS_CODE } from "../../config/constant.js";
import * as chatService from "../../models/chat.js";
import { activeFriends, friendList, updateFriend } from "../../models/friend.js";
import * as validation from "../../validation/friend.js";

// export const blockUserDialog = async (req, res, next) => {
//   try {
//     const t = req.t;
//     return res.status(STATUS_CODE.success).json({
//       dialog: {
//         title: t("Block Messages"),
//         description: t("Are you sure want to Block Messages ?"),
//         buttons: [
//           { key: "cancel", label: t("Cancel") },
//           {
//             key: "submit",
//             label: t("Block"),
//             apiUrl: `/message/block`,
//             apiMethod: "POST",
//             apiParams: {
//               user: req.params.user,
//             },
//           },
//         ],
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

export const blockUser = async (req, res, next) => {
  try {
    if (!req.body.user) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "Required user Id" });
    }
    // const user = req.user._id;
    // const friend = req.body.user;
    // const response = await updateFriend(
    //   {
    //     $or: [
    //       { sourceId: user, targetId: friend },
    //       { sourceId: friend, targetId: user },
    //     ],
    //     status: FRIENDSHIP_STATUS.accepted,
    //     messageblock: { $nin: friend },
    //   },
    //   { $addToSet: { messageblock: friend } }
    // );
    await chatService.blockChat({ user: req.user, chat: req.body.user, status: true })
    return res
      .status(STATUS_CODE.success)
      .json({ message: "user blocked successfully" });
  } catch (error) {
    next(error);
  }
};

// export const unblockUserDialog = async (req, res, next) => {
//   try {
//     const t = req.t;
//     return res.status(STATUS_CODE.success).json({
//       dialog: {
//         title: t("Unblock Messages"),
//         description: t("Are you sure want to Unblock Messages ?"),
//         buttons: [
//           { key: "cancel", label: t("Cancel") },
//           {
//             key: "submit",
//             label: t("Unblock"),
//             apiUrl: `/message/unblock`,
//             apiMethod: "POST",
//             apiParams: {
//               user: req.params.user,
//             },
//           },
//         ],
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

export const unblockUser = async (req, res, next) => {
  try {
    if (!req.body.user) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ message: "Required user Id" });
    }
    await chatService.blockChat({ user: req.user, chat: req.body.user, status: false })
    return res
      .status(STATUS_CODE.success)
      .json({ success: true, message: "Unblocked" });

  } catch (error) {
    next(error);
  }
};

export const active = async (req, res, next) => {
  try {
    const user = req.user._id;
    const page = +req.query.page - 1 || 0;
    const limit = +req.query.limit || 10;
    const userPrivacy = req.user.privacy;
    if (userPrivacy.online == ONLINE_PRIVACY.sameAs && userPrivacy.lastSeen == PRIVACY_STATUS.nobody)
      return res.status(STATUS_CODE.success).json({ data: [], count: 0 })

    const response = await activeFriends({ user, skip: page * limit, limit });
    if (!response.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: response.message });
    return res
      .status(STATUS_CODE.success)
      .json({ data: response.data, count: response.count });
  } catch (error) {
    next(error);
  }
};

// export const friends = async (req, res, next) => {
//   try {
//     const response = await friendList({ user: req.user._id }, true);
//     if (response.success)
//       res.status(STATUS_CODE.success).json({ data: response });
//     else
//       res
//         .status(STATUS_CODE.bad_request)
//         .json({ message: "somthing went wrong" });
//   } catch (error) {
//     next(error);
//   }
// };

// export const getAllFriends = async (req, res, next) => {
//   try {
//     const user = req.user._id;
//     const page = +req.query.page - 1 || 0;
//     const limit = +req.query.limit || 10;
//     const response = await activeFriends({ user, skip: page * limit, limit });
//     if (!response.success)
//       return res
//         .status(STATUS_CODE.bad_request)
//         .json({ messae: response.message });
//     return res
//       .status(STATUS_CODE.success)
//       .json({ data: response.data, count: response.count });
//   } catch (error) {
//     next(error);
//   }
// };

export const getAllUnblockedFriends = async (req, res, next) => {
  try {
    let t = req.t;
    let allfriends = await friendList({ user: req.user._id });
    if (!allfriends.success)
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: true, message: allfriends.message });

    return res.status(STATUS_CODE.success).json({ data: allfriends.data });
  } catch (error) {
    next(error);
  }
};

export const getExceptList = async (req, res, next) => {
  const user = req.user._id;
  const t = req.t;
  try {
    const response = await friendList({ user });
    if (!response.success) {
      return res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: response.message });
    }

    return res.status(STATUS_CODE.success).json({ data: response.data });
  } catch (error) {
    next(error);
  }
};

export const addInExcept = async (req, res, next) => {
  const user = req.user._id;
  const { friends } = req.body;
  try {
    const { error } = validation.friendsIdValidate({ friends });
    if (error) {
      res
        .status(STATUS_CODE.bad_request)
        .json({ success: false, message: error.message });
    }
    friends.forEach(async (friend) => {
      await updateFriend(
        {
          $or: [
            { sourceId: user, targetId: friend },
            { sourceId: friend, targetId: user },
          ],
          except: { $nin: friend },
        },
        { $addToSet: { except: friend } }
      );
    });
    return res
      .status(STATUS_CODE.success)
      .json({ success: true, message: "Successfully added" });
  } catch (error) {
    next(error);
  }
};
